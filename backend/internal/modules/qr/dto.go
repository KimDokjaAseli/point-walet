package qr

import "time"

// CreateQRRequest for creating QR code
type CreateQRRequest struct {
	Amount      int64  `json:"amount"`
	Description string `json:"description"`
	Type        string `json:"type"` // PAYMENT or PRODUCT
	ProductID   *uint  `json:"product_id,omitempty"`
}

func (r *CreateQRRequest) Validate() []ValidationError {
	var errors []ValidationError
	if r.Amount <= 0 {
		errors = append(errors, ValidationError{Field: "amount", Message: "Amount must be positive"})
	}
	if r.Type == "" {
		r.Type = "PAYMENT"
	}
	if r.Type != "PAYMENT" && r.Type != "PRODUCT" {
		errors = append(errors, ValidationError{Field: "type", Message: "Type must be PAYMENT or PRODUCT"})
	}
	if r.Type == "PRODUCT" && r.ProductID == nil {
		errors = append(errors, ValidationError{Field: "product_id", Message: "Product ID is required for PRODUCT type"})
	}
	return errors
}

// ProcessQRRequest for processing QR payment
type ProcessQRRequest struct {
	QRCode         string `json:"qr_code"`
	IdempotencyKey string `json:"idempotency_key"`
}

func (r *ProcessQRRequest) Validate() []ValidationError {
	var errors []ValidationError
	if r.QRCode == "" {
		errors = append(errors, ValidationError{Field: "qr_code", Message: "QR code is required"})
	}
	if r.IdempotencyKey == "" {
		errors = append(errors, ValidationError{Field: "idempotency_key", Message: "Idempotency key is required"})
	}
	return errors
}

// ValidationError for validation errors
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// QRCodeResponse for QR code details
type QRCodeResponse struct {
	ID            uint   `json:"id"`
	Code          string `json:"code"`
	QRType        string `json:"qr_type"`
	Amount        int64  `json:"amount"`
	Description   string `json:"description,omitempty"`
	Status        string `json:"status"`
	QRImageBase64 string `json:"qr_image_base64,omitempty"`
	QRImageURL    string `json:"qr_image_url,omitempty"`
	ExpiresAt     string `json:"expires_at"`
	CreatedAt     string `json:"created_at"`
	RemainingTime int64  `json:"remaining_time_seconds,omitempty"`
}

// PaymentResultResponse for payment result
type PaymentResultResponse struct {
	TransactionID   uint   `json:"transaction_id"`
	TransactionCode string `json:"transaction_code"`
	Amount          int64  `json:"amount"`
	Description     string `json:"description,omitempty"`
	PayeeName       string `json:"payee_name"`
	YourNewBalance  int64  `json:"your_new_balance"`
	ProcessedAt     string `json:"processed_at"`
}

// MyQRListResponse for listing user's QRs
type MyQRListResponse struct {
	ID          uint   `json:"id"`
	Code        string `json:"code"`
	QRType      string `json:"qr_type"`
	Amount      int64  `json:"amount"`
	Description string `json:"description,omitempty"`
	Status      string `json:"status"`
	ExpiresAt   string `json:"expires_at"`
	CreatedAt   string `json:"created_at"`
	ScannedAt   string `json:"scanned_at,omitempty"`
}

// ToQRCodeResponse converts QRCode to response
func ToQRCodeResponse(qr *QRCode, imageBase64 string) QRCodeResponse {
	resp := QRCodeResponse{
		ID:            qr.ID,
		Code:          qr.Code,
		QRType:        qr.QRType,
		Amount:        qr.Amount,
		Status:        qr.Status,
		QRImageBase64: imageBase64,
		ExpiresAt:     qr.ExpiresAt.Format(time.RFC3339),
		CreatedAt:     qr.CreatedAt.Format(time.RFC3339),
	}
	if qr.Description.Valid {
		resp.Description = qr.Description.String
	}

	// Calculate remaining time
	remaining := time.Until(qr.ExpiresAt).Seconds()
	if remaining > 0 {
		resp.RemainingTime = int64(remaining)
	}

	return resp
}

// ToMyQRListResponse converts QRCode to list response
func ToMyQRListResponse(qr *QRCode) MyQRListResponse {
	resp := MyQRListResponse{
		ID:        qr.ID,
		Code:      qr.Code,
		QRType:    qr.QRType,
		Amount:    qr.Amount,
		Status:    qr.Status,
		ExpiresAt: qr.ExpiresAt.Format(time.RFC3339),
		CreatedAt: qr.CreatedAt.Format(time.RFC3339),
	}
	if qr.Description.Valid {
		resp.Description = qr.Description.String
	}
	if qr.ScannedAt.Valid {
		resp.ScannedAt = qr.ScannedAt.Time.Format(time.RFC3339)
	}
	return resp
}
