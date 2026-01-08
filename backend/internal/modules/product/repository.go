package product

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

// Product operations
func (r *Repository) CreateProduct(ctx context.Context, p *Product) error {
	query := `
		INSERT INTO products (seller_id, name, description, product_type, price, stock, 
			thumbnail_url, file_url, preview_url, sold_count, is_active, 
			is_featured, metadata, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, FALSE, ?, NOW(), NOW())
	`

	result, err := r.db.ExecContext(ctx, query,
		p.SellerID, p.Name, p.Description, p.ProductType, p.Price, p.Stock,
		p.ThumbnailURL, p.FileURL, p.PreviewURL, p.IsActive, p.Metadata,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	p.ID = uint(id)
	return nil
}

func (r *Repository) GetProductByID(ctx context.Context, id uint) (*Product, error) {
	query := `
		SELECT id, seller_id, name, description, product_type, price, stock,
			thumbnail_url, file_url, preview_url, sold_count, is_active, is_featured,
			metadata, created_at, updated_at
		FROM products WHERE id = ? AND deleted_at IS NULL
	`

	var p Product
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.SellerID, &p.Name, &p.Description, &p.ProductType, &p.Price, &p.Stock,
		&p.ThumbnailURL, &p.FileURL, &p.PreviewURL, &p.SoldCount, &p.IsActive, &p.IsFeatured,
		&p.Metadata, &p.CreatedAt, &p.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Stock NULL means unlimited
	p.IsUnlimited = !p.Stock.Valid

	return &p, nil
}

func (r *Repository) GetActiveProducts(ctx context.Context, limit, offset int) ([]*ProductWithSeller, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM products WHERE is_active = TRUE AND deleted_at IS NULL`
	if err := r.db.QueryRowContext(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT p.id, p.seller_id, p.name, p.description, p.product_type, p.price, p.stock,
			p.thumbnail_url, p.file_url, p.preview_url, p.sold_count, p.is_active, p.is_featured,
			p.metadata, p.created_at, p.updated_at, u.full_name as seller_name
		FROM products p
		INNER JOIN users u ON p.seller_id = u.id
		WHERE p.is_active = TRUE AND p.deleted_at IS NULL
		ORDER BY p.is_featured DESC, p.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var products []*ProductWithSeller
	for rows.Next() {
		var p ProductWithSeller
		if err := rows.Scan(
			&p.ID, &p.SellerID, &p.Name, &p.Description, &p.ProductType, &p.Price, &p.Stock,
			&p.ThumbnailURL, &p.FileURL, &p.PreviewURL, &p.SoldCount, &p.IsActive, &p.IsFeatured,
			&p.Metadata, &p.CreatedAt, &p.UpdatedAt, &p.SellerName,
		); err != nil {
			return nil, 0, err
		}
		p.IsUnlimited = !p.Stock.Valid
		products = append(products, &p)
	}

	return products, total, nil
}

func (r *Repository) GetProductsBySellerID(ctx context.Context, sellerID uint, limit, offset int) ([]*Product, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM products WHERE seller_id = ? AND deleted_at IS NULL`
	if err := r.db.QueryRowContext(ctx, countQuery, sellerID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, seller_id, name, description, product_type, price, stock,
			thumbnail_url, file_url, preview_url, sold_count, is_active, is_featured,
			metadata, created_at, updated_at
		FROM products 
		WHERE seller_id = ? AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.QueryContext(ctx, query, sellerID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var products []*Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(
			&p.ID, &p.SellerID, &p.Name, &p.Description, &p.ProductType, &p.Price, &p.Stock,
			&p.ThumbnailURL, &p.FileURL, &p.PreviewURL, &p.SoldCount, &p.IsActive, &p.IsFeatured,
			&p.Metadata, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		p.IsUnlimited = !p.Stock.Valid
		products = append(products, &p)
	}

	return products, total, nil
}

func (r *Repository) UpdateProduct(ctx context.Context, p *Product) error {
	query := `
		UPDATE products SET name = ?, description = ?, price = ?, stock = ?,
			thumbnail_url = ?, file_url = ?, is_active = ?, updated_at = NOW()
		WHERE id = ?
	`
	_, err := r.db.ExecContext(ctx, query,
		p.Name, p.Description, p.Price, p.Stock,
		p.ThumbnailURL, p.FileURL, p.IsActive, p.ID,
	)
	return err
}

func (r *Repository) DeleteProduct(ctx context.Context, id uint) error {
	query := `UPDATE products SET deleted_at = NOW() WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *Repository) DecrementStock(ctx context.Context, tx *sql.Tx, id uint, quantity int) error {
	query := `UPDATE products SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ? AND (stock IS NULL OR stock >= ?)`
	result, err := tx.ExecContext(ctx, query, quantity, quantity, id, quantity)
	if err != nil {
		return err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows // Stock not sufficient
	}
	return nil
}

// Order operations - simplified to work with existing orders table schema
func (r *Repository) CreateOrder(ctx context.Context, tx *sql.Tx, o *Order) error {
	// Note: Using existing orders table which has different columns
	// We'll store product_id in notes as JSON for now
	query := `
		INSERT INTO orders (order_code, buyer_id, seller_id, total_amount, 
			status, payment_method, transaction_id, notes, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, 'WALLET', ?, ?, NOW(), NOW())
	`

	// Store product info in notes
	notes := sql.NullString{
		String: "{\"product_id\":" + string(rune(o.ProductID)) + ",\"quantity\":" + string(rune(o.Quantity)) + "}",
		Valid:  true,
	}

	result, err := tx.ExecContext(ctx, query,
		o.OrderCode, o.BuyerID, o.SellerID, o.FinalPrice,
		o.Status, o.TransactionID, notes,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	o.ID = uint(id)
	return nil
}

func (r *Repository) GetOrderByID(ctx context.Context, id uint) (*Order, error) {
	query := `
		SELECT id, order_code, buyer_id, seller_id, total_amount, status, 
			transaction_id, completed_at, cancelled_at, cancel_reason, notes, created_at, updated_at
		FROM orders WHERE id = ?
	`

	var o Order
	var totalAmount int64
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&o.ID, &o.OrderCode, &o.BuyerID, &o.SellerID, &totalAmount, &o.Status,
		&o.TransactionID, &o.CompletedAt, &o.CancelledAt, &o.CancelReason, &o.Notes, &o.CreatedAt, &o.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	o.TotalPrice = totalAmount
	o.FinalPrice = totalAmount
	return &o, nil
}

func (r *Repository) GetOrdersByBuyerID(ctx context.Context, buyerID uint, limit, offset int) ([]*OrderWithDetails, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM orders WHERE buyer_id = ?`
	if err := r.db.QueryRowContext(ctx, countQuery, buyerID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT o.id, o.order_code, o.buyer_id, o.seller_id, o.total_amount, o.status,
			o.transaction_id, o.completed_at, o.cancelled_at, o.cancel_reason, o.notes, 
			o.created_at, o.updated_at,
			buyer.full_name as buyer_name, seller.full_name as seller_name
		FROM orders o
		INNER JOIN users buyer ON o.buyer_id = buyer.id
		INNER JOIN users seller ON o.seller_id = seller.id
		WHERE o.buyer_id = ?
		ORDER BY o.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.QueryContext(ctx, query, buyerID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []*OrderWithDetails
	for rows.Next() {
		var o OrderWithDetails
		var totalAmount int64
		if err := rows.Scan(
			&o.ID, &o.OrderCode, &o.BuyerID, &o.SellerID, &totalAmount, &o.Status,
			&o.TransactionID, &o.CompletedAt, &o.CancelledAt, &o.CancelReason, &o.Notes,
			&o.CreatedAt, &o.UpdatedAt, &o.BuyerName, &o.SellerName,
		); err != nil {
			return nil, 0, err
		}
		o.TotalPrice = totalAmount
		o.FinalPrice = totalAmount
		o.ProductName = "Product" // Simplified
		orders = append(orders, &o)
	}

	return orders, total, nil
}

func (r *Repository) UpdateOrderStatus(ctx context.Context, id uint, status string) error {
	query := `UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, status, id)
	return err
}
