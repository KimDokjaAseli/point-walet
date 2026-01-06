package admin

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/middleware"
	"walletpoint-backend/internal/modules/wallet"
	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Module represents admin module
type Module struct {
	db            *gorm.DB
	config        *config.Config
	walletService *wallet.Service
}

// NewModule creates admin module
func NewModule(db *gorm.DB, cfg *config.Config, walletSvc *wallet.Service) *Module {
	return &Module{
		db:            db,
		config:        cfg,
		walletService: walletSvc,
	}
}

// RegisterRoutes registers admin routes
func (m *Module) RegisterRoutes(router fiber.Router, authMiddleware *middleware.AuthMiddleware) {
	admin := router.Group("/admin")
	admin.Use(authMiddleware.Protected())
	admin.Use(authMiddleware.RequireAdmin())

	admin.Get("/stats", m.GetStats)
	admin.Get("/transactions", m.GetAllTransactions)
	admin.Post("/topup", m.TopUpUser)
	admin.Get("/audit", m.GetAuditLogs)
}

// GetStats returns admin statistics
func (m *Module) GetStats(c *fiber.Ctx) error {
	var totalUsers int64
	var totalTransactions int64
	var totalProducts int64

	m.db.Model(&models.User{}).Count(&totalUsers)
	m.db.Model(&models.Transaction{}).Count(&totalTransactions)
	m.db.Model(&models.Product{}).Where("status = 'active'").Count(&totalProducts)

	return utils.SuccessResponse(c, "Stats retrieved", fiber.Map{
		"total_users":        totalUsers,
		"total_transactions": totalTransactions,
		"total_products":     totalProducts,
	})
}

// GetAllTransactions returns all transactions
func (m *Module) GetAllTransactions(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	var transactions []models.Transaction
	var total int64

	m.db.Model(&models.Transaction{}).Count(&total)
	offset, totalPages := utils.CalculatePagination(page, limit, int(total))

	m.db.Preload("Sender").Preload("Receiver").Order("created_at DESC").Offset(offset).Limit(limit).Find(&transactions)

	txDtos := make([]fiber.Map, len(transactions))
	for i, tx := range transactions {
		senderName := ""
		if tx.Sender != nil {
			senderName = tx.Sender.Name
		}
		receiverName := ""
		if tx.Receiver != nil {
			receiverName = tx.Receiver.Name
		}
		txDtos[i] = fiber.Map{
			"id":          tx.ID,
			"sender_id":   tx.SenderID,
			"receiver_id": tx.ReceiverID,
			"type":        tx.Type,
			"amount":      tx.Amount,
			"status":      tx.Status,
			"created_at":  tx.CreatedAt,
			"sender": fiber.Map{
				"name": senderName,
			},
			"receiver": fiber.Map{
				"name": receiverName,
			},
		}
	}

	return utils.SuccessWithMeta(c, "Transactions retrieved", fiber.Map{
		"transactions": txDtos,
	}, &utils.Meta{
		Page:       page,
		Limit:      limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}

// TopUpUser tops up a user's wallet
func (m *Module) TopUpUser(c *fiber.Ctx) error {
	adminID := middleware.GetUserID(c)

	var req struct {
		UserID      string  `json:"user_id"`
		Amount      float64 `json:"amount"`
		Description string  `json:"description"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request")
	}

	if req.UserID == "" || req.Amount <= 0 {
		return utils.BadRequest(c, "User ID and amount are required")
	}

	// Generate idempotency key
	idempotencyKey := c.Get("X-Idempotency-Key")
	if idempotencyKey == "" {
		idempotencyKey = utils.GenerateUUID()
	}

	description := req.Description
	if description == "" {
		description = "Admin Top-up"
	}

	// Credit points to user
	tx, err := m.walletService.CreditPoints(
		c.Context(),
		req.UserID,
		req.Amount,
		"ADMIN_TOPUP",
		description,
		idempotencyKey,
	)

	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	// Get updated wallet
	userWallet, _ := m.walletService.GetWallet(c.Context(), req.UserID)
	balance := float64(0)
	if userWallet != nil {
		balance = userWallet.Balance
	}

	// Log audit
	ip := c.IP()
	m.db.Create(&models.AuditLog{
		ID:         utils.GenerateUUID(),
		UserID:     &adminID,
		Action:     "ADMIN_TOPUP",
		EntityType: "wallet",
		EntityID:   &req.UserID,
		IPAddress:  &ip,
	})

	return utils.SuccessResponse(c, "Top-up successful", fiber.Map{
		"transaction": fiber.Map{
			"id":     tx.ID,
			"amount": tx.Amount,
			"status": tx.Status,
		},
		"wallet": fiber.Map{
			"user_id": req.UserID,
			"balance": balance,
		},
	})
}

// GetAuditLogs returns audit logs
func (m *Module) GetAuditLogs(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	var logs []models.AuditLog
	var total int64

	m.db.Model(&models.AuditLog{}).Count(&total)
	offset, totalPages := utils.CalculatePagination(page, limit, int(total))

	m.db.Preload("User").Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs)

	logDtos := make([]fiber.Map, len(logs))
	for i, log := range logs {
		userName := ""
		if log.User != nil {
			userName = log.User.Name
		}
		logDtos[i] = fiber.Map{
			"id":            log.ID,
			"user_id":       log.UserID,
			"action":        log.Action,
			"resource_type": log.EntityType,
			"resource_id":   log.EntityID,
			"ip_address":    log.IPAddress,
			"created_at":    log.CreatedAt,
			"user": fiber.Map{
				"name": userName,
			},
		}
	}

	return utils.SuccessWithMeta(c, "Audit logs retrieved", fiber.Map{
		"logs": logDtos,
	}, &utils.Meta{
		Page:       page,
		Limit:      limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}
