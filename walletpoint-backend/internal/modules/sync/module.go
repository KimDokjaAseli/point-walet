package sync

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/middleware"
	"walletpoint-backend/internal/modules/wallet"
	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Module represents the sync module
type Module struct {
	db            *gorm.DB
	config        *config.Config
	walletService *wallet.Service
}

// NewModule creates a new sync module
func NewModule(db *gorm.DB, cfg *config.Config, walletSvc *wallet.Service) *Module {
	return &Module{
		db:            db,
		config:        cfg,
		walletService: walletSvc,
	}
}

// RegisterRoutes registers sync routes
func (m *Module) RegisterRoutes(router fiber.Router, authMiddleware *middleware.AuthMiddleware) {
	sync := router.Group("/sync")

	// Webhook endpoint (API key auth)
	sync.Post("/points", m.SyncPoints)

	// Admin: view sync logs
	sync.Get("/logs", authMiddleware.Protected(), authMiddleware.RequireAdmin(), m.GetSyncLogs)
}

// SyncPoints receives points from external system
func (m *Module) SyncPoints(c *fiber.Ctx) error {
	// Verify API key
	apiKey := c.Get("X-API-Key")
	if apiKey != m.config.SyncAPIKey {
		return utils.Unauthorized(c, "Invalid API key")
	}

	// Verify signature (optional)
	signature := c.Get("X-Signature")

	var req struct {
		ExternalUserID string  `json:"external_user_id"`
		Points         float64 `json:"points"`
		Source         string  `json:"source"`
		ReferenceID    string  `json:"reference_id"`
		Timestamp      string  `json:"timestamp"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	// Validate signature if provided
	if signature != "" && m.config.SyncAPIKey != "" {
		payload := req.ExternalUserID + ":" + req.ReferenceID + ":" + req.Timestamp
		h := hmac.New(sha256.New, []byte(m.config.SyncAPIKey))
		h.Write([]byte(payload))
		expectedSig := hex.EncodeToString(h.Sum(nil))
		if signature != expectedSig {
			m.logSync(req.Source, req.ExternalUserID, nil, req.ReferenceID, req.Points, "FAILED", "Invalid signature", string(c.Body()), "")
			return utils.Unauthorized(c, "Invalid signature")
		}
	}

	// Check for duplicate reference
	var existingLog models.SyncLog
	if err := m.db.First(&existingLog, "reference_id = ? AND status = 'SUCCESS'", req.ReferenceID).Error; err == nil {
		m.logSync(req.Source, req.ExternalUserID, nil, req.ReferenceID, req.Points, "DUPLICATE", "Already synced", string(c.Body()), "")
		return utils.Conflict(c, "Reference ID already synced")
	}

	// Map external user ID to internal user
	// In production, you would have a mapping table
	// For now, we'll search by nim_nip
	var user models.User
	if err := m.db.First(&user, "nim_nip = ?", req.ExternalUserID).Error; err != nil {
		m.logSync(req.Source, req.ExternalUserID, nil, req.ReferenceID, req.Points, "FAILED", "User not found", string(c.Body()), "")
		return utils.NotFound(c, "User not found for external ID: "+req.ExternalUserID)
	}

	// Credit points
	idempotencyKey := "sync_" + req.ReferenceID
	transaction, err := m.walletService.CreditPoints(
		context.Background(),
		user.ID,
		req.Points,
		"SYNC",
		"Sync from "+req.Source+": "+req.ReferenceID,
		idempotencyKey,
	)

	if err != nil {
		m.logSync(req.Source, req.ExternalUserID, &user.ID, req.ReferenceID, req.Points, "FAILED", err.Error(), string(c.Body()), "")
		return utils.InternalServerError(c, "Failed to credit points")
	}

	// Log success
	responsePayload := `{"transaction_id":"` + transaction.ID + `"}`
	m.logSync(req.Source, req.ExternalUserID, &user.ID, req.ReferenceID, req.Points, "SUCCESS", "", string(c.Body()), responsePayload)

	// Get updated balance
	wallet, _ := m.walletService.GetWallet(context.Background(), user.ID)
	newBalance := float64(0)
	if wallet != nil {
		newBalance = wallet.Balance
	}

	return utils.SuccessResponse(c, "Points synced successfully", fiber.Map{
		"transaction_id":   transaction.ID,
		"internal_user_id": user.ID,
		"points_added":     req.Points,
		"new_balance":      newBalance,
	})
}

// logSync logs a sync operation
func (m *Module) logSync(source, externalUserID string, internalUserID *string, referenceID string, points float64, status, errorMsg, reqPayload, respPayload string) {
	log := models.SyncLog{
		ID:              utils.GenerateUUID(),
		ExternalSystem:  source,
		ExternalUserID:  &externalUserID,
		InternalUserID:  internalUserID,
		ReferenceID:     &referenceID,
		PointsSynced:    &points,
		Status:          status,
		RequestPayload:  &reqPayload,
		ResponsePayload: &respPayload,
	}
	if errorMsg != "" {
		log.ErrorMessage = &errorMsg
	}
	m.db.Create(&log)
}

// GetSyncLogs gets sync logs
func (m *Module) GetSyncLogs(c *fiber.Ctx) error {
	var logs []models.SyncLog

	status := c.Query("status", "")
	query := m.db.Model(&models.SyncLog{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Order("created_at DESC").Limit(100).Find(&logs)

	dtos := make([]fiber.Map, len(logs))
	for i, l := range logs {
		dtos[i] = fiber.Map{
			"id":               l.ID,
			"external_system":  l.ExternalSystem,
			"external_user_id": l.ExternalUserID,
			"internal_user_id": l.InternalUserID,
			"reference_id":     l.ReferenceID,
			"points_synced":    l.PointsSynced,
			"status":           l.Status,
			"error_message":    l.ErrorMessage,
			"created_at":       l.CreatedAt.Format(time.RFC3339),
		}
	}

	return utils.SuccessResponse(c, "Sync logs retrieved", fiber.Map{
		"logs": dtos,
	})
}
