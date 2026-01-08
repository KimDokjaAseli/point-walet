package qr

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

// CreateQR creates a new QR code
func (h *Handler) CreateQR(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req CreateQRRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if errors := req.Validate(); len(errors) > 0 {
		return response.ErrorWithDetails(c, fiber.StatusBadRequest, "Validation failed", "VALIDATION_ERROR", toResponseErrors(errors))
	}

	result, err := h.service.CreateQR(c.Context(), req, userID)
	if err != nil {
		return handleError(c, err)
	}

	return response.Created(c, "QR Code created successfully", result)
}

// GetQRDetail gets QR code details
func (h *Handler) GetQRDetail(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid QR ID")
	}

	result, err := h.service.GetByID(c.Context(), uint(id), userID)
	if err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "QR Code retrieved", result)
}

// GetMyQRs lists user's QR codes
func (h *Handler) GetMyQRs(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	result, total, err := h.service.GetMyQRs(c.Context(), userID, page, perPage)
	if err != nil {
		return handleError(c, err)
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, "QR Codes retrieved", result, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// CancelQR cancels a QR code
func (h *Handler) CancelQR(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid QR ID")
	}

	if err := h.service.CancelQR(c.Context(), uint(id), userID); err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "QR Code cancelled", nil)
}

// ProcessPayment processes QR payment
func (h *Handler) ProcessPayment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req ProcessQRRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	// Get idempotency key from header
	if req.IdempotencyKey == "" {
		req.IdempotencyKey = c.Get("X-Idempotency-Key")
	}

	if errors := req.Validate(); len(errors) > 0 {
		return response.ErrorWithDetails(c, fiber.StatusBadRequest, "Validation failed", "VALIDATION_ERROR", toResponseErrors(errors))
	}

	result, err := h.service.ProcessPayment(c.Context(), req, userID)
	if err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Payment successful", result)
}

func handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*apperrors.AppError); ok {
		switch appErr.Code {
		case "QR_NOT_FOUND":
			return response.NotFound(c, appErr.Message)
		case "QR_EXPIRED":
			return response.Error(c, fiber.StatusGone, appErr.Message, appErr.Code)
		case "QR_ALREADY_USED":
			return response.Conflict(c, appErr.Message)
		case "INSUFFICIENT_BALANCE":
			return response.Error(c, fiber.StatusPaymentRequired, appErr.Message, appErr.Code)
		case "WALLET_FROZEN", "FORBIDDEN", "CANNOT_PAY_SELF":
			return response.Forbidden(c, appErr.Message)
		case "QR_INVALID_SIGNATURE", "QR_NOT_ACTIVE":
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
