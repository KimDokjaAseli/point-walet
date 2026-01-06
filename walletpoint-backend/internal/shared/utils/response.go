package utils

import (
	"github.com/gofiber/fiber/v2"
)

// Response is the standard API response structure
type Response struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Error     *ErrorInfo  `json:"error,omitempty"`
	Meta      *Meta       `json:"meta,omitempty"`
	Timestamp string      `json:"timestamp"`
	RequestID string      `json:"request_id,omitempty"`
}

// ErrorInfo contains error details
type ErrorInfo struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// Meta contains pagination info
type Meta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// SuccessResponse sends a success response
func SuccessResponse(c *fiber.Ctx, message string, data interface{}) error {
	return c.JSON(Response{
		Success:   true,
		Message:   message,
		Data:      data,
		Timestamp: GetCurrentTimestamp(),
		RequestID: c.Locals("requestid").(string),
	})
}

// SuccessWithMeta sends a success response with pagination
func SuccessWithMeta(c *fiber.Ctx, message string, data interface{}, meta *Meta) error {
	return c.JSON(Response{
		Success:   true,
		Message:   message,
		Data:      data,
		Meta:      meta,
		Timestamp: GetCurrentTimestamp(),
		RequestID: c.Locals("requestid").(string),
	})
}

// CreatedResponse sends a 201 created response
func CreatedResponse(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(Response{
		Success:   true,
		Message:   message,
		Data:      data,
		Timestamp: GetCurrentTimestamp(),
		RequestID: c.Locals("requestid").(string),
	})
}

// ErrorResponse sends an error response
func ErrorResponse(c *fiber.Ctx, status int, code string, message string, details interface{}) error {
	return c.Status(status).JSON(Response{
		Success: false,
		Error: &ErrorInfo{
			Code:    code,
			Message: message,
			Details: details,
		},
		Timestamp: GetCurrentTimestamp(),
		RequestID: c.Locals("requestid").(string),
	})
}

// BadRequest sends a 400 bad request response
func BadRequest(c *fiber.Ctx, message string) error {
	return ErrorResponse(c, fiber.StatusBadRequest, "BAD_REQUEST", message, nil)
}

// ValidationError sends a 400 validation error response
func ValidationError(c *fiber.Ctx, details interface{}) error {
	return ErrorResponse(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "Validation failed", details)
}

// Unauthorized sends a 401 unauthorized response
func Unauthorized(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Unauthorized"
	}
	return ErrorResponse(c, fiber.StatusUnauthorized, "UNAUTHORIZED", message, nil)
}

// Forbidden sends a 403 forbidden response
func Forbidden(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Access denied"
	}
	return ErrorResponse(c, fiber.StatusForbidden, "FORBIDDEN", message, nil)
}

// NotFound sends a 404 not found response
func NotFound(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Resource not found"
	}
	return ErrorResponse(c, fiber.StatusNotFound, "NOT_FOUND", message, nil)
}

// Conflict sends a 409 conflict response
func Conflict(c *fiber.Ctx, message string) error {
	return ErrorResponse(c, fiber.StatusConflict, "CONFLICT", message, nil)
}

// InternalServerError sends a 500 internal server error response
func InternalServerError(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Internal server error"
	}
	return ErrorResponse(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", message, nil)
}

// Custom error responses for wallet/QR operations

// InsufficientBalance sends balance error
func InsufficientBalance(c *fiber.Ctx, required, available, shortfall float64) error {
	return ErrorResponse(c, fiber.StatusBadRequest, "INSUFFICIENT_BALANCE", "Saldo tidak mencukupi", map[string]float64{
		"required":  required,
		"available": available,
		"shortfall": shortfall,
	})
}

// QRExpired sends QR expired error
func QRExpired(c *fiber.Ctx) error {
	return ErrorResponse(c, fiber.StatusBadRequest, "QR_EXPIRED", "QR Code sudah expired", nil)
}

// QRAlreadyUsed sends QR already used error
func QRAlreadyUsed(c *fiber.Ctx) error {
	return ErrorResponse(c, fiber.StatusBadRequest, "QR_ALREADY_USED", "QR Code sudah digunakan", nil)
}

// DuplicateTransaction sends duplicate transaction error
func DuplicateTransaction(c *fiber.Ctx, transactionID string) error {
	return c.JSON(Response{
		Success: true,
		Message: "Transaction already processed",
		Data: map[string]interface{}{
			"transaction_id": transactionID,
			"is_duplicate":   true,
		},
		Timestamp: GetCurrentTimestamp(),
		RequestID: c.Locals("requestid").(string),
	})
}
