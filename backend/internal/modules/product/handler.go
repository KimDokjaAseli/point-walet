package product

import (
	"strconv"

	apperrors "walletpoint/internal/shared/errors"
	"walletpoint/internal/shared/response"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// CreateProduct creates a new product
func (h *Handler) CreateProduct(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if errors := req.Validate(); len(errors) > 0 {
		return response.ErrorWithDetails(c, fiber.StatusBadRequest, "Validation failed", "VALIDATION_ERROR", toResponseErrors(errors))
	}

	result, err := h.service.CreateProduct(c.Context(), req, userID)
	if err != nil {
		return handleError(c, err)
	}

	return response.Created(c, "Product created successfully", result)
}

// GetProductByID gets product details
func (h *Handler) GetProductByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid product ID")
	}

	result, err := h.service.GetProductByID(c.Context(), uint(id))
	if err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Product retrieved", result)
}

// GetActiveProducts lists active products
func (h *Handler) GetActiveProducts(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	products, total, err := h.service.GetActiveProducts(c.Context(), page, perPage)
	if err != nil {
		return handleError(c, err)
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, "Products retrieved", products, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// GetMyProducts lists products created by user
func (h *Handler) GetMyProducts(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	products, total, err := h.service.GetMyProducts(c.Context(), userID, page, perPage)
	if err != nil {
		return handleError(c, err)
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, "Products retrieved", products, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// UpdateProduct updates a product
func (h *Handler) UpdateProduct(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid product ID")
	}

	var req UpdateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if err := h.service.UpdateProduct(c.Context(), uint(id), req, userID); err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Product updated successfully", nil)
}

// DeleteProduct deletes a product
func (h *Handler) DeleteProduct(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid product ID")
	}

	if err := h.service.DeleteProduct(c.Context(), uint(id), userID); err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Product deleted successfully", nil)
}

// CreateOrder creates a new order
func (h *Handler) CreateOrder(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req CreateOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if errors := req.Validate(); len(errors) > 0 {
		return response.ErrorWithDetails(c, fiber.StatusBadRequest, "Validation failed", "VALIDATION_ERROR", toResponseErrors(errors))
	}

	result, err := h.service.CreateOrder(c.Context(), req, userID)
	if err != nil {
		return handleError(c, err)
	}

	return response.Created(c, "Order created successfully", result)
}

// GetMyOrders lists user's orders
func (h *Handler) GetMyOrders(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	orders, total, err := h.service.GetMyOrders(c.Context(), userID, page, perPage)
	if err != nil {
		return handleError(c, err)
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, "Orders retrieved", orders, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

func handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*apperrors.AppError); ok {
		switch appErr.Code {
		case "NOT_FOUND", "PRODUCT_NOT_FOUND":
			return response.NotFound(c, appErr.Message)
		case "FORBIDDEN":
			return response.Forbidden(c, appErr.Message)
		case "INSUFFICIENT_BALANCE":
			return response.Error(c, fiber.StatusPaymentRequired, appErr.Message, appErr.Code)
		case "PRODUCT_NOT_ACTIVE", "OUT_OF_STOCK", "CANNOT_BUY_OWN":
			return response.BadRequest(c, appErr.Message)
		default:
			return response.InternalError(c, appErr.Message)
		}
	}
	return response.InternalError(c, "Internal server error")
}

func toResponseErrors(errors []ValidationError) []response.ValidationError {
	result := make([]response.ValidationError, len(errors))
	for i, e := range errors {
		result[i] = response.ValidationError{
			Field:   e.Field,
			Message: e.Message,
		}
	}
	return result
}
