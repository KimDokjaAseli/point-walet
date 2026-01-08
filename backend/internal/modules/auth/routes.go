package auth

import (
	"walletpoint/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app fiber.Router, handler *Handler, jwtManager *middleware.JWTManager) {
	auth := app.Group("/auth")

	// Public routes with rate limiting
	auth.Post("/admin/login", middleware.AuthRateLimiter(), handler.Login("admin"))
	auth.Post("/dosen/login", middleware.AuthRateLimiter(), handler.Login("dosen"))
	auth.Post("/mahasiswa/login", middleware.AuthRateLimiter(), handler.Login("mahasiswa"))
	auth.Post("/refresh", middleware.AuthRateLimiter(), handler.RefreshToken)

	// Protected routes
	protected := auth.Group("", middleware.JWTMiddleware(jwtManager))
	protected.Post("/logout", handler.Logout)
	protected.Get("/me", handler.GetProfile)
	protected.Put("/password", handler.ChangePassword)

	// Admin only routes
	admin := auth.Group("", middleware.JWTMiddleware(jwtManager), middleware.RequireAdmin())
	admin.Post("/register", handler.Register)
}
