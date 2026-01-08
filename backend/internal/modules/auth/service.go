package auth

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"time"

	"walletpoint/internal/middleware"
	apperrors "walletpoint/internal/shared/errors"
	"walletpoint/pkg/utils"
)

type ServiceInterface interface {
	Login(ctx context.Context, req LoginRequest, role, ipAddress, userAgent string) (*LoginResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*LoginResponse, error)
	Logout(ctx context.Context, userID uint) error
	GetProfile(ctx context.Context, userID uint) (*ProfileResponse, error)
	ChangePassword(ctx context.Context, userID uint, req ChangePasswordRequest) error
	Register(ctx context.Context, req RegisterRequest) (*UserResponse, error)
}

type Service struct {
	repo       *Repository
	jwtManager *middleware.JWTManager
}

func NewService(repo *Repository, jwtManager *middleware.JWTManager) *Service {
	return &Service{
		repo:       repo,
		jwtManager: jwtManager,
	}
}

func (s *Service) Login(ctx context.Context, req LoginRequest, role, ipAddress, userAgent string) (*LoginResponse, error) {
	// Get user by username
	user, err := s.repo.GetUserByUsername(ctx, req.Username)
	if err != nil {
		return nil, apperrors.Wrap(err, "INTERNAL_ERROR", "Failed to get user")
	}
	if user == nil {
		return nil, apperrors.ErrInvalidCredentials
	}

	// Check if user is active
	if !user.IsActive {
		return nil, apperrors.New("ACCOUNT_INACTIVE", "Account is inactive")
	}

	// Check role matches
	if user.RoleName != role {
		return nil, apperrors.ErrInvalidCredentials
	}

	// Verify password
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		return nil, apperrors.ErrInvalidCredentials
	}

	// Generate tokens
	tokenPair, err := s.jwtManager.GenerateTokenPair(user.ID, user.Username, user.RoleName)
	if err != nil {
		return nil, apperrors.Wrap(err, "TOKEN_ERROR", "Failed to generate tokens")
	}

	// Create session
	tokenHash := hashToken(tokenPair.RefreshToken)
	session := &Session{
		UserID:    user.ID,
		TokenHash: tokenHash,
		DeviceInfo: sql.NullString{
			String: userAgent,
			Valid:  userAgent != "",
		},
		IPAddress: sql.NullString{
			String: ipAddress,
			Valid:  ipAddress != "",
		},
		IsActive:  true,
		ExpiresAt: time.Now().Add(168 * time.Hour), // 7 days
	}

	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, apperrors.Wrap(err, "SESSION_ERROR", "Failed to create session")
	}

	// Update last login
	s.repo.UpdateLastLogin(ctx, user.ID)

	return &LoginResponse{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresIn:    tokenPair.ExpiresIn,
		TokenType:    tokenPair.TokenType,
		User:         ToUserResponse(user),
	}, nil
}

func (s *Service) RefreshToken(ctx context.Context, refreshToken string) (*LoginResponse, error) {
	// Validate refresh token
	claims, err := s.jwtManager.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, apperrors.New("INVALID_TOKEN", "Invalid or expired refresh token")
	}

	// Check session exists
	tokenHash := hashToken(refreshToken)
	session, err := s.repo.GetSessionByToken(ctx, tokenHash)
	if err != nil || session == nil {
		return nil, apperrors.New("SESSION_NOT_FOUND", "Session not found or expired")
	}

	// Get user
	user, err := s.repo.GetUserByID(ctx, claims.UserID)
	if err != nil || user == nil {
		return nil, apperrors.New("USER_NOT_FOUND", "User not found")
	}

	// Revoke old session
	s.repo.RevokeSession(ctx, session.ID, "token_refresh")

	// Generate new tokens
	tokenPair, err := s.jwtManager.GenerateTokenPair(user.ID, user.Username, user.RoleName)
	if err != nil {
		return nil, apperrors.Wrap(err, "TOKEN_ERROR", "Failed to generate tokens")
	}

	// Create new session
	newTokenHash := hashToken(tokenPair.RefreshToken)
	newSession := &Session{
		UserID:     user.ID,
		TokenHash:  newTokenHash,
		DeviceInfo: session.DeviceInfo,
		IPAddress:  session.IPAddress,
		IsActive:   true,
		ExpiresAt:  time.Now().Add(168 * time.Hour),
	}

	if err := s.repo.CreateSession(ctx, newSession); err != nil {
		return nil, apperrors.Wrap(err, "SESSION_ERROR", "Failed to create session")
	}

	return &LoginResponse{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresIn:    tokenPair.ExpiresIn,
		TokenType:    tokenPair.TokenType,
		User:         ToUserResponse(user),
	}, nil
}

func (s *Service) Logout(ctx context.Context, userID uint) error {
	return s.repo.RevokeAllUserSessions(ctx, userID, "logout")
}

func (s *Service) GetProfile(ctx context.Context, userID uint) (*ProfileResponse, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, apperrors.Wrap(err, "INTERNAL_ERROR", "Failed to get user")
	}
	if user == nil {
		return nil, apperrors.ErrNotFound
	}

	profile := &ProfileResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		FullName:  user.FullName,
		Role:      user.RoleName,
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
	}

	if user.NimNip.Valid {
		profile.NimNip = &user.NimNip.String
	}
	if user.Phone.Valid {
		profile.Phone = &user.Phone.String
	}
	if user.AvatarURL.Valid {
		profile.AvatarURL = &user.AvatarURL.String
	}
	if user.EmailVerifiedAt.Valid {
		t := user.EmailVerifiedAt.Time.Format(time.RFC3339)
		profile.EmailVerifiedAt = &t
	}
	if user.LastLoginAt.Valid {
		t := user.LastLoginAt.Time.Format(time.RFC3339)
		profile.LastLoginAt = &t
	}

	return profile, nil
}

func (s *Service) ChangePassword(ctx context.Context, userID uint, req ChangePasswordRequest) error {
	// Get user
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil || user == nil {
		return apperrors.ErrNotFound
	}

	// Verify current password
	if !utils.CheckPassword(req.CurrentPassword, user.PasswordHash) {
		return apperrors.New("INVALID_PASSWORD", "Current password is incorrect")
	}

	// Hash new password
	newHash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return apperrors.Wrap(err, "HASH_ERROR", "Failed to hash password")
	}

	// Update password
	if err := s.repo.UpdatePassword(ctx, userID, newHash); err != nil {
		return apperrors.Wrap(err, "UPDATE_ERROR", "Failed to update password")
	}

	// Revoke all sessions
	s.repo.RevokeAllUserSessions(ctx, userID, "password_changed")

	return nil
}

func (s *Service) Register(ctx context.Context, req RegisterRequest) (*UserResponse, error) {
	// Check if username exists
	existing, _ := s.repo.GetUserByUsername(ctx, req.Username)
	if existing != nil {
		return nil, apperrors.New("USERNAME_EXISTS", "Username already exists")
	}

	// Get role
	role, err := s.repo.GetRoleByName(ctx, req.Role)
	if err != nil || role == nil {
		return nil, apperrors.New("INVALID_ROLE", "Invalid role specified")
	}

	// Hash password
	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, apperrors.Wrap(err, "HASH_ERROR", "Failed to hash password")
	}

	// Create user
	user := &User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: passwordHash,
		FullName:     req.FullName,
		NimNip:       sql.NullString{String: req.NimNip, Valid: req.NimNip != ""},
		IsActive:     true,
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, apperrors.Wrap(err, "CREATE_ERROR", "Failed to create user")
	}

	// Assign role
	if err := s.repo.AssignRole(ctx, user.ID, role.ID); err != nil {
		return nil, apperrors.Wrap(err, "ROLE_ERROR", "Failed to assign role")
	}

	return &UserResponse{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
		FullName: user.FullName,
		Role:     role.Name,
	}, nil
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
