package audit

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/middleware"
	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Module represents the audit module
type Module struct {
	db *gorm.DB
}

// NewModule creates a new audit module
func NewModule(db *gorm.DB, cfg *config.Config) *Module {
	return &Module{db: db}
}

// RegisterRoutes registers audit routes
func (m *Module) RegisterRoutes(router fiber.Router, authMiddleware *middleware.AuthMiddleware) {
	audit := router.Group("/admin/audit")
	audit.Use(authMiddleware.Protected())
	audit.Use(authMiddleware.RequireAdmin())

	audit.Get("/", m.GetAuditLogs)
	audit.Get("/user/:user_id", m.GetUserAuditLogs)
}

// GetAuditLogs gets all audit logs
func (m *Module) GetAuditLogs(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	action := c.Query("action", "")
	entityType := c.Query("entity_type", "")
	startDate := c.Query("start_date", "")
	endDate := c.Query("end_date", "")

	var logs []models.AuditLog
	var total int64

	query := m.db.Model(&models.AuditLog{})

	if action != "" {
		query = query.Where("action = ?", action)
	}
	if entityType != "" {
		query = query.Where("entity_type = ?", entityType)
	}
	if startDate != "" {
		t, _ := time.Parse("2006-01-02", startDate)
		query = query.Where("created_at >= ?", t)
	}
	if endDate != "" {
		t, _ := time.Parse("2006-01-02", endDate)
		query = query.Where("created_at <= ?", t.Add(24*time.Hour))
	}

	query.Count(&total)
	offset, totalPages := utils.CalculatePagination(page, limit, int(total))

	query.Preload("User").Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs)

	dtos := make([]fiber.Map, len(logs))
	for i, l := range logs {
		userName := ""
		if l.User != nil {
			userName = l.User.Name
		}
		dtos[i] = fiber.Map{
			"id":          l.ID,
			"user_id":     l.UserID,
			"user_name":   userName,
			"action":      l.Action,
			"entity_type": l.EntityType,
			"entity_id":   l.EntityID,
			"old_value":   l.OldValue,
			"new_value":   l.NewValue,
			"ip_address":  l.IPAddress,
			"created_at":  l.CreatedAt.Format(time.RFC3339),
		}
	}

	return utils.SuccessWithMeta(c, "Audit logs retrieved", fiber.Map{
		"audit_logs": dtos,
	}, &utils.Meta{
		Page:       page,
		Limit:      limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}

// GetUserAuditLogs gets audit logs for a specific user
func (m *Module) GetUserAuditLogs(c *fiber.Ctx) error {
	userID := c.Params("user_id")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	var logs []models.AuditLog
	var total int64

	query := m.db.Model(&models.AuditLog{}).Where("user_id = ?", userID)
	query.Count(&total)
	offset, totalPages := utils.CalculatePagination(page, limit, int(total))

	query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs)

	return utils.SuccessWithMeta(c, "User audit logs retrieved", fiber.Map{
		"audit_logs": logs,
	}, &utils.Meta{
		Page:       page,
		Limit:      limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}

// CreateAuditLog creates an audit log entry (utility function for other modules)
func CreateAuditLog(db *gorm.DB, userID *string, action, entityType string, entityID *string, oldValue, newValue interface{}, ipAddress, userAgent string) {
	oldJSON := ""
	newJSON := ""

	// Convert to JSON string if needed
	if oldValue != nil {
		if str, ok := oldValue.(string); ok {
			oldJSON = str
		}
	}
	if newValue != nil {
		if str, ok := newValue.(string); ok {
			newJSON = str
		}
	}

	log := models.AuditLog{
		ID:         utils.GenerateUUID(),
		UserID:     userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		OldValue:   &oldJSON,
		NewValue:   &newJSON,
		IPAddress:  &ipAddress,
		UserAgent:  &userAgent,
	}

	db.Create(&log)
}
