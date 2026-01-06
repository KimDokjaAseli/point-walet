package auth

import (
	"github.com/gofiber/fiber/v2"

	"walletpoint-backend/internal/shared/utils"
)

// Handler handles auth HTTP requests
type Handler struct {
	service *Service
}

// NewHandler creates a new auth handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Login handles user login
// POST /api/v1/auth/login
func (h *Handler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	// Validate
	if req.Email == "" {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "email", "message": "Email is required"},
		})
	}
	if req.Password == "" {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "password", "message": "Password is required"},
		})
	}
	if req.Role == "" {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "role", "message": "Role is required"},
		})
	}

	result, err := h.service.Login(c.Context(), req)
	if err != nil {
		switch err {
		case ErrInvalidCredentials:
			return utils.ErrorResponse(c, fiber.StatusUnauthorized, "INVALID_CREDENTIALS", "Email atau password salah", nil)
		case ErrInvalidRole:
			return utils.BadRequest(c, "Role tidak valid")
		case ErrUserInactive:
			return utils.ErrorResponse(c, fiber.StatusForbidden, "USER_INACTIVE", "Akun tidak aktif", nil)
		default:
			return utils.InternalServerError(c, err.Error())
		}
	}

	return utils.SuccessResponse(c, "Login successful", result)
}

// Register handles user registration
// POST /api/v1/auth/register
func (h *Handler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	// Validate
	if req.Email == "" {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "email", "message": "Email is required"},
		})
	}
	if req.Password == "" || len(req.Password) < 6 {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "password", "message": "Password must be at least 6 characters"},
		})
	}
	if req.Password != req.PasswordConfirmation {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "password_confirmation", "message": "Password confirmation does not match"},
		})
	}
	if req.Name == "" {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "name", "message": "Name is required"},
		})
	}
	if req.Role == "" {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "role", "message": "Role is required"},
		})
	}
	if req.NimNip == "" {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "nim_nip", "message": "NIM/NIP is required"},
		})
	}

	result, err := h.service.Register(c.Context(), req)
	if err != nil {
		switch err {
		case ErrEmailExists:
			return utils.Conflict(c, "Email sudah terdaftar")
		case ErrInvalidRole:
			return utils.BadRequest(c, "Role tidak valid")
		default:
			return utils.InternalServerError(c, err.Error())
		}
	}

	return utils.CreatedResponse(c, "Registration successful", fiber.Map{
		"user": result,
	})
}

// Refresh handles token refresh
// POST /api/v1/auth/refresh
func (h *Handler) Refresh(c *fiber.Ctx) error {
	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.RefreshToken == "" {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "refresh_token", "message": "Refresh token is required"},
		})
	}

	result, err := h.service.RefreshToken(c.Context(), req.RefreshToken)
	if err != nil {
		if err == ErrInvalidToken {
			return utils.Unauthorized(c, "Invalid or expired refresh token")
		}
		return utils.InternalServerError(c, err.Error())
	}

	return utils.SuccessResponse(c, "Token refreshed", result)
}

// Logout handles user logout
// POST /api/v1/auth/logout
func (h *Handler) Logout(c *fiber.Ctx) error {
	var req LogoutRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.RefreshToken == "" {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "refresh_token", "message": "Refresh token is required"},
		})
	}

	if err := h.service.Logout(c.Context(), req.RefreshToken); err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	return utils.SuccessResponse(c, "Logout successful", nil)
}

// Me gets current user info
// GET /api/v1/auth/me
func (h *Handler) Me(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	user, err := h.service.GetUserByID(c.Context(), userID)
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}
	if user == nil {
		return utils.NotFound(c, "User not found")
	}

	return utils.SuccessResponse(c, "User info retrieved", fiber.Map{
		"user": UserDTO{
			ID:     user.ID,
			Email:  user.Email,
			Name:   user.Name,
			Role:   user.Role,
			NimNip: utils.Deref(user.NimNip, ""),
			Status: user.Status,
		},
	})
}
