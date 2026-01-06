package wallet

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Repository handles wallet database operations
type Repository struct {
	db *gorm.DB
}

// NewRepository creates a new wallet repository
func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// GetByUserID gets wallet by user ID
func (r *Repository) GetByUserID(ctx context.Context, userID string) (*models.Wallet, error) {
	var wallet models.Wallet
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&wallet).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &wallet, nil
}

// GetByUserIDForUpdate gets wallet by user ID with row lock
func (r *Repository) GetByUserIDForUpdate(ctx context.Context, tx *gorm.DB, userID string) (*models.Wallet, error) {
	var wallet models.Wallet
	err := tx.WithContext(ctx).
		Clauses().
		Raw("SELECT * FROM wallets WHERE user_id = ? FOR UPDATE", userID).
		Scan(&wallet).Error
	if err != nil {
		return nil, err
	}
	if wallet.ID == "" {
		return nil, nil
	}
	return &wallet, nil
}

// Create creates a new wallet
func (r *Repository) Create(ctx context.Context, wallet *models.Wallet) error {
	wallet.ID = utils.GenerateUUID()
	return r.db.WithContext(ctx).Create(wallet).Error
}

// UpdateBalance updates wallet balance (use with transaction)
func (r *Repository) UpdateBalance(ctx context.Context, tx *gorm.DB, walletID string, newBalance float64) error {
	return tx.WithContext(ctx).
		Model(&models.Wallet{}).
		Where("id = ?", walletID).
		Update("balance", newBalance).Error
}

// GetTransactionsByUserID gets transactions for a user
func (r *Repository) GetTransactionsByUserID(ctx context.Context, userID string, page, limit int, txType string) ([]models.Transaction, int64, error) {
	var transactions []models.Transaction
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Transaction{}).
		Where("sender_id = ? OR receiver_id = ?", userID, userID)

	if txType != "" {
		query = query.Where("type = ?", txType)
	}

	// Count total
	query.Count(&total)

	// Get paginated results
	offset, _ := utils.CalculatePagination(page, limit, int(total))
	err := query.
		Preload("Sender").
		Preload("Receiver").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&transactions).Error

	return transactions, total, err
}

// GetLedgersByWalletID gets ledger entries for a wallet
func (r *Repository) GetLedgersByWalletID(ctx context.Context, walletID string, page, limit int) ([]models.Ledger, int64, error) {
	var ledgers []models.Ledger
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Ledger{}).
		Where("wallet_id = ?", walletID)

	// Count total
	query.Count(&total)

	// Get paginated results
	offset, _ := utils.CalculatePagination(page, limit, int(total))
	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&ledgers).Error

	return ledgers, total, err
}

// CreateLedgerEntry creates a new ledger entry
func (r *Repository) CreateLedgerEntry(ctx context.Context, tx *gorm.DB, ledger *models.Ledger) error {
	ledger.ID = utils.GenerateUUID()
	return tx.WithContext(ctx).Create(ledger).Error
}

// CreateTransaction creates a new transaction record
func (r *Repository) CreateTransaction(ctx context.Context, tx *gorm.DB, transaction *models.Transaction) error {
	transaction.ID = utils.GenerateUUID()
	return tx.WithContext(ctx).Create(transaction).Error
}

// GetTransactionByIdempotencyKey gets transaction by idempotency key
func (r *Repository) GetTransactionByIdempotencyKey(ctx context.Context, key string) (*models.Transaction, error) {
	var transaction models.Transaction
	err := r.db.WithContext(ctx).Where("idempotency_key = ?", key).First(&transaction).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &transaction, nil
}

// BeginTransaction starts a database transaction
func (r *Repository) BeginTransaction() *gorm.DB {
	return r.db.Begin()
}
