package mission

import (
	"encoding/json"
	"time"
)

// CreateMissionRequest for creating mission
type CreateMissionRequest struct {
	Title           string          `json:"title"`
	Description     string          `json:"description"`
	MissionType     string          `json:"mission_type"` // QUIZ, ASSIGNMENT, ATTENDANCE, PROJECT
	RewardPoints    int64           `json:"reward_points"`
	MaxParticipants *int            `json:"max_participants"`
	Difficulty      string          `json:"difficulty"` // EASY, MEDIUM, HARD
	Content         json.RawMessage `json:"content"`    // Questions for quiz, instructions for assignment
	StartDate       *time.Time      `json:"start_date"`
	EndDate         *time.Time      `json:"end_date"`
	Deadline        *time.Time      `json:"deadline"`
	IsRepeatable    bool            `json:"is_repeatable"`
}

func (r *CreateMissionRequest) Validate() []ValidationError {
	var errors []ValidationError
	if r.Title == "" {
		errors = append(errors, ValidationError{Field: "title", Message: "Title is required"})
	}
	if r.MissionType == "" {
		errors = append(errors, ValidationError{Field: "mission_type", Message: "Mission type is required"})
	}
	validTypes := map[string]bool{"QUIZ": true, "ASSIGNMENT": true, "ATTENDANCE": true, "PROJECT": true, "OTHER": true}
	if !validTypes[r.MissionType] {
		errors = append(errors, ValidationError{Field: "mission_type", Message: "Invalid mission type"})
	}
	if r.RewardPoints <= 0 {
		errors = append(errors, ValidationError{Field: "reward_points", Message: "Reward points must be positive"})
	}
	if r.Difficulty == "" {
		r.Difficulty = "MEDIUM"
	}
	validDifficulty := map[string]bool{"EASY": true, "MEDIUM": true, "HARD": true}
	if !validDifficulty[r.Difficulty] {
		errors = append(errors, ValidationError{Field: "difficulty", Message: "Invalid difficulty"})
	}
	return errors
}

// UpdateMissionRequest for updating mission
type UpdateMissionRequest struct {
	Title           *string         `json:"title"`
	Description     *string         `json:"description"`
	RewardPoints    *int64          `json:"reward_points"`
	MaxParticipants *int            `json:"max_participants"`
	Difficulty      *string         `json:"difficulty"`
	Content         json.RawMessage `json:"content"`
	IsActive        *bool           `json:"is_active"`
	StartDate       *time.Time      `json:"start_date"`
	EndDate         *time.Time      `json:"end_date"`
	Deadline        *time.Time      `json:"deadline"`
}

// SubmitMissionRequest for submitting mission answers
type SubmitMissionRequest struct {
	Answers json.RawMessage `json:"answers"`
}

// GradeMissionRequest for grading submission
type GradeMissionRequest struct {
	Score    float64 `json:"score"`
	Notes    string  `json:"notes"`
	Approved bool    `json:"approved"`
}

// ValidationError for validation
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// MissionResponse for mission details
type MissionResponse struct {
	ID                  uint            `json:"id"`
	Title               string          `json:"title"`
	Description         string          `json:"description,omitempty"`
	MissionType         string          `json:"mission_type"`
	CreatorID           uint            `json:"creator_id"`
	CreatorName         string          `json:"creator_name,omitempty"`
	RewardPoints        int64           `json:"reward_points"`
	MaxParticipants     *int            `json:"max_participants,omitempty"`
	CurrentParticipants int             `json:"current_participants"`
	Difficulty          string          `json:"difficulty"`
	Content             json.RawMessage `json:"content,omitempty"`
	IsActive            bool            `json:"is_active"`
	IsRepeatable        bool            `json:"is_repeatable"`
	StartDate           *string         `json:"start_date,omitempty"`
	EndDate             *string         `json:"end_date,omitempty"`
	Deadline            *string         `json:"deadline,omitempty"`
	CreatedAt           string          `json:"created_at"`
	UserStatus          string          `json:"user_status,omitempty"` // For participant view
}

// MissionLogResponse for participation details
type MissionLogResponse struct {
	ID            uint            `json:"id"`
	MissionID     uint            `json:"mission_id"`
	MissionTitle  string          `json:"mission_title"`
	Status        string          `json:"status"`
	Score         *float64        `json:"score,omitempty"`
	Answers       json.RawMessage `json:"answers,omitempty"`
	RewardClaimed bool            `json:"reward_claimed"`
	RewardPoints  *int64          `json:"reward_points,omitempty"`
	StartedAt     string          `json:"started_at"`
	SubmittedAt   *string         `json:"submitted_at,omitempty"`
	CompletedAt   *string         `json:"completed_at,omitempty"`
	Notes         string          `json:"notes,omitempty"`
}

// ParticipantResponse for listing participants
type ParticipantResponse struct {
	UserID      uint     `json:"user_id"`
	UserName    string   `json:"user_name"`
	Status      string   `json:"status"`
	Score       *float64 `json:"score,omitempty"`
	SubmittedAt *string  `json:"submitted_at,omitempty"`
	CompletedAt *string  `json:"completed_at,omitempty"`
}

// ToMissionResponse converts entity to response
func ToMissionResponse(m *Mission, creatorName string) MissionResponse {
	resp := MissionResponse{
		ID:                  m.ID,
		Title:               m.Title,
		MissionType:         m.MissionType,
		CreatorID:           m.CreatorID,
		CreatorName:         creatorName,
		RewardPoints:        m.RewardPoints,
		CurrentParticipants: m.CurrentParticipants,
		Difficulty:          m.Difficulty,
		IsActive:            m.IsActive,
		IsRepeatable:        m.IsRepeatable,
		CreatedAt:           m.CreatedAt.Format(time.RFC3339),
	}

	if m.Description.Valid {
		resp.Description = m.Description.String
	}
	if m.MaxParticipants.Valid {
		max := int(m.MaxParticipants.Int64)
		resp.MaxParticipants = &max
	}
	if m.Content.Valid {
		resp.Content = json.RawMessage(m.Content.String)
	}
	if m.StartDate.Valid {
		t := m.StartDate.Time.Format(time.RFC3339)
		resp.StartDate = &t
	}
	if m.EndDate.Valid {
		t := m.EndDate.Time.Format(time.RFC3339)
		resp.EndDate = &t
	}
	if m.Deadline.Valid {
		t := m.Deadline.Time.Format(time.RFC3339)
		resp.Deadline = &t
	}

	return resp
}

// ToMissionLogResponse converts entity to response
func ToMissionLogResponse(l *MissionLog, missionTitle string) MissionLogResponse {
	resp := MissionLogResponse{
		ID:            l.ID,
		MissionID:     l.MissionID,
		MissionTitle:  missionTitle,
		Status:        l.Status,
		RewardClaimed: l.RewardClaimed,
		StartedAt:     l.StartedAt.Format(time.RFC3339),
	}

	if l.Score.Valid {
		resp.Score = &l.Score.Float64
	}
	if l.Answers.Valid {
		resp.Answers = json.RawMessage(l.Answers.String)
	}
	if l.RewardPoints.Valid {
		resp.RewardPoints = &l.RewardPoints.Int64
	}
	if l.SubmittedAt.Valid {
		t := l.SubmittedAt.Time.Format(time.RFC3339)
		resp.SubmittedAt = &t
	}
	if l.CompletedAt.Valid {
		t := l.CompletedAt.Time.Format(time.RFC3339)
		resp.CompletedAt = &t
	}
	if l.Notes.Valid {
		resp.Notes = l.Notes.String
	}

	return resp
}
