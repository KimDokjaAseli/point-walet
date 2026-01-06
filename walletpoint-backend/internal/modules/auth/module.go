package auth

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/middleware"
)

// Module represents the auth module
type Module struct {
	Handler    *Handler
	Service    *Service
	Repo       *Repository
	Middleware *middleware.AuthMiddleware
}

// NewModule creates a new auth module
func NewModule(db *gorm.DB, cfg *config.Config) *Module {
	repo := NewRepository(db)
	authMiddleware := middleware.NewAuthMiddleware(cfg)
	service := NewService(repo, cfg, authMiddleware)
	handler := NewHandler(service)

	return &Module{
		Handler:    handler,
		Service:    service,
		Repo:       repo,
		Middleware: authMiddleware,
	}
}

// RegisterRoutes registers auth routes
func (m *Module) RegisterRoutes(router fiber.Router) {
	auth := router.Group("/auth")

	// Public routes
	auth.Post("/login", m.Handler.Login)
	auth.Post("/register", m.Handler.Register)
	auth.Post("/refresh", m.Handler.Refresh)
	auth.Post("/logout", m.Handler.Logout)

	// Protected routes
	auth.Get("/me", m.Middleware.Protected(), m.Handler.Me)
}
