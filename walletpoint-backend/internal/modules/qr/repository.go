package qr

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Repository handles QR database operations
type Repository struct {
	db *gorm.DB
}

// NewRepository creates a new QR repository
func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// Create creates a new QR code
func (r *Repository) Create(ctx context.Context, qr *models.QRCode) error {
	qr.ID = utils.GenerateUUID()
	return r.db.WithContext(ctx).Create(qr).Error
}

// GetByCode gets QR by code
func (r *Repository) GetByCode(ctx context.Context, code string) (*models.QRCode, error) {
	var qr models.QRCode
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&qr).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &qr, nil
}

// GetByCodeForUpdate gets QR by code with row lock
func (r *Repository) GetByCodeForUpdate(ctx context.Context, tx *gorm.DB, code string) (*models.QRCode, error) {
	var qr models.QRCode
	err := tx.WithContext(ctx).
		Raw("SELECT * FROM qr_codes WHERE code = ? FOR UPDATE", code).
		Scan(&qr).Error
	if err != nil {
		return nil, err
	}
	if qr.ID == "" {
		return nil, nil
	}
	return &qr, nil
}

// GetByID gets QR by ID
func (r *Repository) GetByID(ctx context.Context, id string) (*models.QRCode, error) {
	var qr models.QRCode
	err := r.db.WithContext(ctx).Where("id = ?", id).Preload("User").First(&qr).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &qr, nil
}

// GetByUserID gets QR codes by user ID
func (r *Repository) GetByUserID(ctx context.Context, userID string, page, limit int) ([]models.QRCode, int64, error) {
	var qrs []models.QRCode
	var total int64

	query := r.db.WithContext(ctx).Model(&models.QRCode{}).Where("user_id = ?", userID)
	query.Count(&total)

	offset, _ := utils.CalculatePagination(page, limit, int(total))
	err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&qrs).Error

	return qrs, total, err
}

// UpdateStatus updates QR status
func (r *Repository) UpdateStatus(ctx context.Context, tx *gorm.DB, id, status string) error {
	db := tx
	if db == nil {
		db = r.db
	}
	updates := map[string]interface{}{
		"status": status,
	}
	if status == "USED" {
		updates["used_at"] = time.Now()
	}
	return db.WithContext(ctx).Model(&models.QRCode{}).Where("id = ?", id).Updates(updates).Error
}

// UpdateTransactionID updates QR transaction ID
func (r *Repository) UpdateTransactionID(ctx context.Context, tx *gorm.DB, id, transactionID string) error {
	db := tx
	if db == nil {
		db = r.db
	}
	return db.WithContext(ctx).Model(&models.QRCode{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"transaction_id": transactionID,
			"status":         "USED",
			"used_at":        time.Now(),
		}).Error
}

// BeginTransaction starts a database transaction
func (r *Repository) BeginTransaction() *gorm.DB {
	return r.db.Begin()
}

// ExpireOldQRCodes expires QR codes that are past their expiry time
func (r *Repository) ExpireOldQRCodes(ctx context.Context) error {
	return r.db.WithContext(ctx).
		Model(&models.QRCode{}).
		Where("status = 'ACTIVE' AND expires_at < ?", time.Now()).
		Update("status", "EXPIRED").Error
}
