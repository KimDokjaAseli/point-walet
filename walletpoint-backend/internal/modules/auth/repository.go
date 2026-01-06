package auth

import (
	"context"
	"errors"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Repository handles auth database operations
type Repository struct {
	db *gorm.DB
}

// NewRepository creates a new auth repository
func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// GetUserByEmail gets user by email
func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// GetUserByEmailAndRole gets user by email and role
func (r *Repository) GetUserByEmailAndRole(ctx context.Context, email, role string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ? AND role = ?", email, role).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// GetUserByID gets user by ID
func (r *Repository) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// CreateUser creates a new user
func (r *Repository) CreateUser(ctx context.Context, user *models.User) error {
	user.ID = utils.GenerateUUID()
	return r.db.WithContext(ctx).Create(user).Error
}

// CreateRefreshToken creates a new refresh token
func (r *Repository) CreateRefreshToken(ctx context.Context, token *models.RefreshToken) error {
	token.ID = utils.GenerateUUID()
	return r.db.WithContext(ctx).Create(token).Error
}

// GetRefreshToken gets refresh token
func (r *Repository) GetRefreshToken(ctx context.Context, token string) (*models.RefreshToken, error) {
	var refreshToken models.RefreshToken
	err := r.db.WithContext(ctx).Where("token = ? AND revoked_at IS NULL", token).First(&refreshToken).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &refreshToken, nil
}

// RevokeRefreshToken revokes a refresh token
func (r *Repository) RevokeRefreshToken(ctx context.Context, token string) error {
	return r.db.WithContext(ctx).
		Model(&models.RefreshToken{}).
		Where("token = ?", token).
		Update("revoked_at", gorm.Expr("CURRENT_TIMESTAMP")).Error
}

// RevokeAllUserTokens revokes all tokens for a user
func (r *Repository) RevokeAllUserTokens(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).
		Model(&models.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", gorm.Expr("CURRENT_TIMESTAMP")).Error
}

// HashPassword hashes a password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword compares password with hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
