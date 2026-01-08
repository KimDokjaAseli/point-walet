package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"

	"walletpoint/internal/config"
	"walletpoint/internal/database"
	"walletpoint/internal/middleware"
	"walletpoint/internal/modules/auth"
	"walletpoint/internal/modules/mission"
	"walletpoint/internal/modules/product"
	"walletpoint/internal/modules/qr"
	"walletpoint/internal/modules/wallet"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	db, err := database.Connect(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("Connected to database successfully")

	// Initialize JWT Manager
	jwtManager := middleware.NewJWTManager(cfg.JWT)

	// Initialize repositories
	authRepo := auth.NewRepository(db)
	walletRepo := wallet.NewRepository(db)
	qrRepo := qr.NewRepository(db)
	missionRepo := mission.NewRepository(db)
	productRepo := product.NewRepository(db)

	// Initialize services
	authService := auth.NewService(authRepo, jwtManager)
	walletService := wallet.NewService(walletRepo, db)
	qrService := qr.NewService(qrRepo, walletRepo, db, cfg.QR)
	missionService := mission.NewService(missionRepo, walletRepo, db)
	productService := product.NewService(productRepo, walletRepo, db)

	// Initialize handlers
	authHandler := auth.NewHandler(authService)
	walletHandler := wallet.NewHandler(walletService)
	qrHandler := qr.NewHandler(qrService)
	missionHandler := mission.NewHandler(missionService)
	productHandler := product.NewHandler(productService)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      cfg.App.Name,
		ErrorHandler: customErrorHandler,
	})

	// Global middlewares
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} - ${latency}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization,X-Idempotency-Key,X-Request-ID",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": cfg.App.Name,
			"version": "1.0.0",
		})
	})

	// API v1 routes
	v1 := app.Group("/api/v1")

	// Register module routes
	auth.RegisterRoutes(v1, authHandler, jwtManager)
	wallet.RegisterRoutes(v1, walletHandler, jwtManager)
	qr.RegisterRoutes(v1, qrHandler, jwtManager)
	mission.RegisterRoutes(v1, missionHandler, jwtManager)
	product.RegisterRoutes(v1, productHandler, jwtManager)

	// Start server
	log.Printf("Starting %s on port %s", cfg.App.Name, cfg.App.Port)
	if err := app.Listen(":" + cfg.App.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}

	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"message": err.Error(),
		"error": fiber.Map{
			"code": "INTERNAL_ERROR",
		},
	})
}
