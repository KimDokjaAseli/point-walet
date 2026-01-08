package qr

import (
	"database/sql"
	"time"
)

// QRCode entity
type QRCode struct {
	ID          uint
	Code        string
	QRType      string
	CreatorID   uint
	Amount      int64
	Description sql.NullString
	ProductID   sql.NullInt64
	OrderID     sql.NullInt64
	Signature   string
	Status      string
	IsSingleUse bool
	MaxUses     int
	CurrentUses int
	ScannedBy   sql.NullInt64
	ScannedAt   sql.NullTime
	ExpiresAt   time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// QRCodeWithCreator includes creator info
type QRCodeWithCreator struct {
	QRCode
	CreatorName string
	CreatorRole string
}
