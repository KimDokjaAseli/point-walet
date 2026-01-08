package middleware

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// RateLimitConfig holds rate limit configuration
type RateLimitConfig struct {
	Max        int
	Expiration time.Duration
}

// Default rate limit configurations
var rateLimitConfigs = map[string]RateLimitConfig{
	"default": {
		Max:        100,
		Expiration: 1 * time.Minute,
	},
	"auth": {
		Max:        10,
		Expiration: 1 * time.Minute,
	},
	"transaction": {
		Max:        30,
		Expiration: 1 * time.Minute,
	},
	"qr_scan": {
		Max:        20,
		Expiration: 1 * time.Minute,
	},
}

// RateLimiter creates a rate limiter middleware
func RateLimiter(configName string) fiber.Handler {
	cfg, exists := rateLimitConfigs[configName]
	if !exists {
		cfg = rateLimitConfigs["default"]
	}

	return limiter.New(limiter.Config{
		Max:        cfg.Max,
		Expiration: cfg.Expiration,
		KeyGenerator: func(c *fiber.Ctx) string {
			if userID := c.Locals("userID"); userID != nil {
				return fmt.Sprintf("%s:user:%d", configName, userID)
			}
			return fmt.Sprintf("%s:ip:%s", configName, c.IP())
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"message": "Too many requests. Please try again later.",
				"error": fiber.Map{
					"code": "RATE_LIMIT_EXCEEDED",
				},
			})
		},
	})
}

// DefaultRateLimiter creates default rate limiter
func DefaultRateLimiter() fiber.Handler {
	return RateLimiter("default")
}

// AuthRateLimiter creates rate limiter for auth endpoints
func AuthRateLimiter() fiber.Handler {
	return RateLimiter("auth")
}

// TransactionRateLimiter creates rate limiter for transaction endpoints
func TransactionRateLimiter() fiber.Handler {
	return RateLimiter("transaction")
}

// QRScanRateLimiter creates rate limiter for QR scan endpoints
func QRScanRateLimiter() fiber.Handler {
	return RateLimiter("qr_scan")
}
