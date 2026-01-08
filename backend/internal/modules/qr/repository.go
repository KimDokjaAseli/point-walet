package qr

import (
	"context"
	"database/sql"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, qr *QRCode) error {
	query := `
		INSERT INTO qr_codes (code, qr_type, creator_id, amount, description, product_id, 
			signature, status, is_single_use, max_uses, current_uses, expires_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`

	result, err := r.db.ExecContext(ctx, query,
		qr.Code, qr.QRType, qr.CreatorID, qr.Amount, qr.Description, qr.ProductID,
		qr.Signature, qr.Status, qr.IsSingleUse, qr.MaxUses, qr.CurrentUses, qr.ExpiresAt,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	qr.ID = uint(id)
	return nil
}

func (r *Repository) GetByCode(ctx context.Context, code string) (*QRCode, error) {
	query := `
		SELECT id, code, qr_type, creator_id, amount, description, product_id, 
			signature, status, is_single_use, max_uses, current_uses, 
			scanned_by, scanned_at, expires_at, created_at, updated_at
		FROM qr_codes WHERE code = ?
	`

	var qr QRCode
	err := r.db.QueryRowContext(ctx, query, code).Scan(
		&qr.ID, &qr.Code, &qr.QRType, &qr.CreatorID, &qr.Amount, &qr.Description, &qr.ProductID,
		&qr.Signature, &qr.Status, &qr.IsSingleUse, &qr.MaxUses, &qr.CurrentUses,
		&qr.ScannedBy, &qr.ScannedAt, &qr.ExpiresAt, &qr.CreatedAt, &qr.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &qr, nil
}

func (r *Repository) GetByCodeForUpdate(ctx context.Context, tx *sql.Tx, code string) (*QRCode, error) {
	query := `
		SELECT id, code, qr_type, creator_id, amount, description, product_id, 
			signature, status, is_single_use, max_uses, current_uses, 
			scanned_by, scanned_at, expires_at, created_at, updated_at
		FROM qr_codes WHERE code = ? FOR UPDATE
	`

	var qr QRCode
	err := tx.QueryRowContext(ctx, query, code).Scan(
		&qr.ID, &qr.Code, &qr.QRType, &qr.CreatorID, &qr.Amount, &qr.Description, &qr.ProductID,
		&qr.Signature, &qr.Status, &qr.IsSingleUse, &qr.MaxUses, &qr.CurrentUses,
		&qr.ScannedBy, &qr.ScannedAt, &qr.ExpiresAt, &qr.CreatedAt, &qr.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &qr, nil
}

func (r *Repository) GetByID(ctx context.Context, id uint) (*QRCode, error) {
	query := `
		SELECT id, code, qr_type, creator_id, amount, description, product_id, 
			signature, status, is_single_use, max_uses, current_uses, 
			scanned_by, scanned_at, expires_at, created_at, updated_at
		FROM qr_codes WHERE id = ?
	`

	var qr QRCode
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&qr.ID, &qr.Code, &qr.QRType, &qr.CreatorID, &qr.Amount, &qr.Description, &qr.ProductID,
		&qr.Signature, &qr.Status, &qr.IsSingleUse, &qr.MaxUses, &qr.CurrentUses,
		&qr.ScannedBy, &qr.ScannedAt, &qr.ExpiresAt, &qr.CreatedAt, &qr.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &qr, nil
}

func (r *Repository) MarkAsUsed(ctx context.Context, tx *sql.Tx, id uint, scannedBy uint) error {
	query := `
		UPDATE qr_codes 
		SET status = 'USED', scanned_by = ?, scanned_at = NOW(), current_uses = current_uses + 1, updated_at = NOW()
		WHERE id = ?
	`
	_, err := tx.ExecContext(ctx, query, scannedBy, id)
	return err
}

func (r *Repository) UpdateStatus(ctx context.Context, id uint, status string) error {
	query := `UPDATE qr_codes SET status = ?, updated_at = NOW() WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, status, id)
	return err
}

func (r *Repository) GetByCreatorID(ctx context.Context, creatorID uint, limit, offset int) ([]*QRCode, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM qr_codes WHERE creator_id = ?`
	if err := r.db.QueryRowContext(ctx, countQuery, creatorID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, code, qr_type, creator_id, amount, description, product_id, 
			signature, status, is_single_use, max_uses, current_uses, 
			scanned_by, scanned_at, expires_at, created_at, updated_at
		FROM qr_codes 
		WHERE creator_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.QueryContext(ctx, query, creatorID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var qrs []*QRCode
	for rows.Next() {
		var qr QRCode
		if err := rows.Scan(
			&qr.ID, &qr.Code, &qr.QRType, &qr.CreatorID, &qr.Amount, &qr.Description, &qr.ProductID,
			&qr.Signature, &qr.Status, &qr.IsSingleUse, &qr.MaxUses, &qr.CurrentUses,
			&qr.ScannedBy, &qr.ScannedAt, &qr.ExpiresAt, &qr.CreatedAt, &qr.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		qrs = append(qrs, &qr)
	}

	return qrs, total, nil
}

func (r *Repository) DeleteByID(ctx context.Context, id uint) error {
	query := `DELETE FROM qr_codes WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
