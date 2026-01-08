package response

import "github.com/gofiber/fiber/v2"

// Standard API Response
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
	Error   *ErrorInfo  `json:"error,omitempty"`
}

type Meta struct {
	Page       int `json:"page,omitempty"`
	PerPage    int `json:"per_page,omitempty"`
	Total      int `json:"total,omitempty"`
	TotalPages int `json:"total_pages,omitempty"`
}

type ErrorInfo struct {
	Code    string                 `json:"code"`
	Details []ValidationError      `json:"details,omitempty"`
	Extra   map[string]interface{} `json:"extra,omitempty"`
}

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Success response helpers
func Success(c *fiber.Ctx, message string, data interface{}) error {
	return c.JSON(Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func SuccessWithMeta(c *fiber.Ctx, message string, data interface{}, meta *Meta) error {
	return c.JSON(Response{
		Success: true,
		Message: message,
		Data:    data,
		Meta:    meta,
	})
}

func Created(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// Error response helpers
func Error(c *fiber.Ctx, status int, message string, code string) error {
	return c.Status(status).JSON(Response{
		Success: false,
		Message: message,
		Error: &ErrorInfo{
			Code: code,
		},
	})
}

func ErrorWithDetails(c *fiber.Ctx, status int, message string, code string, details []ValidationError) error {
	return c.Status(status).JSON(Response{
		Success: false,
		Message: message,
		Error: &ErrorInfo{
			Code:    code,
			Details: details,
		},
	})
}

func BadRequest(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusBadRequest, message, "BAD_REQUEST")
}

func Unauthorized(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusUnauthorized, message, "UNAUTHORIZED")
}

func Forbidden(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusForbidden, message, "FORBIDDEN")
}

func NotFound(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusNotFound, message, "NOT_FOUND")
}

func Conflict(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusConflict, message, "CONFLICT")
}

func InternalError(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusInternalServerError, message, "INTERNAL_ERROR")
}
