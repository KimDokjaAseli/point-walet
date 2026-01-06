package auth

import (
	"context"
	"errors"
	"time"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/middleware"
	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Common errors
var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrEmailExists        = errors.New("email already exists")
	ErrInvalidRole        = errors.New("invalid role")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrUserInactive       = errors.New("user account is inactive")
)

// WalletCreator interface for creating wallets
type WalletCreator interface {
	CreateWalletForUser(ctx context.Context, userID string) (*models.Wallet, error)
}

// Service handles auth business logic
type Service struct {
	repo           *Repository
	config         *config.Config
	authMiddleware *middleware.AuthMiddleware
	walletCreator  WalletCreator
}

// NewService creates a new auth service
func NewService(repo *Repository, cfg *config.Config, authMw *middleware.AuthMiddleware) *Service {
	return &Service{
		repo:           repo,
		config:         cfg,
		authMiddleware: authMw,
	}
}

// SetWalletCreator sets the wallet creator (to avoid circular dependency)
func (s *Service) SetWalletCreator(wc WalletCreator) {
	s.walletCreator = wc
}

// Login authenticates a user and returns tokens
func (s *Service) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	// Validate role
	if req.Role != "admin" && req.Role != "dosen" && req.Role != "mahasiswa" {
		return nil, ErrInvalidRole
	}

	// Get user by email and role
	user, err := s.repo.GetUserByEmailAndRole(ctx, req.Email, req.Role)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrInvalidCredentials
	}

	// Check password
	if !CheckPassword(req.Password, user.Password) {
		return nil, ErrInvalidCredentials
	}

	// Check user status
	if user.Status != "active" {
		return nil, ErrUserInactive
	}

	// Generate tokens
	accessToken, err := s.authMiddleware.GenerateAccessToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	refreshToken, expiresAt, err := s.authMiddleware.GenerateRefreshToken(user.ID)
	if err != nil {
		return nil, err
	}

	// Save refresh token
	rt := &models.RefreshToken{
		UserID:    user.ID,
		Token:     refreshToken,
		ExpiresAt: expiresAt,
	}
	if err := s.repo.CreateRefreshToken(ctx, rt); err != nil {
		return nil, err
	}

	return &LoginResponse{
		User: UserDTO{
			ID:     user.ID,
			Email:  user.Email,
			Name:   user.Name,
			Role:   user.Role,
			NimNip: utils.Deref(user.NimNip, ""),
		},
		Tokens: TokenDTO{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			ExpiresIn:    int(s.config.JWTAccessExpiry.Seconds()),
			TokenType:    "Bearer",
		},
	}, nil
}

// Register creates a new user
func (s *Service) Register(ctx context.Context, req RegisterRequest) (*UserDTO, error) {
	// Validate role
	if req.Role != "dosen" && req.Role != "mahasiswa" {
		return nil, ErrInvalidRole
	}

	// Check if email exists
	existing, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrEmailExists
	}

	// Hash password
	hashedPassword, err := HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		Email:    req.Email,
		Password: hashedPassword,
		Name:     req.Name,
		Role:     req.Role,
		NimNip:   &req.NimNip,
		Phone:    &req.Phone,
		Status:   "active",
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	// Create wallet for user
	if s.walletCreator != nil {
		_, err = s.walletCreator.CreateWalletForUser(ctx, user.ID)
		if err != nil {
			// Log error but don't fail registration
			// Wallet can be created later
		}
	}

	return &UserDTO{
		ID:     user.ID,
		Email:  user.Email,
		Name:   user.Name,
		Role:   user.Role,
		NimNip: utils.Deref(user.NimNip, ""),
	}, nil
}

// RefreshToken refreshes an access token
func (s *Service) RefreshToken(ctx context.Context, refreshTokenStr string) (*RefreshResponse, error) {
	// Validate refresh token
	userID, err := s.authMiddleware.ValidateRefreshToken(refreshTokenStr)
	if err != nil {
		return nil, ErrInvalidToken
	}

	// Check if token exists and not revoked
	rt, err := s.repo.GetRefreshToken(ctx, refreshTokenStr)
	if err != nil {
		return nil, err
	}
	if rt == nil {
		return nil, ErrInvalidToken
	}

	// Check if expired
	if rt.ExpiresAt.Before(time.Now()) {
		return nil, ErrInvalidToken
	}

	// Get user
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	// Generate new access token
	accessToken, err := s.authMiddleware.GenerateAccessToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &RefreshResponse{
		AccessToken: accessToken,
		ExpiresIn:   int(s.config.JWTAccessExpiry.Seconds()),
	}, nil
}

// Logout revokes refresh token
func (s *Service) Logout(ctx context.Context, refreshTokenStr string) error {
	return s.repo.RevokeRefreshToken(ctx, refreshTokenStr)
}

// GetUserByID gets user by ID
func (s *Service) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	return s.repo.GetUserByID(ctx, id)
}
