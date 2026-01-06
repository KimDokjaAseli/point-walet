package wallet

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/middleware"
)

// Module represents the wallet module
type Module struct {
	Handler *Handler
	Service *Service
	Repo    *Repository
}

// NewModule creates a new wallet module
func NewModule(db *gorm.DB, cfg *config.Config) *Module {
	repo := NewRepository(db)
	service := NewService(repo, cfg)
	handler := NewHandler(service)

	return &Module{
		Handler: handler,
		Service: service,
		Repo:    repo,
	}
}

// RegisterRoutes registers wallet routes
func (m *Module) RegisterRoutes(router fiber.Router, authMiddleware *middleware.AuthMiddleware) {
	wallet := router.Group("/wallet")

	// All wallet routes require authentication
	wallet.Use(authMiddleware.Protected())

	// Routes accessible by all authenticated users
	wallet.Get("/", m.Handler.GetWallet)
	wallet.Get("/transactions", m.Handler.GetTransactions)
	wallet.Get("/ledger", m.Handler.GetLedger)

	// Transfer route - only for dosen
	wallet.Post("/transfer", authMiddleware.RequireDosen(), m.Handler.Transfer)

	// Quiz reward route - for mahasiswa completing quizzes
	wallet.Post("/quiz-reward", m.Handler.QuizReward)
}
