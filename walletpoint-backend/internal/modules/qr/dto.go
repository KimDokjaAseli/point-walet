package qr

// GenerateQRRequest represents generate QR request
type GenerateQRRequest struct {
	Amount      float64 `json:"amount" validate:"required,gt=0"`
	Description string  `json:"description"`
}

// ScanQRRequest represents scan QR request
type ScanQRRequest struct {
	QRCode         string `json:"qr_code" validate:"required"`
	IdempotencyKey string `json:"idempotency_key"`
}

// QRCodeDTO represents QR code data
type QRCodeDTO struct {
	ID            string  `json:"id"`
	Code          string  `json:"code"`
	Amount        float64 `json:"amount"`
	Type          string  `json:"type"`
	Status        string  `json:"status"`
	Description   string  `json:"description,omitempty"`
	TransactionID string  `json:"transaction_id,omitempty"`
	ExpiresAt     string  `json:"expires_at"`
	UsedAt        *string `json:"used_at,omitempty"`
	CreatedAt     string  `json:"created_at"`
}

// PaymentResultDTO represents payment result
type PaymentResultDTO struct {
	TransactionID string  `json:"transaction_id"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"`
	BalanceAfter  float64 `json:"balance_after"`
	ReceiverID    string  `json:"receiver_id,omitempty"`
	IsDuplicate   bool    `json:"is_duplicate,omitempty"`
}

// ReceiverDTO represents receiver info
type ReceiverDTO struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
