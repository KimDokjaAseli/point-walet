package mission

import (
	"context"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"walletpoint-backend/config"
	"walletpoint-backend/internal/middleware"
	"walletpoint-backend/internal/modules/wallet"
	"walletpoint-backend/internal/shared/models"
	"walletpoint-backend/internal/shared/utils"
)

// Module represents the mission module
type Module struct {
	db            *gorm.DB
	walletService *wallet.Service
}

// NewModule creates a new mission module
func NewModule(db *gorm.DB, cfg *config.Config, walletSvc *wallet.Service) *Module {
	return &Module{
		db:            db,
		walletService: walletSvc,
	}
}

// RegisterRoutes registers mission routes
func (m *Module) RegisterRoutes(router fiber.Router, authMiddleware *middleware.AuthMiddleware) {
	missions := router.Group("/missions")

	// Public: list missions
	missions.Get("/", m.GetMissions)
	missions.Get("/:id", m.GetMissionByID)

	// Protected routes
	missions.Use(authMiddleware.Protected())

	// Dosen or Admin: create/manage missions
	missions.Post("/", authMiddleware.RequireRole("dosen", "admin"), m.CreateMission)
	missions.Put("/:id", authMiddleware.RequireRole("dosen", "admin"), m.UpdateMission)
	missions.Delete("/:id", authMiddleware.RequireRole("dosen", "admin"), m.DeleteMission)

	// Mahasiswa & Dosen: join and claim
	missions.Post("/:id/join", m.JoinMission)
	missions.Post("/:id/complete", m.CompleteMission)
	missions.Post("/:id/claim", m.ClaimReward)
	missions.Get("/:id/my-progress", m.GetMyProgress)
}

// GetMissions gets all active missions
func (m *Module) GetMissions(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	missionType := c.Query("type", "")

	var missions []models.Mission
	var total int64

	query := m.db.Model(&models.Mission{}).Where("status != 'cancelled'")
	if missionType != "" {
		query = query.Where("type = ?", missionType)
	}

	query.Count(&total)
	offset, totalPages := utils.CalculatePagination(page, limit, int(total))

	query.Preload("Creator").Order("created_at DESC").Offset(offset).Limit(limit).Find(&missions)

	dtos := make([]fiber.Map, len(missions))
	for i, m := range missions {
		creatorName := ""
		if m.Creator != nil {
			creatorName = m.Creator.Name
		}
		dtos[i] = fiber.Map{
			"id":                   m.ID,
			"title":                m.Title,
			"description":          m.Description,
			"points_reward":        m.PointsReward,
			"type":                 m.Type,
			"status":               m.Status,
			"current_participants": m.CurrentParticipants,
			"max_participants":     m.MaxParticipants,
			"start_date":           m.StartDate,
			"end_date":             m.EndDate,
			"creator": fiber.Map{
				"id":   m.CreatorID,
				"name": creatorName,
			},
		}
	}

	return utils.SuccessWithMeta(c, "Missions retrieved", fiber.Map{
		"missions": dtos,
	}, &utils.Meta{
		Page:       page,
		Limit:      limit,
		Total:      int(total),
		TotalPages: totalPages,
	})
}

// GetMissionByID gets mission by ID
func (m *Module) GetMissionByID(c *fiber.Ctx) error {
	id := c.Params("id")

	var mission models.Mission
	if err := m.db.Preload("Creator").First(&mission, "id = ?", id).Error; err != nil {
		return utils.NotFound(c, "Mission not found")
	}

	return utils.SuccessResponse(c, "Mission retrieved", fiber.Map{
		"mission": mission,
	})
}

// CreateMission creates a mission
func (m *Module) CreateMission(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req struct {
		Title           string  `json:"title"`
		Description     string  `json:"description"`
		PointsReward    float64 `json:"points_reward"`
		Type            string  `json:"type"`
		MaxParticipants int     `json:"max_participants"`
		StartDate       string  `json:"start_date"`
		EndDate         string  `json:"end_date"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request")
	}

	mission := models.Mission{
		ID:              utils.GenerateUUID(),
		CreatorID:       userID,
		Title:           req.Title,
		Description:     &req.Description,
		PointsReward:    req.PointsReward,
		Type:            req.Type,
		MaxParticipants: req.MaxParticipants,
		Status:          "active",
	}

	if req.StartDate != "" {
		t, _ := time.Parse(time.RFC3339, req.StartDate)
		mission.StartDate = &t
	}
	if req.EndDate != "" {
		t, _ := time.Parse(time.RFC3339, req.EndDate)
		mission.EndDate = &t
	}

	if err := m.db.Create(&mission).Error; err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	return utils.CreatedResponse(c, "Mission created", fiber.Map{
		"mission": mission,
	})
}

// UpdateMission updates a mission
func (m *Module) UpdateMission(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	var mission models.Mission
	// Admin can update any mission, dosen only their own
	if userRole == "admin" {
		if err := m.db.First(&mission, "id = ?", id).Error; err != nil {
			return utils.NotFound(c, "Mission not found")
		}
	} else {
		if err := m.db.First(&mission, "id = ? AND creator_id = ?", id, userID).Error; err != nil {
			return utils.NotFound(c, "Mission not found")
		}
	}

	var req struct {
		Title           string  `json:"title"`
		Description     string  `json:"description"`
		PointsReward    float64 `json:"points_reward"`
		Status          string  `json:"status"`
		Type            string  `json:"type"`
		MaxParticipants int     `json:"max_participants"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request")
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.PointsReward > 0 {
		updates["points_reward"] = req.PointsReward
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.Type != "" {
		updates["type"] = req.Type
	}
	if req.MaxParticipants != 0 {
		updates["max_participants"] = req.MaxParticipants
	}

	m.db.Model(&mission).Updates(updates)

	return utils.SuccessResponse(c, "Mission updated", fiber.Map{
		"mission": mission,
	})
}

// DeleteMission deletes a mission
func (m *Module) DeleteMission(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	var mission models.Mission
	// Admin can delete any mission, dosen only their own
	if userRole == "admin" {
		if err := m.db.First(&mission, "id = ?", id).Error; err != nil {
			return utils.NotFound(c, "Mission not found")
		}
	} else {
		if err := m.db.First(&mission, "id = ? AND creator_id = ?", id, userID).Error; err != nil {
			return utils.NotFound(c, "Mission not found")
		}
	}

	// Soft delete by setting status to cancelled
	if err := m.db.Model(&mission).Update("status", "cancelled").Error; err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	return utils.SuccessResponse(c, "Mission deleted", nil)
}

// JoinMission joins a mission
func (m *Module) JoinMission(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	// Check if mission exists and is active
	var mission models.Mission
	if err := m.db.First(&mission, "id = ? AND status = 'active'", id).Error; err != nil {
		return utils.NotFound(c, "Mission not found or not active")
	}

	// Check if already joined
	var existing models.MissionProgress
	if err := m.db.First(&existing, "user_id = ? AND mission_id = ?", userID, id).Error; err == nil {
		return utils.Conflict(c, "Already joined this mission")
	}

	// Check max participants
	if mission.MaxParticipants > 0 && mission.CurrentParticipants >= mission.MaxParticipants {
		return utils.BadRequest(c, "Mission is full")
	}

	// Create progress
	progress := models.MissionProgress{
		ID:        utils.GenerateUUID(),
		UserID:    userID,
		MissionID: id,
		Status:    "IN_PROGRESS",
	}

	if err := m.db.Create(&progress).Error; err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	return utils.SuccessResponse(c, "Successfully joined mission", fiber.Map{
		"progress": progress,
	})
}

// CompleteMission marks mission as completed (for demo/testing)
func (m *Module) CompleteMission(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var progress models.MissionProgress
	if err := m.db.First(&progress, "user_id = ? AND mission_id = ? AND status = 'IN_PROGRESS'", userID, id).Error; err != nil {
		return utils.NotFound(c, "Mission progress not found")
	}

	now := time.Now()
	m.db.Model(&progress).Updates(map[string]interface{}{
		"status":       "COMPLETED",
		"completed_at": now,
	})

	return utils.SuccessResponse(c, "Mission completed", fiber.Map{
		"progress": progress,
	})
}

// ClaimReward claims mission reward
func (m *Module) ClaimReward(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)
	idempotencyKey := c.Get("X-Idempotency-Key")

	if idempotencyKey == "" {
		idempotencyKey = "claim_" + id + "_" + userID + "_" + time.Now().Format("20060102150405")
	}

	// Get progress
	var progress models.MissionProgress
	if err := m.db.Preload("Mission").First(&progress, "user_id = ? AND mission_id = ?", userID, id).Error; err != nil {
		return utils.NotFound(c, "Mission progress not found")
	}

	if progress.Status == "CLAIMED" {
		return utils.Conflict(c, "Reward already claimed")
	}

	if progress.Status != "COMPLETED" {
		return utils.BadRequest(c, "Mission not completed yet")
	}

	// Credit points
	transaction, err := m.walletService.CreditPoints(
		context.Background(),
		userID,
		progress.Mission.PointsReward,
		"MISSION_REWARD",
		"Mission reward: "+progress.Mission.Title,
		idempotencyKey,
	)

	if err != nil {
		if err.Error() == "duplicate transaction" {
			return utils.DuplicateTransaction(c, transaction.ID)
		}
		return utils.InternalServerError(c, err.Error())
	}

	// Update progress
	now := time.Now()
	m.db.Model(&progress).Updates(map[string]interface{}{
		"status":     "CLAIMED",
		"claimed_at": now,
	})

	// Get updated wallet
	wallet, _ := m.walletService.GetWallet(context.Background(), userID)
	balance := float64(0)
	if wallet != nil {
		balance = wallet.Balance
	}

	return utils.SuccessResponse(c, "Reward claimed successfully", fiber.Map{
		"reward": fiber.Map{
			"amount":         progress.Mission.PointsReward,
			"transaction_id": transaction.ID,
		},
		"wallet": fiber.Map{
			"balance": balance,
		},
	})
}

// GetMyProgress gets user's progress on a mission
func (m *Module) GetMyProgress(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var progress models.MissionProgress
	if err := m.db.First(&progress, "user_id = ? AND mission_id = ?", userID, id).Error; err != nil {
		return utils.NotFound(c, "Not joined this mission")
	}

	return utils.SuccessResponse(c, "Progress retrieved", fiber.Map{
		"progress": progress,
	})
}
