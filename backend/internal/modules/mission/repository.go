package mission

import (
	"context"
	"database/sql"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, m *Mission) error {
	query := `
		INSERT INTO missions (title, description, mission_type, creator_id, reward_points,
			max_participants, current_participants, difficulty, requirements, content,
			is_active, is_repeatable, start_date, end_date, deadline, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`

	result, err := r.db.ExecContext(ctx, query,
		m.Title, m.Description, m.MissionType, m.CreatorID, m.RewardPoints,
		m.MaxParticipants, m.Difficulty, m.Requirements, m.Content,
		m.IsActive, m.IsRepeatable, m.StartDate, m.EndDate, m.Deadline,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	m.ID = uint(id)
	return nil
}

func (r *Repository) GetByID(ctx context.Context, id uint) (*Mission, error) {
	query := `
		SELECT id, title, description, mission_type, creator_id, reward_points,
			max_participants, current_participants, difficulty, requirements, content,
			is_active, is_repeatable, start_date, end_date, deadline, created_at, updated_at
		FROM missions WHERE id = ? AND deleted_at IS NULL
	`

	var m Mission
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&m.ID, &m.Title, &m.Description, &m.MissionType, &m.CreatorID, &m.RewardPoints,
		&m.MaxParticipants, &m.CurrentParticipants, &m.Difficulty, &m.Requirements, &m.Content,
		&m.IsActive, &m.IsRepeatable, &m.StartDate, &m.EndDate, &m.Deadline, &m.CreatedAt, &m.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &m, nil
}

func (r *Repository) GetActiveList(ctx context.Context, limit, offset int) ([]*MissionWithCreator, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM missions WHERE is_active = TRUE AND deleted_at IS NULL`
	if err := r.db.QueryRowContext(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT m.id, m.title, m.description, m.mission_type, m.creator_id, m.reward_points,
			m.max_participants, m.current_participants, m.difficulty, m.content,
			m.is_active, m.is_repeatable, m.start_date, m.end_date, m.deadline, m.created_at,
			u.full_name as creator_name, ro.name as creator_role
		FROM missions m
		INNER JOIN users u ON m.creator_id = u.id
		INNER JOIN user_roles ur ON u.id = ur.user_id
		INNER JOIN roles ro ON ur.role_id = ro.id
		WHERE m.is_active = TRUE AND m.deleted_at IS NULL
		ORDER BY m.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var missions []*MissionWithCreator
	for rows.Next() {
		var m MissionWithCreator
		if err := rows.Scan(
			&m.ID, &m.Title, &m.Description, &m.MissionType, &m.CreatorID, &m.RewardPoints,
			&m.MaxParticipants, &m.CurrentParticipants, &m.Difficulty, &m.Content,
			&m.IsActive, &m.IsRepeatable, &m.StartDate, &m.EndDate, &m.Deadline, &m.CreatedAt,
			&m.CreatorName, &m.CreatorRole,
		); err != nil {
			return nil, 0, err
		}
		missions = append(missions, &m)
	}

	return missions, total, nil
}

func (r *Repository) GetByCreatorID(ctx context.Context, creatorID uint, limit, offset int) ([]*Mission, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM missions WHERE creator_id = ? AND deleted_at IS NULL`
	if err := r.db.QueryRowContext(ctx, countQuery, creatorID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, title, description, mission_type, creator_id, reward_points,
			max_participants, current_participants, difficulty, content,
			is_active, is_repeatable, start_date, end_date, deadline, created_at, updated_at
		FROM missions 
		WHERE creator_id = ? AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.QueryContext(ctx, query, creatorID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var missions []*Mission
	for rows.Next() {
		var m Mission
		if err := rows.Scan(
			&m.ID, &m.Title, &m.Description, &m.MissionType, &m.CreatorID, &m.RewardPoints,
			&m.MaxParticipants, &m.CurrentParticipants, &m.Difficulty, &m.Content,
			&m.IsActive, &m.IsRepeatable, &m.StartDate, &m.EndDate, &m.Deadline, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		missions = append(missions, &m)
	}

	return missions, total, nil
}

func (r *Repository) Update(ctx context.Context, m *Mission) error {
	query := `
		UPDATE missions SET title = ?, description = ?, reward_points = ?,
			max_participants = ?, difficulty = ?, content = ?, is_active = ?,
			start_date = ?, end_date = ?, deadline = ?, updated_at = NOW()
		WHERE id = ?
	`
	_, err := r.db.ExecContext(ctx, query,
		m.Title, m.Description, m.RewardPoints, m.MaxParticipants, m.Difficulty,
		m.Content, m.IsActive, m.StartDate, m.EndDate, m.Deadline, m.ID,
	)
	return err
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	query := `UPDATE missions SET deleted_at = NOW() WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *Repository) IncrementParticipants(ctx context.Context, tx *sql.Tx, id uint) error {
	query := `UPDATE missions SET current_participants = current_participants + 1 WHERE id = ?`
	_, err := tx.ExecContext(ctx, query, id)
	return err
}

// MissionLog operations
func (r *Repository) CreateLog(ctx context.Context, tx *sql.Tx, log *MissionLog) error {
	query := `
		INSERT INTO mission_logs (mission_id, user_id, status, started_at)
		VALUES (?, ?, ?, NOW())
	`

	var result sql.Result
	var err error
	if tx != nil {
		result, err = tx.ExecContext(ctx, query, log.MissionID, log.UserID, log.Status)
	} else {
		result, err = r.db.ExecContext(ctx, query, log.MissionID, log.UserID, log.Status)
	}
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	log.ID = uint(id)
	return nil
}

func (r *Repository) GetLogByMissionAndUser(ctx context.Context, missionID, userID uint) (*MissionLog, error) {
	query := `
		SELECT id, mission_id, user_id, status, score, answers, reward_claimed, reward_points,
			started_at, submitted_at, completed_at, graded_at, graded_by, notes
		FROM mission_logs WHERE mission_id = ? AND user_id = ?
	`

	var l MissionLog
	err := r.db.QueryRowContext(ctx, query, missionID, userID).Scan(
		&l.ID, &l.MissionID, &l.UserID, &l.Status, &l.Score, &l.Answers,
		&l.RewardClaimed, &l.RewardPoints, &l.StartedAt, &l.SubmittedAt,
		&l.CompletedAt, &l.GradedAt, &l.GradedBy, &l.Notes,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &l, nil
}

func (r *Repository) UpdateLogStatus(ctx context.Context, tx *sql.Tx, id uint, status string) error {
	query := `UPDATE mission_logs SET status = ? WHERE id = ?`
	if tx != nil {
		_, err := tx.ExecContext(ctx, query, status, id)
		return err
	}
	_, err := r.db.ExecContext(ctx, query, status, id)
	return err
}

func (r *Repository) SubmitLog(ctx context.Context, id uint, answers string) error {
	query := `UPDATE mission_logs SET answers = ?, status = 'SUBMITTED', submitted_at = NOW() WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, answers, id)
	return err
}

func (r *Repository) GradeLog(ctx context.Context, tx *sql.Tx, id uint, score float64, notes string, approved bool, graderID uint, rewardPoints int64) error {
	status := "FAILED"
	if approved {
		status = "COMPLETED"
	}

	query := `
		UPDATE mission_logs 
		SET status = ?, score = ?, notes = ?, graded_at = NOW(), graded_by = ?, 
			completed_at = IF(? = TRUE, NOW(), NULL), reward_points = ?, reward_claimed = ?
		WHERE id = ?
	`
	_, err := tx.ExecContext(ctx, query, status, score, notes, graderID, approved, rewardPoints, approved, id)
	return err
}

func (r *Repository) GetLogsByUserID(ctx context.Context, userID uint, limit, offset int) ([]*MissionLogWithDetails, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM mission_logs WHERE user_id = ?`
	if err := r.db.QueryRowContext(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT ml.id, ml.mission_id, ml.user_id, ml.status, ml.score, ml.answers, 
			ml.reward_claimed, ml.reward_points, ml.started_at, ml.submitted_at, 
			ml.completed_at, ml.graded_at, ml.graded_by, ml.notes,
			m.title as mission_title, u.full_name as user_name
		FROM mission_logs ml
		INNER JOIN missions m ON ml.mission_id = m.id
		INNER JOIN users u ON ml.user_id = u.id
		WHERE ml.user_id = ?
		ORDER BY ml.started_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []*MissionLogWithDetails
	for rows.Next() {
		var l MissionLogWithDetails
		if err := rows.Scan(
			&l.ID, &l.MissionID, &l.UserID, &l.Status, &l.Score, &l.Answers,
			&l.RewardClaimed, &l.RewardPoints, &l.StartedAt, &l.SubmittedAt,
			&l.CompletedAt, &l.GradedAt, &l.GradedBy, &l.Notes,
			&l.MissionTitle, &l.UserName,
		); err != nil {
			return nil, 0, err
		}
		logs = append(logs, &l)
	}

	return logs, total, nil
}

func (r *Repository) GetLogsByMissionID(ctx context.Context, missionID uint) ([]*MissionLogWithDetails, error) {
	query := `
		SELECT ml.id, ml.mission_id, ml.user_id, ml.status, ml.score, ml.answers, 
			ml.reward_claimed, ml.reward_points, ml.started_at, ml.submitted_at, 
			ml.completed_at, ml.graded_at, ml.graded_by, ml.notes,
			m.title as mission_title, u.full_name as user_name
		FROM mission_logs ml
		INNER JOIN missions m ON ml.mission_id = m.id
		INNER JOIN users u ON ml.user_id = u.id
		WHERE ml.mission_id = ?
		ORDER BY ml.submitted_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, missionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*MissionLogWithDetails
	for rows.Next() {
		var l MissionLogWithDetails
		if err := rows.Scan(
			&l.ID, &l.MissionID, &l.UserID, &l.Status, &l.Score, &l.Answers,
			&l.RewardClaimed, &l.RewardPoints, &l.StartedAt, &l.SubmittedAt,
			&l.CompletedAt, &l.GradedAt, &l.GradedBy, &l.Notes,
			&l.MissionTitle, &l.UserName,
		); err != nil {
			return nil, err
		}
		logs = append(logs, &l)
	}

	return logs, nil
}
