package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// HashPassword hashes a plaintext password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword compares a password with its hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateUUID generates a new UUID string
func GenerateUUID() string {
	return uuid.New().String()
}

// GenerateTransactionCode generates a readable transaction code
func GenerateTransactionCode(prefix string) string {
	now := time.Now()
	random := rand.Intn(9999)
	return fmt.Sprintf("%s-%s-%04d", prefix, now.Format("20060102"), random)
}

// GenerateHMAC generates HMAC-SHA256 signature
func GenerateHMAC(data, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}

// VerifyHMAC verifies HMAC-SHA256 signature
func VerifyHMAC(data, signature, secret string) bool {
	expected := GenerateHMAC(data, secret)
	return hmac.Equal([]byte(expected), []byte(signature))
}

// GenerateQRSignature generates signature for QR code
func GenerateQRSignature(code string, amount int64, creatorID uint, secret string) string {
	data := fmt.Sprintf("%s|%d|%d", code, amount, creatorID)
	return GenerateHMAC(data, secret)
}

// VerifyQRSignature verifies QR code signature
func VerifyQRSignature(code string, amount int64, creatorID uint, signature, secret string) bool {
	data := fmt.Sprintf("%s|%d|%d", code, amount, creatorID)
	return VerifyHMAC(data, signature, secret)
}

func init() {
	rand.Seed(time.Now().UnixNano())
}
