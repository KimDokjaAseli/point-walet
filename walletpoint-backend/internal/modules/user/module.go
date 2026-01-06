package user

import (
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/middleware"
	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Module represents the user module
type Module struct {
	db *gorm.DB
}

// NewModule creates a new user module
func NewModule(db *gorm.DB, cfg *config.Config) *Module {
	return &Module{db: db}
}

// RegisterRoutes registers user routes
func (m *Module) RegisterRoutes(router fiber.Router, authMiddleware *middleware.AuthMiddleware) {
	users := router.Group("/users")
	users.Use(authMiddleware.Protected())
	users.Use(authMiddleware.RequireAdmin())

	users.Get("/", m.GetAllUsers)
	users.Get("/:id", m.GetUserByID)
	users.Put("/:id", m.UpdateUser)
	users.Put("/:id/status", m.UpdateUserStatus)
	users.Post("/:id/reset-password", m.ResetPassword)
	users.Delete("/:id", m.DeleteUser)
}

// GetAllUsers gets all users
func (m *Module) GetAllUsers(c *fiber.Ctx) error {
	var users []models.User

	role := c.Query("role", "")
	status := c.Query("status", "")

	query := m.db.Model(&models.User{}).Where("status != 'deleted'")
	if role != "" {
		query = query.Where("role = ?", role)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Preload("Wallet").Order("created_at DESC").Find(&users)

	dtos := make([]fiber.Map, len(users))
	for i, u := range users {
		balance := float64(0)
		if u.Wallet != nil {
			balance = u.Wallet.Balance
		}
		dtos[i] = fiber.Map{
			"id":             u.ID,
			"email":          u.Email,
			"name":           u.Name,
			"role":           u.Role,
			"nim_nip":        u.NimNip,
			"status":         u.Status,
			"wallet_balance": balance,
			"created_at":     u.CreatedAt,
		}
	}

	return utils.SuccessResponse(c, "Users retrieved", fiber.Map{
		"users": dtos,
	})
}

// GetUserByID gets user by ID
func (m *Module) GetUserByID(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	if err := m.db.Preload("Wallet").First(&user, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "User not found")
	}

	return utils.SuccessResponse(c, "User retrieved", fiber.Map{
		"user": user,
	})
}

// UpdateUser updates user data
func (m *Module) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var req struct {
		Name   string  `json:"name"`
		NimNip *string `json:"nim_nip"`
		Role   string  `json:"role"`
		Status string  `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request")
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.NimNip != nil {
		updates["nim_nip"] = req.NimNip
	}
	if req.Role != "" && (req.Role == "admin" || req.Role == "dosen" || req.Role == "mahasiswa") {
		updates["role"] = req.Role
	}
	if req.Status != "" && (req.Status == "active" || req.Status == "inactive" || req.Status == "suspended") {
		updates["status"] = req.Status
	}

	if len(updates) == 0 {
		return utils.BadRequest(c, "No fields to update")
	}

	if err := m.db.Model(&models.User{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	return utils.SuccessResponse(c, "User updated", nil)
}

// UpdateUserStatus updates user status
func (m *Module) UpdateUserStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request")
	}

	if req.Status != "active" && req.Status != "inactive" && req.Status != "suspended" {
		return utils.BadRequest(c, "Invalid status")
	}

	if err := m.db.Model(&models.User{}).Where("id = ?", id).Update("status", req.Status).Error; err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	return utils.SuccessResponse(c, "User status updated", nil)
}

// ResetPassword resets user password
func (m *Module) ResetPassword(c *fiber.Ctx) error {
	id := c.Params("id")

	var req struct {
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request")
	}

	if len(req.Password) < 6 {
		return utils.BadRequest(c, "Password must be at least 6 characters")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return utils.InternalServerError(c, "Failed to hash password")
	}

	if err := m.db.Model(&models.User{}).Where("id = ?", id).Update("password", string(hashedPassword)).Error; err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	return utils.SuccessResponse(c, "Password reset successfully", nil)
}

// DeleteUser soft deletes a user
func (m *Module) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")

	// Check if user exists and is not admin
	var user models.User
	if err := m.db.First(&user, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "User not found")
	}

	if user.Role == "admin" {
		return utils.BadRequest(c, "Cannot delete admin user")
	}

	// Soft delete by setting status to inactive
	if err := m.db.Model(&models.User{}).Where("id = ?", id).Update("status", "deleted").Error; err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	return utils.SuccessResponse(c, "User deleted", nil)
}
