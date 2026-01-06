package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/middleware"
	"walletpoint-backend/internal/modules/admin"
	"walletpoint-backend/internal/modules/audit"
	"walletpoint-backend/internal/modules/auth"
	"walletpoint-backend/internal/modules/marketplace"
	"walletpoint-backend/internal/modules/mission"
	"walletpoint-backend/internal/modules/qr"
	"walletpoint-backend/internal/modules/sync"
	"walletpoint-backend/internal/modules/user"
	"walletpoint-backend/internal/modules/wallet"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := config.InitDatabase(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "WalletPoint API v1.0",
		ErrorHandler: middleware.ErrorHandler,
	})

	// Global middleware
	app.Use(requestid.New())
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Idempotency-Key,X-API-Key,X-Signature",
		AllowCredentials: true,
	}))
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(compress.New())
	app.Use(helmet.New())

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"version": "1.0.0",
			"app":     "WalletPoint API",
		})
	})

	// API v1 routes
	api := app.Group("/api/v1")

	// Initialize modules in order of dependency

	// 1. Auth module (no dependencies)
	authModule := auth.NewModule(db, cfg)

	// 2. Wallet module (no dependencies)
	walletModule := wallet.NewModule(db, cfg)

	// 3. Set wallet creator in auth service
	authModule.Service.SetWalletCreator(walletModule.Service)

	// 4. QR module (depends on wallet)
	qrModule := qr.NewModule(db, cfg, walletModule.Service)

	// 5. Marketplace module (depends on wallet and qr)
	marketplaceModule := marketplace.NewModule(db, cfg, walletModule.Service, qrModule.Service)

	// 6. Mission module (depends on wallet)
	missionModule := mission.NewModule(db, cfg, walletModule.Service)

	// 7. Sync module (depends on wallet)
	syncModule := sync.NewModule(db, cfg, walletModule.Service)

	// 8. User module (no dependencies)
	userModule := user.NewModule(db, cfg)

	// 9. Audit module (no dependencies)
	auditModule := audit.NewModule(db, cfg)

	// 10. Admin module (depends on wallet)
	adminModule := admin.NewModule(db, cfg, walletModule.Service)

	// Register routes
	authModule.RegisterRoutes(api)
	walletModule.RegisterRoutes(api, authModule.Middleware)
	qrModule.RegisterRoutes(api, authModule.Middleware)
	marketplaceModule.RegisterRoutes(api, authModule.Middleware)
	missionModule.RegisterRoutes(api, authModule.Middleware)
	syncModule.RegisterRoutes(api, authModule.Middleware)
	userModule.RegisterRoutes(api, authModule.Middleware)
	auditModule.RegisterRoutes(api, authModule.Middleware)
	adminModule.RegisterRoutes(api, authModule.Middleware)

	// Print available routes in development
	if cfg.Environment == "development" {
		log.Println("Available routes:")
		for _, route := range app.GetRoutes() {
			if route.Method != "HEAD" {
				log.Printf("  %s %s", route.Method, route.Path)
			}
		}
	}

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Gracefully shutting down...")
		_ = app.Shutdown()
	}()

	// Start server
	port := cfg.Port
	if port == "" {
		port = "3000"
	}

	log.Printf("🚀 WalletPoint API starting on port %s", port)
	log.Printf("📚 API Documentation: http://localhost:%s/health", port)

	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
