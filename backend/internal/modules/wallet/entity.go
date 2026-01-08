package wallet

import (
	"database/sql"
	"time"
)

// Wallet entity
type Wallet struct {
	ID             uint
	UserID         uint
	Balance        int64
	LockedBalance  int64
	LifetimeEarned int64
	LifetimeSpent  int64
	IsFrozen       bool
	FrozenReason   sql.NullString
	FrozenAt       sql.NullTime
	FrozenBy       sql.NullInt64
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// WalletLedger entity
type WalletLedger struct {
	ID            uint
	WalletID      uint
	TransactionID sql.NullInt64
	EntryType     string // CREDIT or DEBIT
	Amount        int64
	BalanceBefore int64
	BalanceAfter  int64
	Description   string
	ReferenceType string
	ReferenceID   string
	Metadata      sql.NullString
	CreatedAt     time.Time
}

// Transaction entity
type Transaction struct {
	ID                    uint
	TransactionCode       string
	IdempotencyKey        string
	TransactionType       string
	Status                string
	FromWalletID          sql.NullInt64
	ToWalletID            sql.NullInt64
	Amount                int64
	FeeAmount             int64
	NetAmount             int64
	Description           sql.NullString
	QRCodeID              sql.NullInt64
	OrderID               sql.NullInt64
	MissionLogID          sql.NullInt64
	TopupID               sql.NullInt64
	ExternalTransactionID sql.NullInt64
	ProcessedAt           sql.NullTime
	FailedAt              sql.NullTime
	FailureReason         sql.NullString
	Metadata              sql.NullString
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

// WalletWithUser includes user info
type WalletWithUser struct {
	Wallet
	Username string
	FullName string
	Email    string
	RoleName string
}
