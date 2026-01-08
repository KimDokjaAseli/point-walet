package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	JWT      JWTConfig
	QR       QRConfig
}

type AppConfig struct {
	Name string
	Env  string
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
}

type JWTConfig struct {
	AccessSecret  string
	RefreshSecret string
	AccessExpiry  time.Duration
	RefreshExpiry time.Duration
}

type QRConfig struct {
	SigningSecret string
	ExpiryMinutes int
}

func Load() (*Config, error) {
	// Load .env file
	godotenv.Load()

	accessExpiry, _ := time.ParseDuration(getEnv("JWT_ACCESS_EXPIRY", "15m"))
	refreshExpiry, _ := time.ParseDuration(getEnv("JWT_REFRESH_EXPIRY", "168h"))
	qrExpiry, _ := strconv.Atoi(getEnv("QR_EXPIRY_MINUTES", "10"))

	return &Config{
		App: AppConfig{
			Name: getEnv("APP_NAME", "WalletPoint"),
			Env:  getEnv("APP_ENV", "development"),
			Port: getEnv("APP_PORT", "8080"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "3306"),
			Name:     getEnv("DB_NAME", "pointwalletV2"),
			User:     getEnv("DB_USER", "root"),
			Password: getEnv("DB_PASSWORD", ""),
		},
		JWT: JWTConfig{
			AccessSecret:  getEnv("JWT_ACCESS_SECRET", "default-access-secret-key-32chars"),
			RefreshSecret: getEnv("JWT_REFRESH_SECRET", "default-refresh-secret-key-32chars"),
			AccessExpiry:  accessExpiry,
			RefreshExpiry: refreshExpiry,
		},
		QR: QRConfig{
			SigningSecret: getEnv("QR_SIGNING_SECRET", "default-qr-secret"),
			ExpiryMinutes: qrExpiry,
		},
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
