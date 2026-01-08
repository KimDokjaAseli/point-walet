package wallet

import (
	"context"
	"database/sql"
)

type RepositoryInterface interface {
	GetByUserID(ctx context.Context, userID uint) (*Wallet, error)
	GetByUserIDForUpdate(ctx context.Context, tx *sql.Tx, userID uint) (*Wallet, error)
	UpdateBalance(ctx context.Context, tx *sql.Tx, walletID uint, amount int64) error
	UpdateBalanceWithStats(ctx context.Context, tx *sql.Tx, walletID uint, amount int64, isCredit bool) error
	CreateLedgerEntry(ctx context.Context, tx *sql.Tx, entry *WalletLedger) error
	GetLedgerByWalletID(ctx context.Context, walletID uint, limit, offset int) ([]*WalletLedger, int, error)
	GetTransactionByIdempotencyKey(ctx context.Context, key string) (*Transaction, error)
	CreateTransaction(ctx context.Context, tx *sql.Tx, transaction *Transaction) error
	UpdateTransactionStatus(ctx context.Context, tx *sql.Tx, id uint, status string) error
	GetTransactionsByWalletID(ctx context.Context, walletID uint, limit, offset int) ([]*Transaction, int, error)
	GetUserIDByWalletID(ctx context.Context, walletID uint) (uint, error)
	GetWalletWithUser(ctx context.Context, userID uint) (*WalletWithUser, error)
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetByUserID(ctx context.Context, userID uint) (*Wallet, error) {
	query := `
		SELECT id, user_id, balance, locked_balance, lifetime_earned, lifetime_spent, 
			   is_frozen, frozen_reason, frozen_at, frozen_by, created_at, updated_at
		FROM wallets WHERE user_id = ?
	`

	var w Wallet
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&w.ID, &w.UserID, &w.Balance, &w.LockedBalance, &w.LifetimeEarned, &w.LifetimeSpent,
		&w.IsFrozen, &w.FrozenReason, &w.FrozenAt, &w.FrozenBy, &w.CreatedAt, &w.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &w, nil
}

func (r *Repository) GetByUserIDForUpdate(ctx context.Context, tx *sql.Tx, userID uint) (*Wallet, error) {
	query := `
		SELECT id, user_id, balance, locked_balance, lifetime_earned, lifetime_spent, 
			   is_frozen, frozen_reason, frozen_at, frozen_by, created_at, updated_at
		FROM wallets WHERE user_id = ? FOR UPDATE
	`

	var w Wallet
	err := tx.QueryRowContext(ctx, query, userID).Scan(
		&w.ID, &w.UserID, &w.Balance, &w.LockedBalance, &w.LifetimeEarned, &w.LifetimeSpent,
		&w.IsFrozen, &w.FrozenReason, &w.FrozenAt, &w.FrozenBy, &w.CreatedAt, &w.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &w, nil
}

func (r *Repository) UpdateBalance(ctx context.Context, tx *sql.Tx, walletID uint, amount int64) error {
	query := `UPDATE wallets SET balance = balance + ?, updated_at = NOW() WHERE id = ?`
	_, err := tx.ExecContext(ctx, query, amount, walletID)
	return err
}

func (r *Repository) UpdateBalanceWithStats(ctx context.Context, tx *sql.Tx, walletID uint, amount int64, isCredit bool) error {
	var query string
	if isCredit {
		query = `UPDATE wallets SET balance = balance + ?, lifetime_earned = lifetime_earned + ?, updated_at = NOW() WHERE id = ?`
	} else {
		query = `UPDATE wallets SET balance = balance - ?, lifetime_spent = lifetime_spent + ?, updated_at = NOW() WHERE id = ?`
	}

	absAmount := amount
	if amount < 0 {
		absAmount = -amount
	}

	_, err := tx.ExecContext(ctx, query, absAmount, absAmount, walletID)
	return err
}

func (r *Repository) CreateLedgerEntry(ctx context.Context, tx *sql.Tx, entry *WalletLedger) error {
	query := `
		INSERT INTO wallet_ledgers (wallet_id, transaction_id, entry_type, amount, balance_before, balance_after, 
			description, reference_type, reference_id, metadata, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
	`

	result, err := tx.ExecContext(ctx, query,
		entry.WalletID, entry.TransactionID, entry.EntryType, entry.Amount,
		entry.BalanceBefore, entry.BalanceAfter, entry.Description,
		entry.ReferenceType, entry.ReferenceID, entry.Metadata,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	entry.ID = uint(id)
	return nil
}

func (r *Repository) GetLedgerByWalletID(ctx context.Context, walletID uint, limit, offset int) ([]*WalletLedger, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM wallet_ledgers WHERE wallet_id = ?`
	if err := r.db.QueryRowContext(ctx, countQuery, walletID).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get entries
	query := `
		SELECT id, wallet_id, transaction_id, entry_type, amount, balance_before, balance_after,
			   description, reference_type, reference_id, metadata, created_at
		FROM wallet_ledgers
		WHERE wallet_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.QueryContext(ctx, query, walletID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var entries []*WalletLedger
	for rows.Next() {
		var e WalletLedger
		if err := rows.Scan(
			&e.ID, &e.WalletID, &e.TransactionID, &e.EntryType, &e.Amount, &e.BalanceBefore, &e.BalanceAfter,
			&e.Description, &e.ReferenceType, &e.ReferenceID, &e.Metadata, &e.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		entries = append(entries, &e)
	}

	return entries, total, nil
}

func (r *Repository) GetTransactionByIdempotencyKey(ctx context.Context, key string) (*Transaction, error) {
	query := `
		SELECT id, transaction_code, idempotency_key, transaction_type, status, from_wallet_id, to_wallet_id,
			   amount, fee_amount, net_amount, description, processed_at, created_at
		FROM transactions WHERE idempotency_key = ?
	`

	var t Transaction
	err := r.db.QueryRowContext(ctx, query, key).Scan(
		&t.ID, &t.TransactionCode, &t.IdempotencyKey, &t.TransactionType, &t.Status,
		&t.FromWalletID, &t.ToWalletID, &t.Amount, &t.FeeAmount, &t.NetAmount,
		&t.Description, &t.ProcessedAt, &t.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &t, nil
}

func (r *Repository) CreateTransaction(ctx context.Context, tx *sql.Tx, transaction *Transaction) error {
	query := `
		INSERT INTO transactions (transaction_code, idempotency_key, transaction_type, status, 
			from_wallet_id, to_wallet_id, amount, fee_amount, net_amount, description, 
			processed_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`

	result, err := tx.ExecContext(ctx, query,
		transaction.TransactionCode, transaction.IdempotencyKey, transaction.TransactionType,
		transaction.Status, transaction.FromWalletID, transaction.ToWalletID, transaction.Amount,
		transaction.FeeAmount, transaction.NetAmount, transaction.Description, transaction.ProcessedAt,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	transaction.ID = uint(id)
	return nil
}

func (r *Repository) UpdateTransactionStatus(ctx context.Context, tx *sql.Tx, id uint, status string) error {
	query := `UPDATE transactions SET status = ?, updated_at = NOW() WHERE id = ?`
	_, err := tx.ExecContext(ctx, query, status, id)
	return err
}

func (r *Repository) GetTransactionsByWalletID(ctx context.Context, walletID uint, limit, offset int) ([]*Transaction, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM transactions WHERE from_wallet_id = ? OR to_wallet_id = ?`
	if err := r.db.QueryRowContext(ctx, countQuery, walletID, walletID).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get transactions
	query := `
		SELECT id, transaction_code, idempotency_key, transaction_type, status, from_wallet_id, to_wallet_id,
			   amount, fee_amount, net_amount, description, processed_at, created_at
		FROM transactions
		WHERE from_wallet_id = ? OR to_wallet_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.QueryContext(ctx, query, walletID, walletID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var transactions []*Transaction
	for rows.Next() {
		var t Transaction
		if err := rows.Scan(
			&t.ID, &t.TransactionCode, &t.IdempotencyKey, &t.TransactionType, &t.Status,
			&t.FromWalletID, &t.ToWalletID, &t.Amount, &t.FeeAmount, &t.NetAmount,
			&t.Description, &t.ProcessedAt, &t.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		transactions = append(transactions, &t)
	}

	return transactions, total, nil
}

func (r *Repository) GetUserIDByWalletID(ctx context.Context, walletID uint) (uint, error) {
	var userID uint
	query := `SELECT user_id FROM wallets WHERE id = ?`
	err := r.db.QueryRowContext(ctx, query, walletID).Scan(&userID)
	return userID, err
}

func (r *Repository) GetWalletWithUser(ctx context.Context, userID uint) (*WalletWithUser, error) {
	query := `
		SELECT w.id, w.user_id, w.balance, w.locked_balance, w.lifetime_earned, w.lifetime_spent,
			   w.is_frozen, w.frozen_reason, w.frozen_at, w.frozen_by, w.created_at, w.updated_at,
			   u.username, u.full_name, u.email, r.name as role_name
		FROM wallets w
		INNER JOIN users u ON w.user_id = u.id
		INNER JOIN user_roles ur ON u.id = ur.user_id
		INNER JOIN roles r ON ur.role_id = r.id
		WHERE w.user_id = ?
	`

	var ww WalletWithUser
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&ww.ID, &ww.UserID, &ww.Balance, &ww.LockedBalance, &ww.LifetimeEarned, &ww.LifetimeSpent,
		&ww.IsFrozen, &ww.FrozenReason, &ww.FrozenAt, &ww.FrozenBy, &ww.CreatedAt, &ww.UpdatedAt,
		&ww.Username, &ww.FullName, &ww.Email, &ww.RoleName,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &ww, nil
}
