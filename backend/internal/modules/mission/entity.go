package mission

import (
	"database/sql"
	"time"
)

// Mission entity
type Mission struct {
	ID                  uint
	Title               string
	Description         sql.NullString
	MissionType         string
	CreatorID           uint
	RewardPoints        int64
	MaxParticipants     sql.NullInt64
	CurrentParticipants int
	Difficulty          string
	Requirements        sql.NullString // JSON
	Content             sql.NullString // JSON
	IsActive            bool
	IsRepeatable        bool
	StartDate           sql.NullTime
	EndDate             sql.NullTime
	Deadline            sql.NullTime
	CreatedAt           time.Time
	UpdatedAt           time.Time
	DeletedAt           sql.NullTime
}

// MissionLog entity
type MissionLog struct {
	ID            uint
	MissionID     uint
	UserID        uint
	Status        string
	Score         sql.NullFloat64
	Answers       sql.NullString // JSON
	RewardClaimed bool
	RewardPoints  sql.NullInt64
	StartedAt     time.Time
	SubmittedAt   sql.NullTime
	CompletedAt   sql.NullTime
	GradedAt      sql.NullTime
	GradedBy      sql.NullInt64
	Notes         sql.NullString
}

// MissionWithCreator includes creator info
type MissionWithCreator struct {
	Mission
	CreatorName string
	CreatorRole string
}

// MissionLogWithDetails includes mission and user info
type MissionLogWithDetails struct {
	MissionLog
	MissionTitle string
	UserName     string
}
