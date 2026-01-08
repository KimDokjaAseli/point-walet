package auth

import (
	"database/sql"
	"time"
)

// User entity
type User struct {
	ID              uint
	Username        string
	Email           string
	PasswordHash    string
	FullName        string
	NimNip          sql.NullString
	Phone           sql.NullString
	AvatarURL       sql.NullString
	IsActive        bool
	EmailVerifiedAt sql.NullTime
	LastLoginAt     sql.NullTime
	CreatedAt       time.Time
	UpdatedAt       time.Time
	DeletedAt       sql.NullTime
}

// Role entity
type Role struct {
	ID          uint
	Name        string
	DisplayName string
	Description sql.NullString
	IsSystem    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// UserRole entity
type UserRole struct {
	ID         uint
	UserID     uint
	RoleID     uint
	AssignedBy sql.NullInt64
	AssignedAt time.Time
	ExpiresAt  sql.NullTime
}

// Session entity
type Session struct {
	ID             uint
	UserID         uint
	TokenHash      string
	DeviceInfo     sql.NullString
	IPAddress      sql.NullString
	IsActive       bool
	CreatedAt      time.Time
	ExpiresAt      time.Time
	LastActivityAt time.Time
	RevokedAt      sql.NullTime
	RevokedReason  sql.NullString
}

// UserWithRole combines user data with role
type UserWithRole struct {
	User
	RoleName string
}
