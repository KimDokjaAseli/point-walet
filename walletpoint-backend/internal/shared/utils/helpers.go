package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/google/uuid"
)

// GenerateUUID generates a new UUID string
func GenerateUUID() string {
	return uuid.New().String()
}

// GetCurrentTimestamp returns current time in ISO 8601 format
func GetCurrentTimestamp() string {
	return time.Now().Format(time.RFC3339)
}

// CreateHMACSignature creates an HMAC-SHA256 signature
func CreateHMACSignature(payload, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	return hex.EncodeToString(h.Sum(nil))
}

// VerifyHMACSignature verifies an HMAC-SHA256 signature
func VerifyHMACSignature(payload, signature, secret string) bool {
	expected := CreateHMACSignature(payload, secret)
	return hmac.Equal([]byte(expected), []byte(signature))
}

// GenerateQRCode generates a unique QR code string
func GenerateQRCode() string {
	return "QR_" + uuid.New().String()[:12]
}

// GenerateIdempotencyKey generates an idempotency key
func GenerateIdempotencyKey(prefix string) string {
	timestamp := time.Now().Unix()
	random := uuid.New().String()[:8]
	return prefix + "_" + string(rune(timestamp)) + "_" + random
}

// Ptr returns a pointer to the given value
func Ptr[T any](v T) *T {
	return &v
}

// Deref safely dereferences a pointer, returning default value if nil
func Deref[T any](p *T, defaultVal T) T {
	if p == nil {
		return defaultVal
	}
	return *p
}

// CalculatePagination calculates pagination values
func CalculatePagination(page, limit, total int) (offset int, totalPages int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	offset = (page - 1) * limit
	totalPages = (total + limit - 1) / limit

	return offset, totalPages
}
