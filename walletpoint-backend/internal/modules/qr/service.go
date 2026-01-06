package qr

import (
	"context"
	"errors"
	"fmt"
	"time"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Common errors
var (
	ErrQRNotFound           = errors.New("QR code not found")
	ErrQRExpired            = errors.New("QR code expired")
	ErrQRAlreadyUsed        = errors.New("QR code already used")
	ErrQRInvalidSignature   = errors.New("QR code signature invalid")
	ErrQRInactive           = errors.New("QR code is not active")
	ErrCannotPaySelf        = errors.New("cannot pay to yourself")
	ErrInsufficientBalance  = errors.New("insufficient balance")
	ErrDuplicateTransaction = errors.New("duplicate transaction")
)

// WalletService interface for wallet operations
type WalletService interface {
	TransferPoints(ctx context.Context, senderID, receiverID string, amount float64, txType, description, idempotencyKey string) (*models.Transaction, error)
	GetWallet(ctx context.Context, userID string) (*models.Wallet, error)
}

// Service handles QR business logic
type Service struct {
	repo          *Repository
	config        *config.Config
	walletService WalletService
}

// NewService creates a new QR service
func NewService(repo *Repository, cfg *config.Config, walletSvc WalletService) *Service {
	return &Service{
		repo:          repo,
		config:        cfg,
		walletService: walletSvc,
	}
}

// GenerateQR generates a QR code for payment
func (s *Service) GenerateQR(ctx context.Context, userID string, req GenerateQRRequest) (*QRCodeDTO, error) {
	// Generate unique code
	code := utils.GenerateQRCode()

	// Calculate expiry (10 minutes)
	expiresAt := time.Now().Add(time.Duration(s.config.QRExpiryMinutes) * time.Minute)

	// Create signature
	payload := fmt.Sprintf("%s:%s:%.2f:%d", code, userID, req.Amount, expiresAt.Unix())
	signature := utils.CreateHMACSignature(payload, s.config.QRSecretKey)

	// Create QR record
	qr := &models.QRCode{
		UserID:      userID,
		Code:        code,
		Amount:      req.Amount,
		Type:        "PAYMENT",
		Status:      "ACTIVE",
		Signature:   signature,
		Description: &req.Description,
		ExpiresAt:   expiresAt,
	}

	if err := s.repo.Create(ctx, qr); err != nil {
		return nil, err
	}

	return &QRCodeDTO{
		ID:          qr.ID,
		Code:        qr.Code,
		Amount:      qr.Amount,
		Type:        qr.Type,
		Status:      qr.Status,
		Description: utils.Deref(qr.Description, ""),
		ExpiresAt:   qr.ExpiresAt.Format(time.RFC3339),
		CreatedAt:   qr.CreatedAt.Format(time.RFC3339),
	}, nil
}

// GenerateCheckoutQR generates a QR code for checkout
func (s *Service) GenerateCheckoutQR(ctx context.Context, userID, orderID string, amount float64) (*QRCodeDTO, error) {
	code := utils.GenerateQRCode()
	expiresAt := time.Now().Add(time.Duration(s.config.QRExpiryMinutes) * time.Minute)

	payload := fmt.Sprintf("%s:%s:%.2f:%d", code, userID, amount, expiresAt.Unix())
	signature := utils.CreateHMACSignature(payload, s.config.QRSecretKey)

	desc := "Checkout payment"
	qr := &models.QRCode{
		UserID:      userID,
		OrderID:     &orderID,
		Code:        code,
		Amount:      amount,
		Type:        "CHECKOUT",
		Status:      "ACTIVE",
		Signature:   signature,
		Description: &desc,
		ExpiresAt:   expiresAt,
	}

	if err := s.repo.Create(ctx, qr); err != nil {
		return nil, err
	}

	return &QRCodeDTO{
		ID:        qr.ID,
		Code:      qr.Code,
		Amount:    qr.Amount,
		Type:      qr.Type,
		Status:    qr.Status,
		ExpiresAt: qr.ExpiresAt.Format(time.RFC3339),
		CreatedAt: qr.CreatedAt.Format(time.RFC3339),
	}, nil
}

// ProcessPayment processes a QR payment
func (s *Service) ProcessPayment(ctx context.Context, scannerID string, req ScanQRRequest) (*PaymentResultDTO, error) {
	// Get idempotency key
	idempotencyKey := req.IdempotencyKey
	if idempotencyKey == "" {
		idempotencyKey = fmt.Sprintf("qr_%s_%s_%d", scannerID, req.QRCode, time.Now().Unix())
	}

	// Get QR code
	qr, err := s.repo.GetByCode(ctx, req.QRCode)
	if err != nil {
		return nil, err
	}
	if qr == nil {
		return nil, ErrQRNotFound
	}

	// Validate QR
	if err := s.validateQR(qr, scannerID); err != nil {
		return nil, err
	}

	// Process payment via wallet service
	transaction, err := s.walletService.TransferPoints(
		ctx,
		scannerID,
		qr.UserID,
		qr.Amount,
		"QR_PAYMENT",
		fmt.Sprintf("QR Payment - %s", qr.Code),
		idempotencyKey,
	)

	if err != nil {
		if err.Error() == "duplicate transaction" {
			return &PaymentResultDTO{
				TransactionID: transaction.ID,
				Status:        "SUCCESS",
				IsDuplicate:   true,
			}, nil
		}
		if err.Error() == "insufficient balance" {
			return nil, ErrInsufficientBalance
		}
		return nil, err
	}

	// Update QR status
	s.repo.UpdateTransactionID(ctx, nil, qr.ID, transaction.ID)

	// Get updated wallet balance
	wallet, _ := s.walletService.GetWallet(ctx, scannerID)
	balanceAfter := float64(0)
	if wallet != nil {
		balanceAfter = wallet.Balance
	}

	return &PaymentResultDTO{
		TransactionID: transaction.ID,
		Amount:        transaction.Amount,
		Status:        "SUCCESS",
		BalanceAfter:  balanceAfter,
		ReceiverID:    qr.UserID,
	}, nil
}

// validateQR validates a QR code
func (s *Service) validateQR(qr *models.QRCode, scannerID string) error {
	// Check if already used
	if qr.Status == "USED" {
		return ErrQRAlreadyUsed
	}

	// Check if expired
	if qr.Status == "EXPIRED" || time.Now().After(qr.ExpiresAt) {
		s.repo.UpdateStatus(context.Background(), nil, qr.ID, "EXPIRED")
		return ErrQRExpired
	}

	// Check if active
	if qr.Status != "ACTIVE" {
		return ErrQRInactive
	}

	// Verify signature
	payload := fmt.Sprintf("%s:%s:%.2f:%d", qr.Code, qr.UserID, qr.Amount, qr.ExpiresAt.Unix())
	if !utils.VerifyHMACSignature(payload, qr.Signature, s.config.QRSecretKey) {
		return ErrQRInvalidSignature
	}

	// Cannot pay to self
	if scannerID == qr.UserID {
		return ErrCannotPaySelf
	}

	return nil
}

// GetQRByID gets QR by ID
func (s *Service) GetQRByID(ctx context.Context, id string) (*QRCodeDTO, error) {
	qr, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if qr == nil {
		return nil, ErrQRNotFound
	}

	dto := &QRCodeDTO{
		ID:          qr.ID,
		Code:        qr.Code,
		Amount:      qr.Amount,
		Type:        qr.Type,
		Status:      qr.Status,
		Description: utils.Deref(qr.Description, ""),
		ExpiresAt:   qr.ExpiresAt.Format(time.RFC3339),
		CreatedAt:   qr.CreatedAt.Format(time.RFC3339),
	}

	if qr.UsedAt != nil {
		usedAt := qr.UsedAt.Format(time.RFC3339)
		dto.UsedAt = &usedAt
	}

	if qr.TransactionID != nil {
		dto.TransactionID = *qr.TransactionID
	}

	return dto, nil
}

// GetUserQRCodes gets QR codes for a user
func (s *Service) GetUserQRCodes(ctx context.Context, userID string, page, limit int) ([]QRCodeDTO, int64, error) {
	qrs, total, err := s.repo.GetByUserID(ctx, userID, page, limit)
	if err != nil {
		return nil, 0, err
	}

	dtos := make([]QRCodeDTO, len(qrs))
	for i, qr := range qrs {
		dtos[i] = QRCodeDTO{
			ID:          qr.ID,
			Code:        qr.Code,
			Amount:      qr.Amount,
			Type:        qr.Type,
			Status:      qr.Status,
			Description: utils.Deref(qr.Description, ""),
			ExpiresAt:   qr.ExpiresAt.Format(time.RFC3339),
			CreatedAt:   qr.CreatedAt.Format(time.RFC3339),
		}
	}

	return dtos, total, nil
}
