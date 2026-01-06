package models

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID              string     `gorm:"primaryKey;size:36" json:"id"`
	Email           string     `gorm:"uniqueIndex;size:100;not null" json:"email"`
	Password        string     `gorm:"size:255;not null" json:"-"`
	Name            string     `gorm:"size:100;not null" json:"name"`
	Role            string     `gorm:"size:20;not null" json:"role"` // admin, dosen, mahasiswa
	NimNip          *string    `gorm:"uniqueIndex;size:20" json:"nim_nip,omitempty"`
	Phone           *string    `gorm:"size:20" json:"phone,omitempty"`
	AvatarURL       *string    `gorm:"size:255" json:"avatar_url,omitempty"`
	Status          string     `gorm:"size:20;default:active" json:"status"` // active, inactive, suspended
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	// Relations
	Wallet *Wallet `gorm:"foreignKey:UserID" json:"wallet,omitempty"`
}

func (User) TableName() string {
	return "users"
}

// Wallet represents a user's wallet
type Wallet struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	UserID        string    `gorm:"uniqueIndex;size:36;not null" json:"user_id"`
	Balance       float64   `gorm:"type:decimal(15,2);not null;default:0" json:"balance"`
	LockedBalance float64   `gorm:"type:decimal(15,2);not null;default:0" json:"locked_balance"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relations
	User    *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Ledgers []Ledger `gorm:"foreignKey:WalletID" json:"ledgers,omitempty"`
}

func (Wallet) TableName() string {
	return "wallets"
}

// Ledger represents an immutable ledger entry
type Ledger struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	WalletID      string    `gorm:"index;size:36;not null" json:"wallet_id"`
	TransactionID *string   `gorm:"index;size:36" json:"transaction_id,omitempty"`
	Type          string    `gorm:"size:10;not null" json:"type"` // DEBIT, CREDIT
	Amount        float64   `gorm:"type:decimal(15,2);not null" json:"amount"`
	BalanceBefore float64   `gorm:"type:decimal(15,2);not null" json:"balance_before"`
	BalanceAfter  float64   `gorm:"type:decimal(15,2);not null" json:"balance_after"`
	Description   *string   `gorm:"size:255" json:"description,omitempty"`
	ReferenceType *string   `gorm:"size:50" json:"reference_type,omitempty"`
	ReferenceID   *string   `gorm:"size:36" json:"reference_id,omitempty"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	Wallet      *Wallet      `gorm:"foreignKey:WalletID" json:"wallet,omitempty"`
	Transaction *Transaction `gorm:"foreignKey:TransactionID" json:"transaction,omitempty"`
}

func (Ledger) TableName() string {
	return "ledgers"
}

// Transaction represents a transaction record
type Transaction struct {
	ID             string    `gorm:"primaryKey;size:36" json:"id"`
	SenderID       *string   `gorm:"index;size:36" json:"sender_id,omitempty"`
	ReceiverID     *string   `gorm:"index;size:36" json:"receiver_id,omitempty"`
	QRCodeID       *string   `gorm:"index;size:36" json:"qr_code_id,omitempty"`
	OrderID        *string   `gorm:"index;size:36" json:"order_id,omitempty"`
	Amount         float64   `gorm:"type:decimal(15,2);not null" json:"amount"`
	Type           string    `gorm:"size:20;not null" json:"type"`          // QR_PAYMENT, MISSION_REWARD, TOP_UP, PURCHASE, TRANSFER, SYNC, CORRECTION
	Status         string    `gorm:"size:20;default:PENDING" json:"status"` // PENDING, SUCCESS, FAILED, CANCELLED, EXPIRED
	IdempotencyKey *string   `gorm:"uniqueIndex;size:100" json:"idempotency_key,omitempty"`
	Description    *string   `gorm:"size:255" json:"description,omitempty"`
	Metadata       *string   `gorm:"type:json" json:"metadata,omitempty"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relations
	Sender   *User   `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Receiver *User   `gorm:"foreignKey:ReceiverID" json:"receiver,omitempty"`
	QRCode   *QRCode `gorm:"foreignKey:QRCodeID" json:"qr_code,omitempty"`
}

func (Transaction) TableName() string {
	return "transactions"
}

// QRCode represents a QR code for payment
type QRCode struct {
	ID            string     `gorm:"primaryKey;size:36" json:"id"`
	UserID        string     `gorm:"index;size:36;not null" json:"user_id"`
	OrderID       *string    `gorm:"index;size:36" json:"order_id,omitempty"`
	TransactionID *string    `gorm:"index;size:36" json:"transaction_id,omitempty"`
	Code          string     `gorm:"uniqueIndex;size:255;not null" json:"code"`
	Amount        float64    `gorm:"type:decimal(15,2);not null" json:"amount"`
	Type          string     `gorm:"size:20;not null" json:"type"`         // PAYMENT, CHECKOUT
	Status        string     `gorm:"size:20;default:ACTIVE" json:"status"` // ACTIVE, USED, EXPIRED, CANCELLED
	Signature     string     `gorm:"size:255;not null" json:"-"`
	Description   *string    `gorm:"size:255" json:"description,omitempty"`
	ExpiresAt     time.Time  `gorm:"not null" json:"expires_at"`
	UsedAt        *time.Time `json:"used_at,omitempty"`
	CreatedAt     time.Time  `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	User        *User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Transaction *Transaction `gorm:"foreignKey:TransactionID" json:"transaction,omitempty"`
}

func (QRCode) TableName() string {
	return "qr_codes"
}

// Product represents a digital product
type Product struct {
	ID           string    `gorm:"primaryKey;size:36" json:"id"`
	SellerID     string    `gorm:"index;size:36;not null" json:"seller_id"`
	Name         string    `gorm:"size:200;not null" json:"name"`
	Description  *string   `gorm:"type:text" json:"description,omitempty"`
	Price        float64   `gorm:"type:decimal(15,2);not null" json:"price"`
	Category     string    `gorm:"size:20;not null" json:"category"` // ebook, ecourse, material, other
	ThumbnailURL *string   `gorm:"size:500" json:"thumbnail_url,omitempty"`
	FileURL      *string   `gorm:"size:500" json:"file_url,omitempty"`
	Stock        int       `gorm:"default:-1" json:"stock"` // -1 means unlimited
	TotalSold    int       `gorm:"default:0" json:"total_sold"`
	Status       string    `gorm:"size:20;default:active" json:"status"` // active, inactive, deleted
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relations
	Seller *User `gorm:"foreignKey:SellerID" json:"seller,omitempty"`
}

func (Product) TableName() string {
	return "products"
}

// Order represents a customer order
type Order struct {
	ID            string     `gorm:"primaryKey;size:36" json:"id"`
	BuyerID       string     `gorm:"index;size:36;not null" json:"buyer_id"`
	TransactionID *string    `gorm:"index;size:36" json:"transaction_id,omitempty"`
	QRCodeID      *string    `gorm:"index;size:36" json:"qr_code_id,omitempty"`
	TotalAmount   float64    `gorm:"type:decimal(15,2);not null" json:"total_amount"`
	Status        string     `gorm:"size:20;default:PENDING" json:"status"` // PENDING, PAID, CANCELLED, REFUNDED, EXPIRED
	Notes         *string    `gorm:"type:text" json:"notes,omitempty"`
	PaidAt        *time.Time `json:"paid_at,omitempty"`
	CreatedAt     time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	// Relations
	Buyer       *User        `gorm:"foreignKey:BuyerID" json:"buyer,omitempty"`
	Items       []OrderItem  `gorm:"foreignKey:OrderID" json:"items,omitempty"`
	QRCode      *QRCode      `gorm:"foreignKey:QRCodeID" json:"qr_code,omitempty"`
	Transaction *Transaction `gorm:"foreignKey:TransactionID" json:"transaction,omitempty"`
}

func (Order) TableName() string {
	return "orders"
}

// OrderItem represents an item in an order
type OrderItem struct {
	ID        string    `gorm:"primaryKey;size:36" json:"id"`
	OrderID   string    `gorm:"index;size:36;not null" json:"order_id"`
	ProductID string    `gorm:"index;size:36;not null" json:"product_id"`
	SellerID  string    `gorm:"index;size:36;not null" json:"seller_id"`
	Quantity  int       `gorm:"not null;default:1" json:"quantity"`
	Price     float64   `gorm:"type:decimal(15,2);not null" json:"price"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	Order   *Order   `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Seller  *User    `gorm:"foreignKey:SellerID" json:"seller,omitempty"`
}

func (OrderItem) TableName() string {
	return "order_items"
}

// Mission represents a learning mission
type Mission struct {
	ID                  string     `gorm:"primaryKey;size:36" json:"id"`
	CreatorID           string     `gorm:"index;size:36;not null" json:"creator_id"`
	Title               string     `gorm:"size:200;not null" json:"title"`
	Description         *string    `gorm:"type:text" json:"description,omitempty"`
	PointsReward        float64    `gorm:"type:decimal(15,2);not null" json:"points_reward"`
	MaxParticipants     int        `gorm:"default:-1" json:"max_participants"` // -1 means unlimited
	CurrentParticipants int        `gorm:"default:0" json:"current_participants"`
	Type                string     `gorm:"size:20;not null" json:"type"`        // daily, weekly, special, course
	Status              string     `gorm:"size:20;default:draft" json:"status"` // draft, active, completed, cancelled
	StartDate           *time.Time `json:"start_date,omitempty"`
	EndDate             *time.Time `json:"end_date,omitempty"`
	Requirements        *string    `gorm:"type:json" json:"requirements,omitempty"`
	CreatedAt           time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt           time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	// Relations
	Creator  *User             `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
	Progress []MissionProgress `gorm:"foreignKey:MissionID" json:"progress,omitempty"`
}

func (Mission) TableName() string {
	return "missions"
}

// MissionProgress represents user progress on a mission
type MissionProgress struct {
	ID           string     `gorm:"primaryKey;size:36" json:"id"`
	UserID       string     `gorm:"index;size:36;not null" json:"user_id"`
	MissionID    string     `gorm:"index;size:36;not null" json:"mission_id"`
	Status       string     `gorm:"size:20;default:IN_PROGRESS" json:"status"` // IN_PROGRESS, COMPLETED, FAILED, CLAIMED
	ProgressData *string    `gorm:"type:json" json:"progress_data,omitempty"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	ClaimedAt    *time.Time `json:"claimed_at,omitempty"`
	CreatedAt    time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	// Relations
	User    *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Mission *Mission `gorm:"foreignKey:MissionID" json:"mission,omitempty"`
}

func (MissionProgress) TableName() string {
	return "mission_progress"
}

// AuditLog represents an audit trail entry
type AuditLog struct {
	ID         string    `gorm:"primaryKey;size:36" json:"id"`
	UserID     *string   `gorm:"index;size:36" json:"user_id,omitempty"`
	Action     string    `gorm:"size:100;not null" json:"action"`
	EntityType string    `gorm:"index;size:50;not null" json:"entity_type"`
	EntityID   *string   `gorm:"index;size:36" json:"entity_id,omitempty"`
	OldValue   *string   `gorm:"type:json" json:"old_value,omitempty"`
	NewValue   *string   `gorm:"type:json" json:"new_value,omitempty"`
	IPAddress  *string   `gorm:"size:45" json:"ip_address,omitempty"`
	UserAgent  *string   `gorm:"type:text" json:"user_agent,omitempty"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (AuditLog) TableName() string {
	return "audit_logs"
}

// RefreshToken represents a JWT refresh token
type RefreshToken struct {
	ID         string     `gorm:"primaryKey;size:36" json:"id"`
	UserID     string     `gorm:"index;size:36;not null" json:"user_id"`
	Token      string     `gorm:"uniqueIndex;size:500;not null" json:"-"`
	DeviceInfo *string    `gorm:"size:255" json:"device_info,omitempty"`
	IPAddress  *string    `gorm:"size:45" json:"ip_address,omitempty"`
	ExpiresAt  time.Time  `gorm:"not null" json:"expires_at"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
	CreatedAt  time.Time  `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (RefreshToken) TableName() string {
	return "refresh_tokens"
}

// SyncLog represents a sync log entry
type SyncLog struct {
	ID              string    `gorm:"primaryKey;size:36" json:"id"`
	ExternalSystem  string    `gorm:"index;size:100;not null" json:"external_system"`
	ExternalUserID  *string   `gorm:"index;size:100" json:"external_user_id,omitempty"`
	InternalUserID  *string   `gorm:"index;size:36" json:"internal_user_id,omitempty"`
	ReferenceID     *string   `gorm:"index;size:100" json:"reference_id,omitempty"`
	PointsSynced    *float64  `gorm:"type:decimal(15,2)" json:"points_synced,omitempty"`
	Status          string    `gorm:"size:20;not null" json:"status"` // SUCCESS, FAILED, DUPLICATE
	ErrorMessage    *string   `gorm:"type:text" json:"error_message,omitempty"`
	RequestPayload  *string   `gorm:"type:json" json:"request_payload,omitempty"`
	ResponsePayload *string   `gorm:"type:json" json:"response_payload,omitempty"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	InternalUser *User `gorm:"foreignKey:InternalUserID" json:"internal_user,omitempty"`
}

func (SyncLog) TableName() string {
	return "sync_logs"
}
