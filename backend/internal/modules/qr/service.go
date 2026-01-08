package qr

import (
	"context"
	"database/sql"
	"encoding/base64"
	"time"

	"walletpoint/internal/config"
	"walletpoint/internal/modules/wallet"
	"walletpoint/internal/shared/constants"
	apperrors "walletpoint/internal/shared/errors"
	"walletpoint/pkg/utils"

	qrcode "github.com/skip2/go-qrcode"
)

type Service struct {
	repo       *Repository
	walletRepo *wallet.Repository
	db         *sql.DB
	config     config.QRConfig
}

func NewService(repo *Repository, walletRepo *wallet.Repository, db *sql.DB, cfg config.QRConfig) *Service {
	return &Service{
		repo:       repo,
		walletRepo: walletRepo,
		db:         db,
		config:     cfg,
	}
}

func (s *Service) CreateQR(ctx context.Context, req CreateQRRequest, creatorID uint) (*QRCodeResponse, error) {
	// Generate unique code
	code := utils.GenerateUUID()

	// Generate signature
	signature := utils.GenerateQRSignature(code, req.Amount, creatorID, s.config.SigningSecret)

	// Calculate expiry
	expiresAt := time.Now().Add(time.Duration(s.config.ExpiryMinutes) * time.Minute)

	qr := &QRCode{
		Code:        code,
		QRType:      req.Type,
		CreatorID:   creatorID,
		Amount:      req.Amount,
		Description: sql.NullString{String: req.Description, Valid: req.Description != ""},
		Signature:   signature,
		Status:      constants.QRStatusActive,
		IsSingleUse: true,
		MaxUses:     1,
		CurrentUses: 0,
		ExpiresAt:   expiresAt,
	}

	if req.ProductID != nil {
		qr.ProductID = sql.NullInt64{Int64: int64(*req.ProductID), Valid: true}
	}

	// Save to database
	if err := s.repo.Create(ctx, qr); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create QR code")
	}

	// Generate QR image
	imageBase64, err := s.generateQRImage(code)
	if err != nil {
		// Log error but don't fail
		imageBase64 = ""
	}

	resp := ToQRCodeResponse(qr, imageBase64)
	return &resp, nil
}

func (s *Service) GetByID(ctx context.Context, id uint, userID uint) (*QRCodeResponse, error) {
	qr, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to get QR code")
	}
	if qr == nil {
		return nil, apperrors.ErrQRNotFound
	}

	// Only creator can view their QR details
	if qr.CreatorID != userID {
		return nil, apperrors.ErrForbidden
	}

	resp := ToQRCodeResponse(qr, "")
	return &resp, nil
}

func (s *Service) GetMyQRs(ctx context.Context, creatorID uint, page, perPage int) ([]*MyQRListResponse, int, error) {
	offset := (page - 1) * perPage
	qrs, total, err := s.repo.GetByCreatorID(ctx, creatorID, perPage, offset)
	if err != nil {
		return nil, 0, apperrors.Wrap(err, "DB_ERROR", "Failed to get QR codes")
	}

	var responses []*MyQRListResponse
	for _, qr := range qrs {
		resp := ToMyQRListResponse(qr)
		responses = append(responses, &resp)
	}

	return responses, total, nil
}

func (s *Service) CancelQR(ctx context.Context, id uint, creatorID uint) error {
	qr, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return apperrors.Wrap(err, "DB_ERROR", "Failed to get QR code")
	}
	if qr == nil {
		return apperrors.ErrQRNotFound
	}

	if qr.CreatorID != creatorID {
		return apperrors.ErrForbidden
	}

	if qr.Status != constants.QRStatusActive {
		return apperrors.New("QR_NOT_ACTIVE", "QR code is not active")
	}

	return s.repo.UpdateStatus(ctx, id, constants.QRStatusCancelled)
}

func (s *Service) ProcessPayment(ctx context.Context, req ProcessQRRequest, payerID uint) (*PaymentResultResponse, error) {
	// Check idempotency
	existingTx, _ := s.walletRepo.GetTransactionByIdempotencyKey(ctx, req.IdempotencyKey)
	if existingTx != nil {
		return &PaymentResultResponse{
			TransactionID:   existingTx.ID,
			TransactionCode: existingTx.TransactionCode,
			Amount:          existingTx.Amount,
			ProcessedAt:     existingTx.ProcessedAt.Time.Format(time.RFC3339),
		}, nil
	}

	// Start transaction
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to start transaction")
	}
	defer tx.Rollback()

	// 1. Lock and validate QR
	qr, err := s.repo.GetByCodeForUpdate(ctx, tx, req.QRCode)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to lock QR code")
	}
	if qr == nil {
		return nil, apperrors.ErrQRNotFound
	}

	// Validate signature
	if !utils.VerifyQRSignature(qr.Code, qr.Amount, qr.CreatorID, qr.Signature, s.config.SigningSecret) {
		return nil, apperrors.ErrQRInvalidSign
	}

	// Check expiry
	if time.Now().After(qr.ExpiresAt) {
		s.repo.UpdateStatus(ctx, qr.ID, constants.QRStatusExpired)
		return nil, apperrors.ErrQRExpired
	}

	// Check status
	if qr.Status == constants.QRStatusUsed {
		return nil, apperrors.ErrQRAlreadyUsed
	}
	if qr.Status != constants.QRStatusActive {
		return nil, apperrors.New("QR_NOT_ACTIVE", "QR code is not active")
	}

	// Cannot pay self
	if qr.CreatorID == payerID {
		return nil, apperrors.ErrCannotPaySelf
	}

	// 2. Lock payer wallet
	payerWallet, err := s.walletRepo.GetByUserIDForUpdate(ctx, tx, payerID)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to lock payer wallet")
	}
	if payerWallet == nil {
		return nil, apperrors.ErrWalletNotFound
	}
	if payerWallet.IsFrozen {
		return nil, apperrors.ErrWalletFrozen
	}
	if payerWallet.Balance < qr.Amount {
		return nil, apperrors.ErrInsufficientBalance
	}

	// 3. Lock payee wallet
	payeeWallet, err := s.walletRepo.GetByUserIDForUpdate(ctx, tx, qr.CreatorID)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to lock payee wallet")
	}
	if payeeWallet == nil {
		return nil, apperrors.New("PAYEE_WALLET_NOT_FOUND", "Payee wallet not found")
	}

	// 4. Generate transaction
	txCode := utils.GenerateTransactionCode("TRX")
	transaction := &wallet.Transaction{
		TransactionCode: txCode,
		IdempotencyKey:  req.IdempotencyKey,
		TransactionType: constants.TxTypeQRPayment,
		Status:          constants.TxStatusCompleted,
		FromWalletID:    sql.NullInt64{Int64: int64(payerWallet.ID), Valid: true},
		ToWalletID:      sql.NullInt64{Int64: int64(payeeWallet.ID), Valid: true},
		Amount:          qr.Amount,
		FeeAmount:       0,
		NetAmount:       qr.Amount,
		Description:     qr.Description,
		QRCodeID:        sql.NullInt64{Int64: int64(qr.ID), Valid: true},
		ProcessedAt:     sql.NullTime{Time: time.Now(), Valid: true},
	}

	if err := s.walletRepo.CreateTransaction(ctx, tx, transaction); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create transaction")
	}

	// 5. Debit payer
	if err := s.walletRepo.UpdateBalanceWithStats(ctx, tx, payerWallet.ID, qr.Amount, false); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to debit payer")
	}

	// 6. Credit payee
	if err := s.walletRepo.UpdateBalanceWithStats(ctx, tx, payeeWallet.ID, qr.Amount, true); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to credit payee")
	}

	// 7. Create ledger entries
	debitEntry := &wallet.WalletLedger{
		WalletID:      payerWallet.ID,
		TransactionID: sql.NullInt64{Int64: int64(transaction.ID), Valid: true},
		EntryType:     constants.LedgerDebit,
		Amount:        qr.Amount,
		BalanceBefore: payerWallet.Balance,
		BalanceAfter:  payerWallet.Balance - qr.Amount,
		Description:   "QR Payment",
		ReferenceType: constants.TxTypeQRPayment,
		ReferenceID:   qr.Code,
	}

	creditEntry := &wallet.WalletLedger{
		WalletID:      payeeWallet.ID,
		TransactionID: sql.NullInt64{Int64: int64(transaction.ID), Valid: true},
		EntryType:     constants.LedgerCredit,
		Amount:        qr.Amount,
		BalanceBefore: payeeWallet.Balance,
		BalanceAfter:  payeeWallet.Balance + qr.Amount,
		Description:   "QR Payment Received",
		ReferenceType: constants.TxTypeQRPayment,
		ReferenceID:   qr.Code,
	}

	if err := s.walletRepo.CreateLedgerEntry(ctx, tx, debitEntry); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create debit ledger")
	}
	if err := s.walletRepo.CreateLedgerEntry(ctx, tx, creditEntry); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create credit ledger")
	}

	// 8. Mark QR as used
	if err := s.repo.MarkAsUsed(ctx, tx, qr.ID, payerID); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to mark QR as used")
	}

	// 9. Commit
	if err := tx.Commit(); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to commit transaction")
	}

	description := ""
	if qr.Description.Valid {
		description = qr.Description.String
	}

	return &PaymentResultResponse{
		TransactionID:   transaction.ID,
		TransactionCode: txCode,
		Amount:          qr.Amount,
		Description:     description,
		YourNewBalance:  payerWallet.Balance - qr.Amount,
		ProcessedAt:     time.Now().Format(time.RFC3339),
	}, nil
}

func (s *Service) generateQRImage(code string) (string, error) {
	png, err := qrcode.Encode(code, qrcode.Medium, 256)
	if err != nil {
		return "", err
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(png), nil
}
