package product

import (
	"walletpoint/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app fiber.Router, handler *Handler, jwtManager *middleware.JWTManager) {
	// Products - public listing
	products := app.Group("/products")
	products.Get("", handler.GetActiveProducts)
	products.Get("/:id", handler.GetProductByID)

	// Protected product routes
	productsAuth := products.Group("", middleware.JWTMiddleware(jwtManager))

	// Dosen only - create/update/delete products
	productsAuth.Post("", middleware.RequireDosen(), handler.CreateProduct)
	productsAuth.Get("/my", middleware.RequireDosen(), handler.GetMyProducts)
	productsAuth.Put("/:id", middleware.RequireDosen(), handler.UpdateProduct)
	productsAuth.Delete("/:id", middleware.RequireDosen(), handler.DeleteProduct)

	// Orders - authenticated only
	orders := app.Group("/orders", middleware.JWTMiddleware(jwtManager))
	orders.Get("", handler.GetMyOrders)
	orders.Post("", handler.CreateOrder)
}
