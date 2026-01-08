package errors

import "fmt"

// AppError is a custom error type for application errors
type AppError struct {
	Code    string
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s - %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// Error constructors
func New(code, message string) *AppError {
	return &AppError{Code: code, Message: message}
}

func Wrap(err error, code, message string) *AppError {
	return &AppError{Code: code, Message: message, Err: err}
}

// Common errors
var (
	ErrNotFound           = New("NOT_FOUND", "Resource not found")
	ErrUnauthorized       = New("UNAUTHORIZED", "Unauthorized access")
	ErrForbidden          = New("FORBIDDEN", "Access forbidden")
	ErrBadRequest         = New("BAD_REQUEST", "Invalid request")
	ErrInternalServer     = New("INTERNAL_ERROR", "Internal server error")
	ErrInvalidCredentials = New("INVALID_CREDENTIALS", "Invalid username or password")

	// Wallet errors
	ErrInsufficientBalance = New("INSUFFICIENT_BALANCE", "Insufficient balance")
	ErrWalletFrozen        = New("WALLET_FROZEN", "Wallet is frozen")
	ErrWalletNotFound      = New("WALLET_NOT_FOUND", "Wallet not found")

	// QR errors
	ErrQRNotFound    = New("QR_NOT_FOUND", "QR Code not found")
	ErrQRExpired     = New("QR_EXPIRED", "QR Code has expired")
	ErrQRAlreadyUsed = New("QR_ALREADY_USED", "QR Code has already been used")
	ErrQRInvalidSign = New("QR_INVALID_SIGNATURE", "Invalid QR Code signature")
	ErrCannotPaySelf = New("CANNOT_PAY_SELF", "Cannot pay to your own QR Code")

	// Transaction errors
	ErrDuplicateTransaction = New("DUPLICATE_TRANSACTION", "Transaction already processed")
	ErrTransactionFailed    = New("TRANSACTION_FAILED", "Transaction failed")
)
