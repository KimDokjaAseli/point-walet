package middleware

import (
	"walletpoint/internal/shared/response"

	"github.com/gofiber/fiber/v2"
)

// RequireRole middleware checks if user has required role
func RequireRole(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole := c.Locals("role")
		if userRole == nil {
			return response.Unauthorized(c, "Role not found in token")
		}

		role := userRole.(string)
		for _, allowedRole := range allowedRoles {
			if role == allowedRole {
				return c.Next()
			}
		}

		return response.Forbidden(c, "Access denied: insufficient role")
	}
}

// RequireAdmin middleware requires admin role
func RequireAdmin() fiber.Handler {
	return RequireRole("admin")
}

// RequireDosen middleware requires dosen role
func RequireDosen() fiber.Handler {
	return RequireRole("dosen")
}

// RequireMahasiswa middleware requires mahasiswa role
func RequireMahasiswa() fiber.Handler {
	return RequireRole("mahasiswa")
}

// RequireDosenOrMahasiswa middleware requires dosen or mahasiswa role
func RequireDosenOrMahasiswa() fiber.Handler {
	return RequireRole("dosen", "mahasiswa")
}
