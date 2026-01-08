package product

import (
	"context"
	"database/sql"

	"walletpoint/internal/modules/wallet"
	"walletpoint/internal/shared/constants"
	apperrors "walletpoint/internal/shared/errors"
	"walletpoint/pkg/utils"
)

type Service struct {
	repo       *Repository
	walletRepo *wallet.Repository
	db         *sql.DB
}

func NewService(repo *Repository, walletRepo *wallet.Repository, db *sql.DB) *Service {
	return &Service{
		repo:       repo,
		walletRepo: walletRepo,
		db:         db,
	}
}

func (s *Service) CreateProduct(ctx context.Context, req CreateProductRequest, sellerID uint) (*ProductResponse, error) {
	p := &Product{
		SellerID:    sellerID,
		Name:        req.Name,
		Description: sql.NullString{String: req.Description, Valid: req.Description != ""},
		ProductType: req.ProductType,
		Price:       req.Price,
		IsUnlimited: req.IsUnlimited,
		IsActive:    true,
	}

	if req.Stock != nil {
		p.Stock = sql.NullInt64{Int64: int64(*req.Stock), Valid: true}
	}
	if req.ThumbnailURL != "" {
		p.ThumbnailURL = sql.NullString{String: req.ThumbnailURL, Valid: true}
	}
	if req.FileURL != "" {
		p.FileURL = sql.NullString{String: req.FileURL, Valid: true}
	}

	if err := s.repo.CreateProduct(ctx, p); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create product")
	}

	resp := ToProductResponse(p, "")
	return &resp, nil
}

func (s *Service) GetProductByID(ctx context.Context, id uint) (*ProductResponse, error) {
	p, err := s.repo.GetProductByID(ctx, id)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to get product")
	}
	if p == nil {
		return nil, apperrors.ErrNotFound
	}

	resp := ToProductResponse(p, "")
	return &resp, nil
}

func (s *Service) GetActiveProducts(ctx context.Context, page, perPage int) ([]*ProductResponse, int, error) {
	offset := (page - 1) * perPage
	products, total, err := s.repo.GetActiveProducts(ctx, perPage, offset)
	if err != nil {
		return nil, 0, apperrors.Wrap(err, "DB_ERROR", "Failed to get products")
	}

	var responses []*ProductResponse
	for _, p := range products {
		resp := ToProductResponse(&p.Product, p.SellerName)
		responses = append(responses, &resp)
	}

	return responses, total, nil
}

func (s *Service) GetMyProducts(ctx context.Context, sellerID uint, page, perPage int) ([]*ProductResponse, int, error) {
	offset := (page - 1) * perPage
	products, total, err := s.repo.GetProductsBySellerID(ctx, sellerID, perPage, offset)
	if err != nil {
		return nil, 0, apperrors.Wrap(err, "DB_ERROR", "Failed to get products")
	}

	var responses []*ProductResponse
	for _, p := range products {
		resp := ToProductResponse(p, "")
		responses = append(responses, &resp)
	}

	return responses, total, nil
}

func (s *Service) UpdateProduct(ctx context.Context, id uint, req UpdateProductRequest, userID uint) error {
	p, err := s.repo.GetProductByID(ctx, id)
	if err != nil {
		return apperrors.Wrap(err, "DB_ERROR", "Failed to get product")
	}
	if p == nil {
		return apperrors.ErrNotFound
	}
	if p.SellerID != userID {
		return apperrors.ErrForbidden
	}

	if req.Name != nil {
		p.Name = *req.Name
	}
	if req.Description != nil {
		p.Description = sql.NullString{String: *req.Description, Valid: true}
	}
	if req.Price != nil {
		p.Price = *req.Price
	}
	if req.Stock != nil {
		p.Stock = sql.NullInt64{Int64: int64(*req.Stock), Valid: true}
	}
	if req.IsUnlimited != nil {
		p.IsUnlimited = *req.IsUnlimited
	}
	if req.ThumbnailURL != nil {
		p.ThumbnailURL = sql.NullString{String: *req.ThumbnailURL, Valid: true}
	}
	if req.FileURL != nil {
		p.FileURL = sql.NullString{String: *req.FileURL, Valid: true}
	}
	if req.IsActive != nil {
		p.IsActive = *req.IsActive
	}

	return s.repo.UpdateProduct(ctx, p)
}

func (s *Service) DeleteProduct(ctx context.Context, id uint, userID uint) error {
	p, err := s.repo.GetProductByID(ctx, id)
	if err != nil {
		return apperrors.Wrap(err, "DB_ERROR", "Failed to get product")
	}
	if p == nil {
		return apperrors.ErrNotFound
	}
	if p.SellerID != userID {
		return apperrors.ErrForbidden
	}

	return s.repo.DeleteProduct(ctx, id)
}

// Order operations
func (s *Service) CreateOrder(ctx context.Context, req CreateOrderRequest, buyerID uint) (*OrderResponse, error) {
	// Get product
	product, err := s.repo.GetProductByID(ctx, req.ProductID)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to get product")
	}
	if product == nil {
		return nil, apperrors.New("PRODUCT_NOT_FOUND", "Product not found")
	}
	if !product.IsActive {
		return nil, apperrors.New("PRODUCT_NOT_ACTIVE", "Product is not available")
	}

	// Cannot buy own product
	if product.SellerID == buyerID {
		return nil, apperrors.New("CANNOT_BUY_OWN", "Cannot buy your own product")
	}

	// Check stock
	if !product.IsUnlimited && product.Stock.Valid && product.Stock.Int64 < int64(req.Quantity) {
		return nil, apperrors.New("OUT_OF_STOCK", "Product is out of stock")
	}

	totalPrice := product.Price * int64(req.Quantity)

	// Start transaction
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to start transaction")
	}
	defer tx.Rollback()

	// Lock buyer wallet
	buyerWallet, err := s.walletRepo.GetByUserIDForUpdate(ctx, tx, buyerID)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to lock buyer wallet")
	}
	if buyerWallet == nil {
		return nil, apperrors.ErrWalletNotFound
	}
	if buyerWallet.IsFrozen {
		return nil, apperrors.ErrWalletFrozen
	}
	if buyerWallet.Balance < totalPrice {
		return nil, apperrors.ErrInsufficientBalance
	}

	// Lock seller wallet
	sellerWallet, err := s.walletRepo.GetByUserIDForUpdate(ctx, tx, product.SellerID)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to lock seller wallet")
	}
	if sellerWallet == nil {
		return nil, apperrors.New("SELLER_WALLET_NOT_FOUND", "Seller wallet not found")
	}

	// Generate order code
	orderCode := utils.GenerateTransactionCode("ORD")
	txCode := utils.GenerateTransactionCode("TRX")

	// Create transaction
	transaction := &wallet.Transaction{
		TransactionCode: txCode,
		IdempotencyKey:  orderCode, // Use order code as idempotency
		TransactionType: constants.TxTypePurchase,
		Status:          constants.TxStatusCompleted,
		FromWalletID:    sql.NullInt64{Int64: int64(buyerWallet.ID), Valid: true},
		ToWalletID:      sql.NullInt64{Int64: int64(sellerWallet.ID), Valid: true},
		Amount:          totalPrice,
		FeeAmount:       0,
		NetAmount:       totalPrice,
		Description:     sql.NullString{String: "Purchase: " + product.Name, Valid: true},
	}

	if err := s.walletRepo.CreateTransaction(ctx, tx, transaction); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create transaction")
	}

	// Create order
	order := &Order{
		OrderCode:      orderCode,
		BuyerID:        buyerID,
		SellerID:       product.SellerID,
		ProductID:      product.ID,
		Quantity:       req.Quantity,
		UnitPrice:      product.Price,
		TotalPrice:     totalPrice,
		DiscountAmount: 0,
		FinalPrice:     totalPrice,
		Status:         constants.OrderStatusCompleted,
		TransactionID:  sql.NullInt64{Int64: int64(transaction.ID), Valid: true},
	}

	if err := s.repo.CreateOrder(ctx, tx, order); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create order")
	}

	// Debit buyer
	if err := s.walletRepo.UpdateBalanceWithStats(ctx, tx, buyerWallet.ID, totalPrice, false); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to debit buyer")
	}

	// Credit seller
	if err := s.walletRepo.UpdateBalanceWithStats(ctx, tx, sellerWallet.ID, totalPrice, true); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to credit seller")
	}

	// Decrement stock
	if !product.IsUnlimited {
		if err := s.repo.DecrementStock(ctx, tx, product.ID, req.Quantity); err != nil {
			return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to decrement stock")
		}
	}

	// Commit
	if err := tx.Commit(); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to commit")
	}

	resp := ToOrderResponse(order, product.Name, "")
	return &resp, nil
}

func (s *Service) GetMyOrders(ctx context.Context, buyerID uint, page, perPage int) ([]*OrderResponse, int, error) {
	offset := (page - 1) * perPage
	orders, total, err := s.repo.GetOrdersByBuyerID(ctx, buyerID, perPage, offset)
	if err != nil {
		return nil, 0, apperrors.Wrap(err, "DB_ERROR", "Failed to get orders")
	}

	var responses []*OrderResponse
	for _, o := range orders {
		resp := ToOrderResponse(&o.Order, o.ProductName, o.SellerName)
		responses = append(responses, &resp)
	}

	return responses, total, nil
}
