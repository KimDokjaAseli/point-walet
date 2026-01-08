package wallet

import (
	"walletpoint/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app fiber.Router, handler *Handler, jwtManager *middleware.JWTManager) {
	wallet := app.Group("/wallet", middleware.JWTMiddleware(jwtManager))

	// All authenticated users
	wallet.Get("/balance", handler.GetBalance)
	wallet.Get("/history", handler.GetHistory)
	wallet.Get("/ledger", handler.GetLedger)

	// Dosen only - transfer to mahasiswa
	wallet.Post("/transfer",
		middleware.RequireDosen(),
		middleware.TransactionRateLimiter(),
		handler.Transfer,
	)

	// Admin routes
	admin := app.Group("/admin/wallets", middleware.JWTMiddleware(jwtManager), middleware.RequireAdmin())
	admin.Post("/adjust", handler.AdjustBalance)
}
