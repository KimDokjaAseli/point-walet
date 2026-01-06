package qr

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"walletpoint-backend/internal/middleware"
	"walletpoint-backend/internal/shared/utils"
)

// Handler handles QR HTTP requests
type Handler struct {
	service *Service
}

// NewHandler creates a new QR handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Generate generates a QR code
// POST /api/v1/qr/generate
func (h *Handler) Generate(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return utils.Unauthorized(c, "User not found")
	}

	var req GenerateQRRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	// Validate
	if req.Amount <= 0 {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "amount", "message": "Amount must be greater than 0"},
		})
	}

	result, err := h.service.GenerateQR(c.Context(), userID, req)
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	return utils.CreatedResponse(c, "QR Code generated successfully", fiber.Map{
		"qr_code": result,
	})
}

// Scan processes a QR payment
// POST /api/v1/qr/scan
func (h *Handler) Scan(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return utils.Unauthorized(c, "User not found")
	}

	var req ScanQRRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	// Get idempotency key from header
	if idempKey := c.Get("X-Idempotency-Key"); idempKey != "" {
		req.IdempotencyKey = idempKey
	}

	// Validate
	if req.QRCode == "" {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "qr_code", "message": "QR code is required"},
		})
	}

	result, err := h.service.ProcessPayment(c.Context(), userID, req)
	if err != nil {
		switch err {
		case ErrQRNotFound:
			return utils.NotFound(c, "QR Code tidak ditemukan")
		case ErrQRExpired:
			return utils.QRExpired(c)
		case ErrQRAlreadyUsed:
			return utils.QRAlreadyUsed(c)
		case ErrQRInvalidSignature:
			return utils.BadRequest(c, "QR Code tidak valid")
		case ErrCannotPaySelf:
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "CANNOT_PAY_SELF", "Tidak dapat membayar ke diri sendiri", nil)
		case ErrInsufficientBalance:
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "INSUFFICIENT_BALANCE", "Saldo tidak mencukupi", nil)
		default:
			return utils.InternalServerError(c, err.Error())
		}
	}

	if result.IsDuplicate {
		return utils.DuplicateTransaction(c, result.TransactionID)
	}

	return utils.SuccessResponse(c, "Payment successful", fiber.Map{
		"transaction": result,
	})
}

// GetByID gets QR code by ID
// GET /api/v1/qr/:id
func (h *Handler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")

	result, err := h.service.GetQRByID(c.Context(), id)
	if err != nil {
		if err == ErrQRNotFound {
			return utils.NotFound(c, "QR Code tidak ditemukan")
		}
		return utils.InternalServerError(c, err.Error())
	}

	return utils.SuccessResponse(c, "QR Code retrieved", fiber.Map{
		"qr_code": result,
	})
}

// GetMyQRCodes gets user's QR codes
// GET /api/v1/qr/my
func (h *Handler) GetMyQRCodes(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return utils.Unauthorized(c, "User not found")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	qrs, total, err := h.service.GetUserQRCodes(c.Context(), userID, page, limit)
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	_, totalPages := utils.CalculatePagination(page, limit, int(total))

	return utils.SuccessWithMeta(c, "QR Codes retrieved", fiber.Map{
		"qr_codes": qrs,
	}, &utils.Meta{
		Page:       page,
		Limit:      limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}
