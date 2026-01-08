package wallet

import (
	"context"
	"database/sql"
	"time"

	"walletpoint/internal/shared/constants"
	apperrors "walletpoint/internal/shared/errors"
	"walletpoint/pkg/utils"
)

type ServiceInterface interface {
	GetBalance(ctx context.Context, userID uint) (*BalanceResponse, error)
	GetHistory(ctx context.Context, userID uint, params HistoryParams) ([]*TransactionResponse, int, error)
	GetLedger(ctx context.Context, userID uint, page, perPage int) ([]*LedgerEntryResponse, int, error)
	Transfer(ctx context.Context, fromUserID uint, req TransferRequest) (*TransferResponse, error)
	AdjustBalance(ctx context.Context, adminID uint, req AdjustBalanceRequest) (*TransactionResponse, error)
}

type Service struct {
	repo *Repository
	db   *sql.DB
}

func NewService(repo *Repository, db *sql.DB) *Service {
	return &Service{
		repo: repo,
		db:   db,
	}
}

func (s *Service) GetBalance(ctx context.Context, userID uint) (*BalanceResponse, error) {
	wallet, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, apperrors.Wrap(err, "INTERNAL_ERROR", "Failed to get wallet")
	}
	if wallet == nil {
		return nil, apperrors.ErrWalletNotFound
	}

	return &BalanceResponse{
		UserID:         userID,
		Balance:        wallet.Balance,
		LockedBalance:  wallet.LockedBalance,
		LifetimeEarned: wallet.LifetimeEarned,
		LifetimeSpent:  wallet.LifetimeSpent,
		IsFrozen:       wallet.IsFrozen,
	}, nil
}

func (s *Service) GetHistory(ctx context.Context, userID uint, params HistoryParams) ([]*TransactionResponse, int, error) {
	wallet, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, 0, apperrors.Wrap(err, "INTERNAL_ERROR", "Failed to get wallet")
	}
	if wallet == nil {
		return nil, 0, apperrors.ErrWalletNotFound
	}

	offset := (params.Page - 1) * params.PerPage
	transactions, total, err := s.repo.GetTransactionsByWalletID(ctx, wallet.ID, params.PerPage, offset)
	if err != nil {
		return nil, 0, apperrors.Wrap(err, "INTERNAL_ERROR", "Failed to get transactions")
	}

	var responses []*TransactionResponse
	for _, t := range transactions {
		direction := constants.LedgerCredit
		if t.FromWalletID.Valid && uint(t.FromWalletID.Int64) == wallet.ID {
			direction = constants.LedgerDebit
		}
		resp := ToTransactionResponse(t, direction, "")
		responses = append(responses, &resp)
	}

	return responses, total, nil
}

func (s *Service) GetLedger(ctx context.Context, userID uint, page, perPage int) ([]*LedgerEntryResponse, int, error) {
	wallet, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, 0, apperrors.Wrap(err, "INTERNAL_ERROR", "Failed to get wallet")
	}
	if wallet == nil {
		return nil, 0, apperrors.ErrWalletNotFound
	}

	offset := (page - 1) * perPage
	entries, total, err := s.repo.GetLedgerByWalletID(ctx, wallet.ID, perPage, offset)
	if err != nil {
		return nil, 0, apperrors.Wrap(err, "INTERNAL_ERROR", "Failed to get ledger")
	}

	var responses []*LedgerEntryResponse
	for _, e := range entries {
		resp := ToLedgerResponse(e)
		responses = append(responses, &resp)
	}

	return responses, total, nil
}

func (s *Service) Transfer(ctx context.Context, fromUserID uint, req TransferRequest) (*TransferResponse, error) {
	// Check idempotency
	existing, _ := s.repo.GetTransactionByIdempotencyKey(ctx, req.IdempotencyKey)
	if existing != nil {
		return &TransferResponse{
			TransactionID:   existing.ID,
			TransactionCode: existing.TransactionCode,
			Amount:          existing.Amount,
			CreatedAt:       existing.CreatedAt.Format(time.RFC3339),
		}, nil
	}

	// Cannot transfer to self
	if fromUserID == req.ToUserID {
		return nil, apperrors.New("CANNOT_TRANSFER_SELF", "Cannot transfer to yourself")
	}

	// Start transaction
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to start transaction")
	}
	defer tx.Rollback()

	// Lock source wallet
	fromWallet, err := s.repo.GetByUserIDForUpdate(ctx, tx, fromUserID)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to lock source wallet")
	}
	if fromWallet == nil {
		return nil, apperrors.ErrWalletNotFound
	}
	if fromWallet.IsFrozen {
		return nil, apperrors.ErrWalletFrozen
	}
	if fromWallet.Balance < req.Amount {
		return nil, apperrors.ErrInsufficientBalance
	}

	// Lock destination wallet
	toWallet, err := s.repo.GetByUserIDForUpdate(ctx, tx, req.ToUserID)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to lock destination wallet")
	}
	if toWallet == nil {
		return nil, apperrors.New("RECIPIENT_NOT_FOUND", "Recipient wallet not found")
	}
	if toWallet.IsFrozen {
		return nil, apperrors.New("RECIPIENT_FROZEN", "Recipient wallet is frozen")
	}

	// Generate transaction code
	txCode := utils.GenerateTransactionCode("TRX")

	// Create transaction record
	transaction := &Transaction{
		TransactionCode: txCode,
		IdempotencyKey:  req.IdempotencyKey,
		TransactionType: constants.TxTypeTransfer,
		Status:          constants.TxStatusCompleted,
		FromWalletID:    sql.NullInt64{Int64: int64(fromWallet.ID), Valid: true},
		ToWalletID:      sql.NullInt64{Int64: int64(toWallet.ID), Valid: true},
		Amount:          req.Amount,
		FeeAmount:       0,
		NetAmount:       req.Amount,
		Description:     sql.NullString{String: req.Description, Valid: req.Description != ""},
		ProcessedAt:     sql.NullTime{Time: time.Now(), Valid: true},
	}

	if err := s.repo.CreateTransaction(ctx, tx, transaction); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create transaction")
	}

	// Debit source wallet
	if err := s.repo.UpdateBalanceWithStats(ctx, tx, fromWallet.ID, req.Amount, false); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to debit source wallet")
	}

	// Credit destination wallet
	if err := s.repo.UpdateBalanceWithStats(ctx, tx, toWallet.ID, req.Amount, true); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to credit destination wallet")
	}

	// Create ledger entries
	debitEntry := &WalletLedger{
		WalletID:      fromWallet.ID,
		TransactionID: sql.NullInt64{Int64: int64(transaction.ID), Valid: true},
		EntryType:     constants.LedgerDebit,
		Amount:        req.Amount,
		BalanceBefore: fromWallet.Balance,
		BalanceAfter:  fromWallet.Balance - req.Amount,
		Description:   "Transfer to user",
		ReferenceType: constants.TxTypeTransfer,
		ReferenceID:   txCode,
	}

	creditEntry := &WalletLedger{
		WalletID:      toWallet.ID,
		TransactionID: sql.NullInt64{Int64: int64(transaction.ID), Valid: true},
		EntryType:     constants.LedgerCredit,
		Amount:        req.Amount,
		BalanceBefore: toWallet.Balance,
		BalanceAfter:  toWallet.Balance + req.Amount,
		Description:   "Transfer received",
		ReferenceType: constants.TxTypeTransfer,
		ReferenceID:   txCode,
	}

	if err := s.repo.CreateLedgerEntry(ctx, tx, debitEntry); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create debit ledger")
	}
	if err := s.repo.CreateLedgerEntry(ctx, tx, creditEntry); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create credit ledger")
	}

	// Commit
	if err := tx.Commit(); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to commit transaction")
	}

	return &TransferResponse{
		TransactionID:   transaction.ID,
		TransactionCode: txCode,
		Amount:          req.Amount,
		YourNewBalance:  fromWallet.Balance - req.Amount,
		CreatedAt:       time.Now().Format(time.RFC3339),
	}, nil
}

func (s *Service) AdjustBalance(ctx context.Context, adminID uint, req AdjustBalanceRequest) (*TransactionResponse, error) {
	// Check idempotency
	existing, _ := s.repo.GetTransactionByIdempotencyKey(ctx, req.IdempotencyKey)
	if existing != nil {
		resp := ToTransactionResponse(existing, "", "")
		return &resp, nil
	}

	// Start transaction
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to start transaction")
	}
	defer tx.Rollback()

	// Lock wallet
	wallet, err := s.repo.GetByUserIDForUpdate(ctx, tx, req.UserID)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to lock wallet")
	}
	if wallet == nil {
		return nil, apperrors.ErrWalletNotFound
	}

	// Check if debit and has sufficient balance
	if req.Amount < 0 && wallet.Balance < -req.Amount {
		return nil, apperrors.ErrInsufficientBalance
	}

	// Generate transaction code
	txCode := utils.GenerateTransactionCode("ADJ")

	// Create transaction record
	transaction := &Transaction{
		TransactionCode: txCode,
		IdempotencyKey:  req.IdempotencyKey,
		TransactionType: constants.TxTypeAdjustment,
		Status:          constants.TxStatusCompleted,
		Amount:          req.Amount,
		FeeAmount:       0,
		NetAmount:       req.Amount,
		Description:     sql.NullString{String: req.Reason, Valid: true},
		ProcessedAt:     sql.NullTime{Time: time.Now(), Valid: true},
	}

	if req.Amount > 0 {
		transaction.ToWalletID = sql.NullInt64{Int64: int64(wallet.ID), Valid: true}
	} else {
		transaction.FromWalletID = sql.NullInt64{Int64: int64(wallet.ID), Valid: true}
	}

	if err := s.repo.CreateTransaction(ctx, tx, transaction); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create transaction")
	}

	// Update balance
	isCredit := req.Amount > 0
	absAmount := req.Amount
	if absAmount < 0 {
		absAmount = -absAmount
	}

	if err := s.repo.UpdateBalanceWithStats(ctx, tx, wallet.ID, absAmount, isCredit); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to update balance")
	}

	// Create ledger entry
	entryType := constants.LedgerCredit
	if !isCredit {
		entryType = constants.LedgerDebit
	}

	entry := &WalletLedger{
		WalletID:      wallet.ID,
		TransactionID: sql.NullInt64{Int64: int64(transaction.ID), Valid: true},
		EntryType:     entryType,
		Amount:        absAmount,
		BalanceBefore: wallet.Balance,
		BalanceAfter:  wallet.Balance + req.Amount,
		Description:   "Admin adjustment: " + req.Reason,
		ReferenceType: constants.TxTypeAdjustment,
		ReferenceID:   txCode,
	}

	if err := s.repo.CreateLedgerEntry(ctx, tx, entry); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create ledger")
	}

	// Commit
	if err := tx.Commit(); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to commit transaction")
	}

	resp := ToTransactionResponse(transaction, entryType, "")
	return &resp, nil
}
