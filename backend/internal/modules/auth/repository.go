package auth

import (
	"context"
	"database/sql"
)

type RepositoryInterface interface {
	GetUserByUsername(ctx context.Context, username string) (*UserWithRole, error)
	GetUserByID(ctx context.Context, id uint) (*UserWithRole, error)
	GetRoleByName(ctx context.Context, name string) (*Role, error)
	CreateUser(ctx context.Context, user *User) error
	AssignRole(ctx context.Context, userID, roleID uint) error
	UpdatePassword(ctx context.Context, userID uint, passwordHash string) error
	UpdateLastLogin(ctx context.Context, userID uint) error
	CreateSession(ctx context.Context, session *Session) error
	GetSessionByToken(ctx context.Context, tokenHash string) (*Session, error)
	RevokeSession(ctx context.Context, sessionID uint, reason string) error
	RevokeAllUserSessions(ctx context.Context, userID uint, reason string) error
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetUserByUsername(ctx context.Context, username string) (*UserWithRole, error) {
	query := `
		SELECT u.id, u.username, u.email, u.password_hash, u.full_name, 
			   u.nim_nip, u.phone, u.avatar_url, u.is_active, 
			   u.email_verified_at, u.last_login_at, u.created_at, u.updated_at,
			   ro.name as role_name
		FROM users u
		INNER JOIN user_roles ur ON u.id = ur.user_id
		INNER JOIN roles ro ON ur.role_id = ro.id
		WHERE u.username = ? AND u.deleted_at IS NULL
		LIMIT 1
	`

	var user UserWithRole
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.FullName,
		&user.NimNip, &user.Phone, &user.AvatarURL, &user.IsActive,
		&user.EmailVerifiedAt, &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt,
		&user.RoleName,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *Repository) GetUserByID(ctx context.Context, id uint) (*UserWithRole, error) {
	query := `
		SELECT u.id, u.username, u.email, u.password_hash, u.full_name, 
			   u.nim_nip, u.phone, u.avatar_url, u.is_active, 
			   u.email_verified_at, u.last_login_at, u.created_at, u.updated_at,
			   ro.name as role_name
		FROM users u
		INNER JOIN user_roles ur ON u.id = ur.user_id
		INNER JOIN roles ro ON ur.role_id = ro.id
		WHERE u.id = ? AND u.deleted_at IS NULL
		LIMIT 1
	`

	var user UserWithRole
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.FullName,
		&user.NimNip, &user.Phone, &user.AvatarURL, &user.IsActive,
		&user.EmailVerifiedAt, &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt,
		&user.RoleName,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *Repository) GetRoleByName(ctx context.Context, name string) (*Role, error) {
	query := `SELECT id, name, display_name, description, is_system FROM roles WHERE name = ?`

	var role Role
	err := r.db.QueryRowContext(ctx, query, name).Scan(
		&role.ID, &role.Name, &role.DisplayName, &role.Description, &role.IsSystem,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &role, nil
}

func (r *Repository) CreateUser(ctx context.Context, user *User) error {
	query := `
		INSERT INTO users (username, email, password_hash, full_name, nim_nip, phone, is_active, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`

	result, err := r.db.ExecContext(ctx, query,
		user.Username, user.Email, user.PasswordHash, user.FullName,
		user.NimNip, user.Phone, user.IsActive,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	user.ID = uint(id)
	return nil
}

func (r *Repository) AssignRole(ctx context.Context, userID, roleID uint) error {
	query := `INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES (?, ?, NOW())`
	_, err := r.db.ExecContext(ctx, query, userID, roleID)
	return err
}

func (r *Repository) UpdatePassword(ctx context.Context, userID uint, passwordHash string) error {
	query := `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, passwordHash, userID)
	return err
}

func (r *Repository) UpdateLastLogin(ctx context.Context, userID uint) error {
	query := `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

func (r *Repository) CreateSession(ctx context.Context, session *Session) error {
	query := `
		INSERT INTO sessions (user_id, token_hash, device_info, ip_address, is_active, created_at, expires_at, last_activity_at)
		VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW())
	`

	result, err := r.db.ExecContext(ctx, query,
		session.UserID, session.TokenHash, session.DeviceInfo, session.IPAddress,
		session.IsActive, session.ExpiresAt,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	session.ID = uint(id)
	return nil
}

func (r *Repository) GetSessionByToken(ctx context.Context, tokenHash string) (*Session, error) {
	query := `
		SELECT id, user_id, token_hash, device_info, ip_address, is_active, 
			   created_at, expires_at, last_activity_at, revoked_at, revoked_reason
		FROM sessions
		WHERE token_hash = ? AND is_active = TRUE AND expires_at > NOW()
	`

	var session Session
	err := r.db.QueryRowContext(ctx, query, tokenHash).Scan(
		&session.ID, &session.UserID, &session.TokenHash, &session.DeviceInfo,
		&session.IPAddress, &session.IsActive, &session.CreatedAt, &session.ExpiresAt,
		&session.LastActivityAt, &session.RevokedAt, &session.RevokedReason,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *Repository) RevokeSession(ctx context.Context, sessionID uint, reason string) error {
	query := `UPDATE sessions SET is_active = FALSE, revoked_at = NOW(), revoked_reason = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, reason, sessionID)
	return err
}

func (r *Repository) RevokeAllUserSessions(ctx context.Context, userID uint, reason string) error {
	query := `UPDATE sessions SET is_active = FALSE, revoked_at = NOW(), revoked_reason = ? WHERE user_id = ? AND is_active = TRUE`
	_, err := r.db.ExecContext(ctx, query, reason, userID)
	return err
}
