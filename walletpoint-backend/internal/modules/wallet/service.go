package wallet

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Common errors
var (
	ErrWalletNotFound       = errors.New("wallet not found")
	ErrInsufficientBalance  = errors.New("insufficient balance")
	ErrDuplicateTransaction = errors.New("duplicate transaction")
)

// Service handles wallet business logic
type Service struct {
	repo   *Repository
	config *config.Config
}

// NewService creates a new wallet service
func NewService(repo *Repository, cfg *config.Config) *Service {
	return &Service{
		repo:   repo,
		config: cfg,
	}
}

// GetWallet gets wallet by user ID
func (s *Service) GetWallet(ctx context.Context, userID string) (*models.Wallet, error) {
	wallet, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if wallet == nil {
		return nil, ErrWalletNotFound
	}
	return wallet, nil
}

// GetWalletSummary gets wallet with summary info
func (s *Service) GetWalletSummary(ctx context.Context, userID string) (*WalletSummaryResponse, error) {
	wallet, err := s.GetWallet(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Get transaction count
	transactions, total, _ := s.repo.GetTransactionsByUserID(ctx, userID, 1, 1, "")

	// Calculate totals from ledger (simplified - in production, use SQL aggregation)
	ledgers, _, _ := s.repo.GetLedgersByWalletID(ctx, wallet.ID, 1, 1000)

	var totalCredit, totalDebit float64
	for _, l := range ledgers {
		if l.Type == "CREDIT" {
			totalCredit += l.Amount
		} else {
			totalDebit += l.Amount
		}
	}

	var lastTxAt *string
	if len(transactions) > 0 {
		ts := transactions[0].CreatedAt.Format("2006-01-02T15:04:05Z07:00")
		lastTxAt = &ts
	}

	return &WalletSummaryResponse{
		Wallet: WalletDTO{
			ID:            wallet.ID,
			UserID:        wallet.UserID,
			Balance:       wallet.Balance,
			LockedBalance: wallet.LockedBalance,
			UpdatedAt:     wallet.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		},
		Summary: WalletSummary{
			TotalCredit:      totalCredit,
			TotalDebit:       totalDebit,
			TransactionCount: int(total),
		},
		LastTransactionAt: lastTxAt,
	}, nil
}

// GetTransactions gets user transactions
func (s *Service) GetTransactions(ctx context.Context, userID string, page, limit int, txType string) ([]TransactionDTO, int64, error) {
	transactions, total, err := s.repo.GetTransactionsByUserID(ctx, userID, page, limit, txType)
	if err != nil {
		return nil, 0, err
	}

	dtos := make([]TransactionDTO, len(transactions))
	for i, tx := range transactions {
		direction := "CREDIT"
		if tx.SenderID != nil && *tx.SenderID == userID {
			direction = "DEBIT"
		}

		dto := TransactionDTO{
			ID:          tx.ID,
			Type:        tx.Type,
			Amount:      tx.Amount,
			Direction:   direction,
			Status:      tx.Status,
			Description: utils.Deref(tx.Description, ""),
			CreatedAt:   tx.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		if tx.Sender != nil {
			dto.Counterparty = &UserBriefDTO{
				ID:   tx.Sender.ID,
				Name: tx.Sender.Name,
			}
		} else if tx.Receiver != nil {
			dto.Counterparty = &UserBriefDTO{
				ID:   tx.Receiver.ID,
				Name: tx.Receiver.Name,
			}
		}

		dtos[i] = dto
	}

	return dtos, total, nil
}

// GetLedger gets user ledger entries
func (s *Service) GetLedger(ctx context.Context, userID string, page, limit int) ([]LedgerDTO, int64, error) {
	wallet, err := s.GetWallet(ctx, userID)
	if err != nil {
		return nil, 0, err
	}

	ledgers, total, err := s.repo.GetLedgersByWalletID(ctx, wallet.ID, page, limit)
	if err != nil {
		return nil, 0, err
	}

	dtos := make([]LedgerDTO, len(ledgers))
	for i, l := range ledgers {
		dtos[i] = LedgerDTO{
			ID:            l.ID,
			TransactionID: utils.Deref(l.TransactionID, ""),
			Type:          l.Type,
			Amount:        l.Amount,
			BalanceBefore: l.BalanceBefore,
			BalanceAfter:  l.BalanceAfter,
			Description:   utils.Deref(l.Description, ""),
			CreatedAt:     l.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	return dtos, total, nil
}

// TransferPoints transfers points between wallets (atomic)
func (s *Service) TransferPoints(ctx context.Context, senderID, receiverID string, amount float64, txType, description, idempotencyKey string) (*models.Transaction, error) {
	// Check for duplicate transaction
	if idempotencyKey != "" {
		existing, err := s.repo.GetTransactionByIdempotencyKey(ctx, idempotencyKey)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return existing, ErrDuplicateTransaction
		}
	}

	// Begin transaction
	tx := s.repo.BeginTransaction()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Lock sender wallet
	senderWallet, err := s.repo.GetByUserIDForUpdate(ctx, tx, senderID)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if senderWallet == nil {
		tx.Rollback()
		return nil, ErrWalletNotFound
	}

	// Check balance
	if senderWallet.Balance < amount {
		tx.Rollback()
		return nil, ErrInsufficientBalance
	}

	// Lock receiver wallet
	receiverWallet, err := s.repo.GetByUserIDForUpdate(ctx, tx, receiverID)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if receiverWallet == nil {
		tx.Rollback()
		return nil, ErrWalletNotFound
	}

	// Create transaction record
	transaction := &models.Transaction{
		SenderID:       &senderID,
		ReceiverID:     &receiverID,
		Amount:         amount,
		Type:           txType,
		Status:         "SUCCESS",
		IdempotencyKey: &idempotencyKey,
		Description:    &description,
	}
	if err := s.repo.CreateTransaction(ctx, tx, transaction); err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create debit ledger entry
	debitLedger := &models.Ledger{
		WalletID:      senderWallet.ID,
		TransactionID: &transaction.ID,
		Type:          "DEBIT",
		Amount:        amount,
		BalanceBefore: senderWallet.Balance,
		BalanceAfter:  senderWallet.Balance - amount,
		Description:   &description,
	}
	if err := s.repo.CreateLedgerEntry(ctx, tx, debitLedger); err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create credit ledger entry
	creditLedger := &models.Ledger{
		WalletID:      receiverWallet.ID,
		TransactionID: &transaction.ID,
		Type:          "CREDIT",
		Amount:        amount,
		BalanceBefore: receiverWallet.Balance,
		BalanceAfter:  receiverWallet.Balance + amount,
		Description:   &description,
	}
	if err := s.repo.CreateLedgerEntry(ctx, tx, creditLedger); err != nil {
		tx.Rollback()
		return nil, err
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return transaction, nil
}

// CreditPoints adds points to a wallet (atomic)
func (s *Service) CreditPoints(ctx context.Context, userID string, amount float64, txType, description, idempotencyKey string) (*models.Transaction, error) {
	// Check for duplicate transaction
	if idempotencyKey != "" {
		existing, err := s.repo.GetTransactionByIdempotencyKey(ctx, idempotencyKey)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return existing, ErrDuplicateTransaction
		}
	}

	// Begin transaction
	tx := s.repo.BeginTransaction()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Lock wallet
	wallet, err := s.repo.GetByUserIDForUpdate(ctx, tx, userID)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if wallet == nil {
		tx.Rollback()
		return nil, ErrWalletNotFound
	}

	// Create transaction record
	transaction := &models.Transaction{
		ReceiverID:     &userID,
		Amount:         amount,
		Type:           txType,
		Status:         "SUCCESS",
		IdempotencyKey: &idempotencyKey,
		Description:    &description,
	}
	if err := s.repo.CreateTransaction(ctx, tx, transaction); err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create credit ledger entry
	creditLedger := &models.Ledger{
		WalletID:      wallet.ID,
		TransactionID: &transaction.ID,
		Type:          "CREDIT",
		Amount:        amount,
		BalanceBefore: wallet.Balance,
		BalanceAfter:  wallet.Balance + amount,
		Description:   &description,
	}
	if err := s.repo.CreateLedgerEntry(ctx, tx, creditLedger); err != nil {
		tx.Rollback()
		return nil, err
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return transaction, nil
}

// CreateWalletForUser creates a wallet for a new user
func (s *Service) CreateWalletForUser(ctx context.Context, userID string) (*models.Wallet, error) {
	wallet := &models.Wallet{
		UserID:        userID,
		Balance:       0,
		LockedBalance: 0,
	}

	if err := s.repo.Create(ctx, wallet); err != nil {
		return nil, err
	}

	return wallet, nil
}

// GetDB returns the underlying gorm.DB for cross-module transactions
func (s *Service) GetDB() *gorm.DB {
	return s.repo.db
}
