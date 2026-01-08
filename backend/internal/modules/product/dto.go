package product

import "time"

// CreateProductRequest for creating product
type CreateProductRequest struct {
	Name         string `json:"name"`
	Description  string `json:"description"`
	ProductType  string `json:"product_type"` // EBOOK, ECOURSE, MATERIAL, OTHER
	Price        int64  `json:"price"`
	Stock        *int   `json:"stock"`
	IsUnlimited  bool   `json:"is_unlimited"`
	ThumbnailURL string `json:"thumbnail_url"`
	FileURL      string `json:"file_url"`
}

func (r *CreateProductRequest) Validate() []ValidationError {
	var errors []ValidationError
	if r.Name == "" {
		errors = append(errors, ValidationError{Field: "name", Message: "Name is required"})
	}
	if r.ProductType == "" {
		r.ProductType = "OTHER"
	}
	validTypes := map[string]bool{"EBOOK": true, "ECOURSE": true, "MATERIAL": true, "OTHER": true}
	if !validTypes[r.ProductType] {
		errors = append(errors, ValidationError{Field: "product_type", Message: "Invalid product type"})
	}
	if r.Price <= 0 {
		errors = append(errors, ValidationError{Field: "price", Message: "Price must be positive"})
	}
	return errors
}

// UpdateProductRequest for updating product
type UpdateProductRequest struct {
	Name         *string `json:"name"`
	Description  *string `json:"description"`
	Price        *int64  `json:"price"`
	Stock        *int    `json:"stock"`
	IsUnlimited  *bool   `json:"is_unlimited"`
	ThumbnailURL *string `json:"thumbnail_url"`
	FileURL      *string `json:"file_url"`
	IsActive     *bool   `json:"is_active"`
}

// CreateOrderRequest for creating order
type CreateOrderRequest struct {
	ProductID uint `json:"product_id"`
	Quantity  int  `json:"quantity"`
}

func (r *CreateOrderRequest) Validate() []ValidationError {
	var errors []ValidationError
	if r.ProductID == 0 {
		errors = append(errors, ValidationError{Field: "product_id", Message: "Product ID is required"})
	}
	if r.Quantity <= 0 {
		r.Quantity = 1
	}
	return errors
}

// ValidationError for validation
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ProductResponse for product details
type ProductResponse struct {
	ID           uint   `json:"id"`
	SellerID     uint   `json:"seller_id"`
	SellerName   string `json:"seller_name,omitempty"`
	Name         string `json:"name"`
	Description  string `json:"description,omitempty"`
	ProductType  string `json:"product_type"`
	Price        int64  `json:"price"`
	Stock        *int   `json:"stock,omitempty"`
	IsUnlimited  bool   `json:"is_unlimited"`
	ThumbnailURL string `json:"thumbnail_url,omitempty"`
	SoldCount    int    `json:"sold_count"`
	IsActive     bool   `json:"is_active"`
	IsFeatured   bool   `json:"is_featured"`
	CreatedAt    string `json:"created_at"`
}

// OrderResponse for order details
type OrderResponse struct {
	ID          uint   `json:"id"`
	OrderCode   string `json:"order_code"`
	ProductID   uint   `json:"product_id"`
	ProductName string `json:"product_name"`
	SellerName  string `json:"seller_name,omitempty"`
	Quantity    int    `json:"quantity"`
	TotalPrice  int64  `json:"total_price"`
	FinalPrice  int64  `json:"final_price"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
	CompletedAt string `json:"completed_at,omitempty"`
}

// ToProductResponse converts entity to response
func ToProductResponse(p *Product, sellerName string) ProductResponse {
	resp := ProductResponse{
		ID:          p.ID,
		SellerID:    p.SellerID,
		SellerName:  sellerName,
		Name:        p.Name,
		ProductType: p.ProductType,
		Price:       p.Price,
		IsUnlimited: p.IsUnlimited,
		SoldCount:   p.SoldCount,
		IsActive:    p.IsActive,
		IsFeatured:  p.IsFeatured,
		CreatedAt:   p.CreatedAt.Format(time.RFC3339),
	}
	if p.Description.Valid {
		resp.Description = p.Description.String
	}
	if p.Stock.Valid {
		stock := int(p.Stock.Int64)
		resp.Stock = &stock
	}
	if p.ThumbnailURL.Valid {
		resp.ThumbnailURL = p.ThumbnailURL.String
	}
	return resp
}

// ToOrderResponse converts entity to response
func ToOrderResponse(o *Order, productName, sellerName string) OrderResponse {
	resp := OrderResponse{
		ID:          o.ID,
		OrderCode:   o.OrderCode,
		ProductID:   o.ProductID,
		ProductName: productName,
		SellerName:  sellerName,
		Quantity:    o.Quantity,
		TotalPrice:  o.TotalPrice,
		FinalPrice:  o.FinalPrice,
		Status:      o.Status,
		CreatedAt:   o.CreatedAt.Format(time.RFC3339),
	}
	if o.CompletedAt.Valid {
		resp.CompletedAt = o.CompletedAt.Time.Format(time.RFC3339)
	}
	return resp
}
