package middleware

import (
	"errors"

	"github.com/gofiber/fiber/v2"
)

// ErrorHandler is the global error handler for Fiber
func ErrorHandler(c *fiber.Ctx, err error) error {
	// Default status code
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	// Check if it's a Fiber error
	var e *fiber.Error
	if errors.As(err, &e) {
		code = e.Code
		message = e.Message
	}

	// Return JSON error response
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error": fiber.Map{
			"code":    getErrorCode(code),
			"message": message,
		},
		"timestamp":  GetTimestamp(),
		"request_id": c.Locals("requestid"),
	})
}

func getErrorCode(status int) string {
	switch status {
	case fiber.StatusBadRequest:
		return "BAD_REQUEST"
	case fiber.StatusUnauthorized:
		return "UNAUTHORIZED"
	case fiber.StatusForbidden:
		return "FORBIDDEN"
	case fiber.StatusNotFound:
		return "NOT_FOUND"
	case fiber.StatusConflict:
		return "CONFLICT"
	case fiber.StatusTooManyRequests:
		return "TOO_MANY_REQUESTS"
	case fiber.StatusInternalServerError:
		return "INTERNAL_ERROR"
	default:
		return "UNKNOWN_ERROR"
	}
}

// GetTimestamp returns current timestamp string
func GetTimestamp() string {
	return fiber.New().Config().AppName
}
