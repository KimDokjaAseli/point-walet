package qr

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/middleware"
)

// Module represents the QR module
type Module struct {
	Handler *Handler
	Service *Service
	Repo    *Repository
}

// NewModule creates a new QR module
func NewModule(db *gorm.DB, cfg *config.Config, walletSvc WalletService) *Module {
	repo := NewRepository(db)
	service := NewService(repo, cfg, walletSvc)
	handler := NewHandler(service)

	return &Module{
		Handler: handler,
		Service: service,
		Repo:    repo,
	}
}

// RegisterRoutes registers QR routes
func (m *Module) RegisterRoutes(router fiber.Router, authMiddleware *middleware.AuthMiddleware) {
	qr := router.Group("/qr")

	// All QR routes require authentication
	qr.Use(authMiddleware.Protected())

	// Generate QR - only for dosen
	qr.Post("/generate", authMiddleware.RequireDosen(), m.Handler.Generate)

	// Scan QR - for dosen and mahasiswa
	qr.Post("/scan", authMiddleware.RequireDosenOrMahasiswa(), m.Handler.Scan)

	// Get QR codes
	qr.Get("/my", m.Handler.GetMyQRCodes)
	qr.Get("/:id", m.Handler.GetByID)
}
