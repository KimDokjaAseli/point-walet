package wallet

import "time"

// BalanceResponse for balance endpoint
type BalanceResponse struct {
	UserID            uint   `json:"user_id"`
	Balance           int64  `json:"balance"`
	LockedBalance     int64  `json:"locked_balance"`
	LifetimeEarned    int64  `json:"lifetime_earned"`
	LifetimeSpent     int64  `json:"lifetime_spent"`
	IsFrozen          bool   `json:"is_frozen"`
	LastTransactionAt string `json:"last_transaction_at,omitempty"`
}

// TransferRequest for transfer endpoint
type TransferRequest struct {
	ToUserID       uint   `json:"to_user_id"`
	Amount         int64  `json:"amount"`
	Description    string `json:"description"`
	IdempotencyKey string `json:"idempotency_key"`
}

func (r *TransferRequest) Validate() []ValidationError {
	var errors []ValidationError
	if r.ToUserID == 0 {
		errors = append(errors, ValidationError{Field: "to_user_id", Message: "Recipient user ID is required"})
	}
	if r.Amount <= 0 {
		errors = append(errors, ValidationError{Field: "amount", Message: "Amount must be positive"})
	}
	if r.IdempotencyKey == "" {
		errors = append(errors, ValidationError{Field: "idempotency_key", Message: "Idempotency key is required"})
	}
	return errors
}

// AdjustBalanceRequest for admin balance adjustment
type AdjustBalanceRequest struct {
	UserID         uint   `json:"user_id"`
	Amount         int64  `json:"amount"` // positive for credit, negative for debit
	Reason         string `json:"reason"`
	IdempotencyKey string `json:"idempotency_key"`
}

func (r *AdjustBalanceRequest) Validate() []ValidationError {
	var errors []ValidationError
	if r.UserID == 0 {
		errors = append(errors, ValidationError{Field: "user_id", Message: "User ID is required"})
	}
	if r.Amount == 0 {
		errors = append(errors, ValidationError{Field: "amount", Message: "Amount cannot be zero"})
	}
	if r.Reason == "" {
		errors = append(errors, ValidationError{Field: "reason", Message: "Reason is required for adjustment"})
	}
	if r.IdempotencyKey == "" {
		errors = append(errors, ValidationError{Field: "idempotency_key", Message: "Idempotency key is required"})
	}
	return errors
}

// TransactionResponse for transaction details
type TransactionResponse struct {
	ID              uint   `json:"id"`
	TransactionCode string `json:"transaction_code"`
	TransactionType string `json:"transaction_type"`
	Status          string `json:"status"`
	Amount          int64  `json:"amount"`
	NetAmount       int64  `json:"net_amount"`
	Description     string `json:"description,omitempty"`
	Direction       string `json:"direction"` // CREDIT or DEBIT
	CounterpartyID  *uint  `json:"counterparty_id,omitempty"`
	Counterparty    string `json:"counterparty,omitempty"`
	CreatedAt       string `json:"created_at"`
	ProcessedAt     string `json:"processed_at,omitempty"`
}

// LedgerEntryResponse for ledger details
type LedgerEntryResponse struct {
	ID            uint   `json:"id"`
	EntryType     string `json:"entry_type"`
	Amount        int64  `json:"amount"`
	BalanceBefore int64  `json:"balance_before"`
	BalanceAfter  int64  `json:"balance_after"`
	Description   string `json:"description"`
	ReferenceType string `json:"reference_type"`
	ReferenceID   string `json:"reference_id"`
	CreatedAt     string `json:"created_at"`
}

// TransferResponse for transfer result
type TransferResponse struct {
	TransactionID   uint   `json:"transaction_id"`
	TransactionCode string `json:"transaction_code"`
	Amount          int64  `json:"amount"`
	ToUser          string `json:"to_user"`
	YourNewBalance  int64  `json:"your_new_balance"`
	CreatedAt       string `json:"created_at"`
}

// HistoryParams for pagination
type HistoryParams struct {
	Page    int
	PerPage int
	Type    string // filter by transaction type
}

// ValidationError for validation errors
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ToTransactionResponse converts Transaction entity to response
func ToTransactionResponse(t *Transaction, direction string, counterparty string) TransactionResponse {
	resp := TransactionResponse{
		ID:              t.ID,
		TransactionCode: t.TransactionCode,
		TransactionType: t.TransactionType,
		Status:          t.Status,
		Amount:          t.Amount,
		NetAmount:       t.NetAmount,
		Direction:       direction,
		Counterparty:    counterparty,
		CreatedAt:       t.CreatedAt.Format(time.RFC3339),
	}
	if t.Description.Valid {
		resp.Description = t.Description.String
	}
	if t.ProcessedAt.Valid {
		resp.ProcessedAt = t.ProcessedAt.Time.Format(time.RFC3339)
	}
	return resp
}

// ToLedgerResponse converts WalletLedger entity to response
func ToLedgerResponse(l *WalletLedger) LedgerEntryResponse {
	return LedgerEntryResponse{
		ID:            l.ID,
		EntryType:     l.EntryType,
		Amount:        l.Amount,
		BalanceBefore: l.BalanceBefore,
		BalanceAfter:  l.BalanceAfter,
		Description:   l.Description,
		ReferenceType: l.ReferenceType,
		ReferenceID:   l.ReferenceID,
		CreatedAt:     l.CreatedAt.Format(time.RFC3339),
	}
}
