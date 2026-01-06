package config

import (
	"os"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all application configuration
type Config struct {
	// Server
	Port        string
	Environment string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	// JWT
	JWTSecret        string
	JWTAccessExpiry  time.Duration
	JWTRefreshExpiry time.Duration

	// QR Code
	QRSecretKey     string
	QRExpiryMinutes int

	// CORS
	CORSOrigins string

	// Rate Limiting
	RateLimitMax    int
	RateLimitExpiry time.Duration

	// External Sync
	SyncAPIKey string
}

// Load loads configuration from environment variables
func Load() *Config {
	// Load .env file if exists
	_ = godotenv.Load()

	return &Config{
		// Server
		Port:        getEnv("PORT", "3000"),
		Environment: getEnv("ENVIRONMENT", "development"),

		// Database
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "point-wallet"),

		// JWT
		JWTSecret:        getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTAccessExpiry:  15 * time.Minute,
		JWTRefreshExpiry: 7 * 24 * time.Hour,

		// QR Code
		QRSecretKey:     getEnv("QR_SECRET_KEY", "qr-secret-key-change-in-production"),
		QRExpiryMinutes: 10,

		// CORS
		CORSOrigins: getEnv("CORS_ORIGINS", "*"),

		// Rate Limiting
		RateLimitMax:    100,
		RateLimitExpiry: time.Minute,

		// External Sync
		SyncAPIKey: getEnv("SYNC_API_KEY", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
