package qr

import (
	"walletpoint/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app fiber.Router, handler *Handler, jwtManager *middleware.JWTManager) {
	qr := app.Group("/qr", middleware.JWTMiddleware(jwtManager))

	// Create QR - Dosen only
	qr.Post("/create",
		middleware.RequireDosen(),
		middleware.TransactionRateLimiter(),
		handler.CreateQR,
	)

	// Process QR payment - All authenticated
	qr.Post("/process",
		middleware.QRScanRateLimiter(),
		handler.ProcessPayment,
	)

	// Get my QRs - Dosen only
	qr.Get("/my",
		middleware.RequireDosen(),
		handler.GetMyQRs,
	)

	// Get QR detail
	qr.Get("/:id", handler.GetQRDetail)

	// Cancel QR - Creator only
	qr.Delete("/:id",
		middleware.RequireDosen(),
		handler.CancelQR,
	)
}
