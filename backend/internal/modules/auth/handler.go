package auth

import (
	apperrors "walletpoint/internal/shared/errors"
	"walletpoint/internal/shared/response"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Login handles user login
func (h *Handler) Login(role string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req LoginRequest
		if err := c.BodyParser(&req); err != nil {
			return response.BadRequest(c, "Invalid request body")
		}

		// Validate request
		if errors := req.Validate(); len(errors) > 0 {
			return response.ErrorWithDetails(c, fiber.StatusBadRequest, "Validation failed", "VALIDATION_ERROR", toResponseErrors(errors))
		}

		// Get client info
		ipAddress := c.IP()
		userAgent := c.Get("User-Agent")

		// Login
		result, err := h.service.Login(c.Context(), req, role, ipAddress, userAgent)
		if err != nil {
			return handleError(c, err)
		}

		return response.Success(c, "Login successful", result)
	}
}

// RefreshToken handles token refresh
func (h *Handler) RefreshToken(c *fiber.Ctx) error {
	var req RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if req.RefreshToken == "" {
		return response.BadRequest(c, "Refresh token is required")
	}

	result, err := h.service.RefreshToken(c.Context(), req.RefreshToken)
	if err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Token refreshed successfully", result)
}

// Logout handles user logout
func (h *Handler) Logout(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	if err := h.service.Logout(c.Context(), userID); err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Logged out successfully", nil)
}

// GetProfile returns current user profile
func (h *Handler) GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	profile, err := h.service.GetProfile(c.Context(), userID)
	if err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Profile retrieved successfully", profile)
}

// ChangePassword handles password change
func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	// Validate request
	if errors := req.Validate(); len(errors) > 0 {
		return response.ErrorWithDetails(c, fiber.StatusBadRequest, "Validation failed", "VALIDATION_ERROR", toResponseErrors(errors))
	}

	if err := h.service.ChangePassword(c.Context(), userID, req); err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Password changed successfully", nil)
}

// Register handles user registration (admin only)
func (h *Handler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	// Validate request
	if errors := req.Validate(); len(errors) > 0 {
		return response.ErrorWithDetails(c, fiber.StatusBadRequest, "Validation failed", "VALIDATION_ERROR", toResponseErrors(errors))
	}

	result, err := h.service.Register(c.Context(), req)
	if err != nil {
		return handleError(c, err)
	}

	return response.Created(c, "User registered successfully", result)
}

func handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*apperrors.AppError); ok {
		switch appErr.Code {
		case "INVALID_CREDENTIALS", "INVALID_TOKEN", "SESSION_NOT_FOUND":
			return response.Unauthorized(c, appErr.Message)
		case "NOT_FOUND", "USER_NOT_FOUND":
			return response.NotFound(c, appErr.Message)
		case "USERNAME_EXISTS", "ACCOUNT_INACTIVE":
			return response.Conflict(c, appErr.Message)
		case "INVALID_PASSWORD", "VALIDATION_ERROR", "INVALID_ROLE":
			return response.BadRequest(c, appErr.Message)
		default:
			return response.InternalError(c, appErr.Message)
		}
	}
	return response.InternalError(c, "Internal server error")
}

func toResponseErrors(errors []ValidationError) []response.ValidationError {
	result := make([]response.ValidationError, len(errors))
	for i, e := range errors {
		result[i] = response.ValidationError{
			Field:   e.Field,
			Message: e.Message,
		}
	}
	return result
}
