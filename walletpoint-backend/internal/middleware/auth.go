package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/shared/utils"
)

// Claims represents JWT claims
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// AuthMiddleware provides authentication middleware
type AuthMiddleware struct {
	config *config.Config
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(cfg *config.Config) *AuthMiddleware {
	return &AuthMiddleware{config: cfg}
}

// Protected requires a valid JWT token
func (m *AuthMiddleware) Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return utils.Unauthorized(c, "Missing authorization header")
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return utils.Unauthorized(c, "Invalid authorization header format")
		}

		tokenString := parts[1]
		claims, err := m.ValidateToken(tokenString)
		if err != nil {
			return utils.Unauthorized(c, "Invalid or expired token")
		}

		// Store user info in context
		c.Locals("user_id", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}

// RequireRole requires specific roles
func (m *AuthMiddleware) RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole := c.Locals("role")
		if userRole == nil {
			return utils.Unauthorized(c, "User role not found")
		}

		roleStr := userRole.(string)
		for _, role := range roles {
			if roleStr == role {
				return c.Next()
			}
		}

		return utils.Forbidden(c, "You don't have permission to access this resource")
	}
}

// RequireAdmin requires admin role
func (m *AuthMiddleware) RequireAdmin() fiber.Handler {
	return m.RequireRole("admin")
}

// RequireDosen requires dosen role
func (m *AuthMiddleware) RequireDosen() fiber.Handler {
	return m.RequireRole("dosen")
}

// RequireMahasiswa requires mahasiswa role
func (m *AuthMiddleware) RequireMahasiswa() fiber.Handler {
	return m.RequireRole("mahasiswa")
}

// RequireDosenOrMahasiswa requires dosen or mahasiswa role
func (m *AuthMiddleware) RequireDosenOrMahasiswa() fiber.Handler {
	return m.RequireRole("dosen", "mahasiswa")
}

// GenerateAccessToken generates a new JWT access token
func (m *AuthMiddleware) GenerateAccessToken(userID, email, role string) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.config.JWTAccessExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "walletpoint",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.config.JWTSecret))
}

// GenerateRefreshToken generates a new refresh token
func (m *AuthMiddleware) GenerateRefreshToken(userID string) (string, time.Time, error) {
	expiresAt := time.Now().Add(m.config.JWTRefreshExpiry)

	claims := jwt.RegisteredClaims{
		Subject:   userID,
		ExpiresAt: jwt.NewNumericDate(expiresAt),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    "walletpoint-refresh",
		ID:        utils.GenerateUUID(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(m.config.JWTSecret))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

// ValidateToken validates a JWT token and returns claims
func (m *AuthMiddleware) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(m.config.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrTokenInvalidClaims
}

// ValidateRefreshToken validates a refresh token
func (m *AuthMiddleware) ValidateRefreshToken(tokenString string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(m.config.JWTSecret), nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(*jwt.RegisteredClaims); ok && token.Valid {
		return claims.Subject, nil
	}

	return "", jwt.ErrTokenInvalidClaims
}

// GetUserID gets user ID from context
func GetUserID(c *fiber.Ctx) string {
	if userID := c.Locals("user_id"); userID != nil {
		return userID.(string)
	}
	return ""
}

// GetUserRole gets user role from context
func GetUserRole(c *fiber.Ctx) string {
	if role := c.Locals("role"); role != nil {
		return role.(string)
	}
	return ""
}

// GetUserEmail gets user email from context
func GetUserEmail(c *fiber.Ctx) string {
	if email := c.Locals("email"); email != nil {
		return email.(string)
	}
	return ""
}
