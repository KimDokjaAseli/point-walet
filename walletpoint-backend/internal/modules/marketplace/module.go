package marketplace

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/middleware"
	"walletpoint-backend/internal/modules/qr"
	"walletpoint-backend/internal/modules/wallet"
	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Module represents the marketplace module
type Module struct {
	db            *gorm.DB
	walletService *wallet.Service
	qrService     *qr.Service
}

// NewModule creates a new marketplace module
func NewModule(db *gorm.DB, cfg *config.Config, walletSvc *wallet.Service, qrSvc *qr.Service) *Module {
	return &Module{
		db:            db,
		walletService: walletSvc,
		qrService:     qrSvc,
	}
}

// RegisterRoutes registers marketplace routes
func (m *Module) RegisterRoutes(router fiber.Router, authMiddleware *middleware.AuthMiddleware) {
	// Products
	products := router.Group("/products")
	products.Get("/", m.GetProducts)       // Public
	products.Get("/:id", m.GetProductByID) // Public
	products.Post("/", authMiddleware.Protected(), authMiddleware.RequireRole("dosen", "admin"), m.CreateProduct)
	products.Put("/:id", authMiddleware.Protected(), authMiddleware.RequireRole("dosen", "admin"), m.UpdateProduct)
	products.Delete("/:id", authMiddleware.Protected(), authMiddleware.RequireRole("dosen", "admin"), m.DeleteProduct)

	// Orders
	orders := router.Group("/orders")
	orders.Use(authMiddleware.Protected())
	orders.Post("/", m.CreateOrder)
	orders.Get("/", m.GetMyOrders)
	orders.Get("/seller", authMiddleware.RequireRole("dosen", "admin"), m.GetSellerOrders)
	orders.Get("/:id", m.GetOrderByID)
}

// GetProducts gets all products
func (m *Module) GetProducts(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	category := c.Query("category", "")
	search := c.Query("search", "")

	var products []models.Product
	var total int64

	query := m.db.Model(&models.Product{}).Where("status != 'deleted'")
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if search != "" {
		query = query.Where("name LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	query.Count(&total)
	offset, totalPages := utils.CalculatePagination(page, limit, int(total))

	query.Preload("Seller").Order("created_at DESC").Offset(offset).Limit(limit).Find(&products)

	dtos := make([]fiber.Map, len(products))
	for i, p := range products {
		sellerName := ""
		if p.Seller != nil {
			sellerName = p.Seller.Name
		}
		dtos[i] = fiber.Map{
			"id":            p.ID,
			"name":          p.Name,
			"description":   p.Description,
			"price":         p.Price,
			"category":      p.Category,
			"stock":         p.Stock,
			"status":        p.Status,
			"thumbnail_url": p.ThumbnailURL,
			"total_sold":    p.TotalSold,
			"seller_id":     p.SellerID,
			"seller": fiber.Map{
				"id":   p.SellerID,
				"name": sellerName,
			},
			"created_at": p.CreatedAt,
		}
	}

	return utils.SuccessWithMeta(c, "Products retrieved", fiber.Map{
		"products": dtos,
	}, &utils.Meta{
		Page:       page,
		Limit:      limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}

// GetProductByID gets product by ID
func (m *Module) GetProductByID(c *fiber.Ctx) error {
	id := c.Params("id")

	var product models.Product
	if err := m.db.Preload("Seller").First(&product, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "Product not found")
	}

	return utils.SuccessResponse(c, "Product retrieved", fiber.Map{
		"product": product,
	})
}

// CreateProduct creates a product
func (m *Module) CreateProduct(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req struct {
		Name         string  `json:"name"`
		Description  string  `json:"description"`
		Price        float64 `json:"price"`
		Category     string  `json:"category"`
		Stock        int     `json:"stock"`
		ThumbnailURL string  `json:"thumbnail_url"`
		FileURL      string  `json:"file_url"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request")
	}

	// Default stock to 10 if not provided or 0
	stock := req.Stock
	if stock == 0 {
		stock = 10
	}

	product := models.Product{
		ID:           utils.GenerateUUID(),
		SellerID:     userID,
		Name:         req.Name,
		Description:  &req.Description,
		Price:        req.Price,
		Category:     req.Category,
		ThumbnailURL: &req.ThumbnailURL,
		FileURL:      &req.FileURL,
		Stock:        stock,
		Status:       "active",
	}

	if err := m.db.Create(&product).Error; err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	return utils.CreatedResponse(c, "Product created", fiber.Map{
		"product": product,
	})
}

// UpdateProduct updates a product
func (m *Module) UpdateProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	var product models.Product
	// Admin can update any product, dosen only their own
	if userRole == "admin" {
		if err := m.db.First(&product, "id = ?", id).Error; err != nil {
			return utils.NotFound(c, "Product not found")
		}
	} else {
		if err := m.db.First(&product, "id = ? AND seller_id = ?", id, userID).Error; err != nil {
			return utils.NotFound(c, "Product not found")
		}
	}

	var req struct {
		Name         string  `json:"name"`
		Description  string  `json:"description"`
		Price        float64 `json:"price"`
		Category     string  `json:"category"`
		Stock        *int    `json:"stock"`         // Use pointer to detect if provided
		ThumbnailURL *string `json:"thumbnail_url"` // Use pointer to allow clearing
		Status       string  `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request")
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Price > 0 {
		updates["price"] = req.Price
	}
	if req.Category != "" {
		updates["category"] = req.Category
	}
	if req.Stock != nil {
		updates["stock"] = *req.Stock
	}
	// Handle thumbnail_url - allow clearing by setting to empty string
	if req.ThumbnailURL != nil {
		updates["thumbnail_url"] = *req.ThumbnailURL
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}

	// Apply updates
	if err := m.db.Model(&product).Updates(updates).Error; err != nil {
		return utils.InternalServerError(c, "Failed to update product")
	}

	// Reload the product to get updated data
	m.db.Preload("Seller").First(&product, "id = ?", id)

	return utils.SuccessResponse(c, "Product updated", fiber.Map{
		"product": product,
	})
}

// DeleteProduct deletes a product (soft delete)
func (m *Module) DeleteProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	var result *gorm.DB
	// Admin can delete any product, dosen only their own
	if userRole == "admin" {
		result = m.db.Model(&models.Product{}).
			Where("id = ?", id).
			Update("status", "deleted")
	} else {
		result = m.db.Model(&models.Product{}).
			Where("id = ? AND seller_id = ?", id, userID).
			Update("status", "deleted")
	}

	if result.RowsAffected == 0 {
		return utils.NotFound(c, "Product not found")
	}

	return utils.SuccessResponse(c, "Product deleted", nil)
}

// CreateOrder creates an order
func (m *Module) CreateOrder(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req struct {
		Items []struct {
			ProductID string `json:"product_id"`
			Quantity  int    `json:"quantity"`
		} `json:"items"`
		Notes         string `json:"notes"`
		PaymentMethod string `json:"payment_method"` // "balance" or "qris"
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request")
	}

	if len(req.Items) == 0 {
		return utils.BadRequest(c, "No items in order")
	}

	// Default payment method
	if req.PaymentMethod == "" {
		req.PaymentMethod = "balance"
	}

	// Calculate total
	var totalAmount float64
	orderItems := make([]models.OrderItem, 0)

	for _, item := range req.Items {
		var product models.Product
		if err := m.db.First(&product, "id = ? AND status = 'active'", item.ProductID).Error; err != nil {
			return utils.NotFound(c, "Product not found: "+item.ProductID)
		}

		qty := item.Quantity
		if qty < 1 {
			qty = 1
		}

		orderItems = append(orderItems, models.OrderItem{
			ID:        utils.GenerateUUID(),
			ProductID: product.ID,
			SellerID:  product.SellerID,
			Quantity:  qty,
			Price:     product.Price,
		})

		totalAmount += product.Price * float64(qty)
	}

	// If payment method is balance, check and deduct wallet
	if req.PaymentMethod == "balance" {
		var wallet models.Wallet
		if err := m.db.First(&wallet, "user_id = ?", userID).Error; err != nil {
			return utils.BadRequest(c, "Wallet not found")
		}

		if wallet.Balance < totalAmount {
			return utils.BadRequest(c, "Saldo tidak mencukupi")
		}

		// Deduct balance
		wallet.Balance -= totalAmount
		if err := m.db.Save(&wallet).Error; err != nil {
			return utils.InternalServerError(c, "Failed to deduct balance")
		}

		// Create transaction record
		tx := models.Transaction{
			ID:          utils.GenerateUUID(),
			SenderID:    &userID,
			Type:        "PURCHASE",
			Amount:      totalAmount,
			Description: utils.Ptr("Pembayaran order marketplace"),
			Status:      "SUCCESS",
		}
		m.db.Create(&tx)
	}

	// Create order
	orderStatus := "PENDING"
	if req.PaymentMethod == "balance" {
		orderStatus = "PAID"
	}

	order := models.Order{
		ID:          utils.GenerateUUID(),
		BuyerID:     userID,
		TotalAmount: totalAmount,
		Status:      orderStatus,
		Notes:       &req.Notes,
	}

	if err := m.db.Create(&order).Error; err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	// Create order items
	for i := range orderItems {
		orderItems[i].OrderID = order.ID
		m.db.Create(&orderItems[i])
	}

	// If order is PAID, update product stock and total_sold
	if orderStatus == "PAID" {
		for _, item := range orderItems {
			// Update stock (decrease) and total_sold (increase)
			m.db.Model(&models.Product{}).Where("id = ?", item.ProductID).Updates(map[string]interface{}{
				"stock":      gorm.Expr("CASE WHEN stock > 0 THEN stock - ? ELSE stock END", item.Quantity),
				"total_sold": gorm.Expr("total_sold + ?", item.Quantity),
			})
		}
	}

	// Generate checkout QR for QRIS payment
	var qrCode interface{}
	if req.PaymentMethod == "qris" {
		qr, err := m.qrService.GenerateCheckoutQR(c.Context(), userID, order.ID, totalAmount)
		if err == nil {
			qrCode = qr
			m.db.Model(&order).Update("qr_code_id", qr.ID)
		}
	}

	// Get updated wallet balance
	var walletBalance float64
	var wallet models.Wallet
	if m.db.First(&wallet, "user_id = ?", userID).Error == nil {
		walletBalance = wallet.Balance
	}

	responseMsg := "Order created"
	if req.PaymentMethod == "balance" {
		responseMsg = "Pembayaran berhasil"
	} else {
		responseMsg = "Order created, please complete payment"
	}

	return utils.CreatedResponse(c, responseMsg, fiber.Map{
		"order": fiber.Map{
			"id":             order.ID,
			"total_amount":   order.TotalAmount,
			"status":         order.Status,
			"payment_method": req.PaymentMethod,
			"items":          orderItems,
		},
		"wallet": fiber.Map{
			"balance": walletBalance,
		},
		"qr_code": qrCode,
	})
}

// GetMyOrders gets user's orders
func (m *Module) GetMyOrders(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var orders []models.Order
	m.db.Where("buyer_id = ?", userID).
		Preload("Items.Product").
		Order("created_at DESC").
		Find(&orders)

	return utils.SuccessResponse(c, "Orders retrieved", fiber.Map{
		"orders": orders,
	})
}

// GetOrderByID gets order by ID
func (m *Module) GetOrderByID(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var order models.Order
	if err := m.db.Where("id = ? AND buyer_id = ?", id, userID).
		Preload("Items.Product").
		First(&order).Error; err != nil {
		return utils.NotFound(c, "Order not found")
	}

	return utils.SuccessResponse(c, "Order retrieved", fiber.Map{
		"order": order,
	})
}

// GetSellerOrders gets orders for products owned by the seller
func (m *Module) GetSellerOrders(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	// Find all products owned by this seller
	var productIDs []string
	m.db.Model(&models.Product{}).Where("seller_id = ?", userID).Pluck("id", &productIDs)

	if len(productIDs) == 0 {
		return utils.SuccessResponse(c, "No orders found", fiber.Map{
			"orders": []interface{}{},
		})
	}

	// Find all order items that contain seller's products
	var orderItems []models.OrderItem
	m.db.Where("product_id IN ?", productIDs).
		Preload("Product").
		Preload("Order").
		Preload("Order.Buyer").
		Order("created_at DESC").
		Find(&orderItems)

	// Group orders by order ID with buyer info
	ordersMap := make(map[string]fiber.Map)
	for _, item := range orderItems {
		orderID := item.OrderID
		if _, exists := ordersMap[orderID]; !exists {
			buyerName := ""
			buyerEmail := ""
			if item.Order.Buyer != nil {
				buyerName = item.Order.Buyer.Name
				buyerEmail = item.Order.Buyer.Email
			}
			ordersMap[orderID] = fiber.Map{
				"order_id":     orderID,
				"buyer_name":   buyerName,
				"buyer_email":  buyerEmail,
				"status":       item.Order.Status,
				"total_amount": item.Order.TotalAmount,
				"created_at":   item.Order.CreatedAt,
				"items":        []fiber.Map{},
			}
		}

		orderData := ordersMap[orderID]
		items := orderData["items"].([]fiber.Map)
		items = append(items, fiber.Map{
			"product_id":   item.ProductID,
			"product_name": item.Product.Name,
			"quantity":     item.Quantity,
			"price":        item.Price,
			"subtotal":     item.Price * float64(item.Quantity),
		})
		orderData["items"] = items
		ordersMap[orderID] = orderData
	}

	// Convert to slice
	orders := make([]fiber.Map, 0, len(ordersMap))
	for _, order := range ordersMap {
		orders = append(orders, order)
	}

	return utils.SuccessResponse(c, "Seller orders retrieved", fiber.Map{
		"orders": orders,
	})
}
