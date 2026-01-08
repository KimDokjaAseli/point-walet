package wallet

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

// GetBalance returns user's wallet balance
func (h *Handler) GetBalance(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	balance, err := h.service.GetBalance(c.Context(), userID)
	if err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Balance retrieved successfully", balance)
}

// GetHistory returns transaction history
func (h *Handler) GetHistory(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	txType := c.Query("type", "")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	params := HistoryParams{
		Page:    page,
		PerPage: perPage,
		Type:    txType,
	}

	transactions, total, err := h.service.GetHistory(c.Context(), userID, params)
	if err != nil {
		return handleError(c, err)
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, "Transaction history retrieved", transactions, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// GetLedger returns ledger entries
func (h *Handler) GetLedger(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	entries, total, err := h.service.GetLedger(c.Context(), userID, page, perPage)
	if err != nil {
		return handleError(c, err)
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, "Ledger entries retrieved", entries, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// Transfer handles point transfer (dosen to mahasiswa)
func (h *Handler) Transfer(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req TransferRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	// Get idempotency key from header if not in body
	if req.IdempotencyKey == "" {
		req.IdempotencyKey = c.Get("X-Idempotency-Key")
	}

	// Validate request
	if errors := req.Validate(); len(errors) > 0 {
		return response.ErrorWithDetails(c, fiber.StatusBadRequest, "Validation failed", "VALIDATION_ERROR", toResponseErrors(errors))
	}

	result, err := h.service.Transfer(c.Context(), userID, req)
	if err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Transfer successful", result)
}

// AdjustBalance handles admin balance adjustment
func (h *Handler) AdjustBalance(c *fiber.Ctx) error {
	adminID := c.Locals("userID").(uint)

	var req AdjustBalanceRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	// Get idempotency key from header if not in body
	if req.IdempotencyKey == "" {
		req.IdempotencyKey = c.Get("X-Idempotency-Key")
	}

	// Validate request
	if errors := req.Validate(); len(errors) > 0 {
		return response.ErrorWithDetails(c, fiber.StatusBadRequest, "Validation failed", "VALIDATION_ERROR", toResponseErrors(errors))
	}

	result, err := h.service.AdjustBalance(c.Context(), adminID, req)
	if err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Balance adjusted successfully", result)
}

func handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*apperrors.AppError); ok {
		switch appErr.Code {
		case "WALLET_NOT_FOUND", "RECIPIENT_NOT_FOUND":
			return response.NotFound(c, appErr.Message)
		case "INSUFFICIENT_BALANCE":
			return response.Error(c, fiber.StatusPaymentRequired, appErr.Message, appErr.Code)
		case "WALLET_FROZEN", "RECIPIENT_FROZEN":
			return response.Forbidden(c, appErr.Message)
		case "CANNOT_TRANSFER_SELF":
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
