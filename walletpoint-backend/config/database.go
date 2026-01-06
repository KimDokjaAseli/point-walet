package config

import (
	"fmt"
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"walletpoint-backend/internal/shared/models"
)

// InitDatabase initializes the database connection
func InitDatabase(cfg *Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	logLevel := logger.Silent
	if cfg.Environment == "development" {
		logLevel = logger.Info
	}

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying SQL DB
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	// Auto-migrate all models
	log.Println("Running database migrations...")
	err = db.AutoMigrate(
		&models.User{},
		&models.Wallet{},
		&models.Ledger{},
		&models.Transaction{},
		&models.QRCode{},
		&models.Product{},
		&models.Order{},
		&models.OrderItem{},
		&models.Mission{},
		&models.MissionProgress{},
		&models.AuditLog{},
		&models.RefreshToken{},
		&models.SyncLog{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}
	log.Println("Database migrations completed successfully")

	return db, nil
}
