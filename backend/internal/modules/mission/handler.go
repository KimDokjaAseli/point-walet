package mission

import (
	"strconv"

	apperrors "walletpoint/internal/shared/errors"
	"walletpoint/internal/shared/response"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Create creates a new mission
func (h *Handler) Create(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req CreateMissionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if errors := req.Validate(); len(errors) > 0 {
		return response.ErrorWithDetails(c, fiber.StatusBadRequest, "Validation failed", "VALIDATION_ERROR", toResponseErrors(errors))
	}

	result, err := h.service.Create(c.Context(), req, userID)
	if err != nil {
		return handleError(c, err)
	}

	return response.Created(c, "Mission created successfully", result)
}

// GetByID gets mission details
func (h *Handler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid mission ID")
	}

	result, err := h.service.GetByID(c.Context(), uint(id))
	if err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Mission retrieved", result)
}

// GetActiveList lists active missions
func (h *Handler) GetActiveList(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	missions, total, err := h.service.GetActiveList(c.Context(), page, perPage)
	if err != nil {
		return handleError(c, err)
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, "Missions retrieved", missions, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// GetMyMissions lists missions created by user
func (h *Handler) GetMyMissions(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	missions, total, err := h.service.GetMyMissions(c.Context(), userID, page, perPage)
	if err != nil {
		return handleError(c, err)
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, "Missions retrieved", missions, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// Update updates a mission
func (h *Handler) Update(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid mission ID")
	}

	var req UpdateMissionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if err := h.service.Update(c.Context(), uint(id), req, userID); err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Mission updated successfully", nil)
}

// Delete deletes a mission
func (h *Handler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid mission ID")
	}

	if err := h.service.Delete(c.Context(), uint(id), userID); err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Mission deleted successfully", nil)
}

// StartMission starts participating in a mission
func (h *Handler) StartMission(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid mission ID")
	}

	result, err := h.service.StartMission(c.Context(), uint(id), userID)
	if err != nil {
		return handleError(c, err)
	}

	return response.Created(c, "Mission started", result)
}

// SubmitMission submits mission answers
func (h *Handler) SubmitMission(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid mission ID")
	}

	var req SubmitMissionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if err := h.service.SubmitMission(c.Context(), uint(id), userID, req); err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Mission submitted successfully", nil)
}

// GradeMission grades a mission submission
func (h *Handler) GradeMission(c *fiber.Ctx) error {
	graderID := c.Locals("userID").(uint)
	missionID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid mission ID")
	}
	participantID, err := strconv.ParseUint(c.Params("userId"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid user ID")
	}

	var req GradeMissionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if err := h.service.GradeMission(c.Context(), uint(missionID), uint(participantID), graderID, req); err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Mission graded successfully", nil)
}

// GetMyParticipations lists user's mission participations
func (h *Handler) GetMyParticipations(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	logs, total, err := h.service.GetMyParticipations(c.Context(), userID, page, perPage)
	if err != nil {
		return handleError(c, err)
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, "Participations retrieved", logs, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// GetParticipants lists mission participants
func (h *Handler) GetParticipants(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "Invalid mission ID")
	}

	participants, err := h.service.GetParticipants(c.Context(), uint(id), userID)
	if err != nil {
		return handleError(c, err)
	}

	return response.Success(c, "Participants retrieved", participants)
}

func handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*apperrors.AppError); ok {
		switch appErr.Code {
		case "NOT_FOUND":
			return response.NotFound(c, appErr.Message)
		case "FORBIDDEN":
			return response.Forbidden(c, appErr.Message)
		case "CANNOT_START_OWN", "ALREADY_PARTICIPATED", "MAX_PARTICIPANTS", "MISSION_INACTIVE",
			"NOT_STARTED", "INVALID_STATUS", "NOT_SUBMITTED":
			return response.BadRequest(c, appErr.Message)
		default:
			return response.InternalError(c, appErr.Message)
		}
	}
	return response.InternalError(c, "Internal server error")
}

func toResponseErrors(errors []ValidationError) []response.ValidationError {
	result := make([]response.ValidationError, len(errors))
	for i, e := range errors {
		result[i] = response.ValidationError{
			Field:   e.Field,
			Message: e.Message,
		}
	}
	return result
}
