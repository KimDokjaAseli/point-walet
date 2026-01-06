package wallet

// WalletDTO represents wallet data transfer object
type WalletDTO struct {
	ID            string  `json:"id"`
	UserID        string  `json:"user_id"`
	Balance       float64 `json:"balance"`
	LockedBalance float64 `json:"locked_balance"`
	UpdatedAt     string  `json:"updated_at"`
}

// WalletSummary represents wallet summary
type WalletSummary struct {
	TotalCredit      float64 `json:"total_credit"`
	TotalDebit       float64 `json:"total_debit"`
	TransactionCount int     `json:"transaction_count"`
}

// WalletSummaryResponse represents wallet with summary
type WalletSummaryResponse struct {
	Wallet            WalletDTO     `json:"wallet"`
	Summary           WalletSummary `json:"summary"`
	LastTransactionAt *string       `json:"last_transaction_at,omitempty"`
}

// TransactionDTO represents transaction data transfer object
type TransactionDTO struct {
	ID           string        `json:"id"`
	Type         string        `json:"type"`
	Amount       float64       `json:"amount"`
	Direction    string        `json:"direction"` // DEBIT or CREDIT
	Status       string        `json:"status"`
	Description  string        `json:"description,omitempty"`
	Counterparty *UserBriefDTO `json:"counterparty,omitempty"`
	CreatedAt    string        `json:"created_at"`
}

// UserBriefDTO represents brief user info
type UserBriefDTO struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// LedgerDTO represents ledger data transfer object
type LedgerDTO struct {
	ID            string  `json:"id"`
	TransactionID string  `json:"transaction_id,omitempty"`
	Type          string  `json:"type"`
	Amount        float64 `json:"amount"`
	BalanceBefore float64 `json:"balance_before"`
	BalanceAfter  float64 `json:"balance_after"`
	Description   string  `json:"description,omitempty"`
	CreatedAt     string  `json:"created_at"`
}

// TransferRequest represents a transfer request
type TransferRequest struct {
	ReceiverID     string  `json:"receiver_id" validate:"required"`
	Amount         float64 `json:"amount" validate:"required,gt=0"`
	Description    string  `json:"description"`
	IdempotencyKey string  `json:"idempotency_key"`
}

// TopUpRequest represents a top-up request
type TopUpRequest struct {
	Amount         float64 `json:"amount" validate:"required,gt=0"`
	PaymentMethod  string  `json:"payment_method" validate:"required"`
	IdempotencyKey string  `json:"idempotency_key"`
}
