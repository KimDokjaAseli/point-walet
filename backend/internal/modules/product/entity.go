package product

import (
	"database/sql"
	"time"
)

// Product entity
type Product struct {
	ID           uint
	SellerID     uint
	Name         string
	Description  sql.NullString
	ProductType  string
	Price        int64
	Stock        sql.NullInt64
	IsUnlimited  bool
	ThumbnailURL sql.NullString
	FileURL      sql.NullString
	PreviewURL   sql.NullString
	SoldCount    int
	IsActive     bool
	IsFeatured   bool
	Metadata     sql.NullString
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    sql.NullTime
}

// Order entity
type Order struct {
	ID             uint
	OrderCode      string
	BuyerID        uint
	SellerID       uint
	ProductID      uint
	Quantity       int
	UnitPrice      int64
	TotalPrice     int64
	DiscountAmount int64
	FinalPrice     int64
	Status         string
	TransactionID  sql.NullInt64
	QRCodeID       sql.NullInt64
	DeliveredAt    sql.NullTime
	CompletedAt    sql.NullTime
	CancelledAt    sql.NullTime
	CancelReason   sql.NullString
	Notes          sql.NullString
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// ProductWithSeller includes seller info
type ProductWithSeller struct {
	Product
	SellerName string
}

// OrderWithDetails includes product and user info
type OrderWithDetails struct {
	Order
	ProductName string
	BuyerName   string
	SellerName  string
}
