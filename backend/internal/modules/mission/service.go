package mission

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"walletpoint/internal/modules/wallet"
	"walletpoint/internal/shared/constants"
	apperrors "walletpoint/internal/shared/errors"
	"walletpoint/pkg/utils"
)

type Service struct {
	repo       *Repository
	walletRepo *wallet.Repository
	db         *sql.DB
}

func NewService(repo *Repository, walletRepo *wallet.Repository, db *sql.DB) *Service {
	return &Service{
		repo:       repo,
		walletRepo: walletRepo,
		db:         db,
	}
}

func (s *Service) Create(ctx context.Context, req CreateMissionRequest, creatorID uint) (*MissionResponse, error) {
	m := &Mission{
		Title:        req.Title,
		Description:  sql.NullString{String: req.Description, Valid: req.Description != ""},
		MissionType:  req.MissionType,
		CreatorID:    creatorID,
		RewardPoints: req.RewardPoints,
		Difficulty:   req.Difficulty,
		IsActive:     true,
		IsRepeatable: req.IsRepeatable,
	}

	if req.MaxParticipants != nil {
		m.MaxParticipants = sql.NullInt64{Int64: int64(*req.MaxParticipants), Valid: true}
	}
	if req.Content != nil {
		m.Content = sql.NullString{String: string(req.Content), Valid: true}
	}
	if req.StartDate != nil {
		m.StartDate = sql.NullTime{Time: *req.StartDate, Valid: true}
	}
	if req.EndDate != nil {
		m.EndDate = sql.NullTime{Time: *req.EndDate, Valid: true}
	}
	if req.Deadline != nil {
		m.Deadline = sql.NullTime{Time: *req.Deadline, Valid: true}
	}

	if err := s.repo.Create(ctx, m); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create mission")
	}

	resp := ToMissionResponse(m, "")
	return &resp, nil
}

func (s *Service) GetByID(ctx context.Context, id uint) (*MissionResponse, error) {
	m, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to get mission")
	}
	if m == nil {
		return nil, apperrors.ErrNotFound
	}

	resp := ToMissionResponse(m, "")
	return &resp, nil
}

func (s *Service) GetActiveList(ctx context.Context, page, perPage int) ([]*MissionResponse, int, error) {
	offset := (page - 1) * perPage
	missions, total, err := s.repo.GetActiveList(ctx, perPage, offset)
	if err != nil {
		return nil, 0, apperrors.Wrap(err, "DB_ERROR", "Failed to get missions")
	}

	var responses []*MissionResponse
	for _, m := range missions {
		resp := ToMissionResponse(&m.Mission, m.CreatorName)
		responses = append(responses, &resp)
	}

	return responses, total, nil
}

func (s *Service) GetMyMissions(ctx context.Context, creatorID uint, page, perPage int) ([]*MissionResponse, int, error) {
	offset := (page - 1) * perPage
	missions, total, err := s.repo.GetByCreatorID(ctx, creatorID, perPage, offset)
	if err != nil {
		return nil, 0, apperrors.Wrap(err, "DB_ERROR", "Failed to get missions")
	}

	var responses []*MissionResponse
	for _, m := range missions {
		resp := ToMissionResponse(m, "")
		responses = append(responses, &resp)
	}

	return responses, total, nil
}

func (s *Service) Update(ctx context.Context, id uint, req UpdateMissionRequest, userID uint) error {
	m, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return apperrors.Wrap(err, "DB_ERROR", "Failed to get mission")
	}
	if m == nil {
		return apperrors.ErrNotFound
	}
	if m.CreatorID != userID {
		return apperrors.ErrForbidden
	}

	if req.Title != nil {
		m.Title = *req.Title
	}
	if req.Description != nil {
		m.Description = sql.NullString{String: *req.Description, Valid: true}
	}
	if req.RewardPoints != nil {
		m.RewardPoints = *req.RewardPoints
	}
	if req.MaxParticipants != nil {
		m.MaxParticipants = sql.NullInt64{Int64: int64(*req.MaxParticipants), Valid: true}
	}
	if req.Difficulty != nil {
		m.Difficulty = *req.Difficulty
	}
	if req.Content != nil {
		m.Content = sql.NullString{String: string(req.Content), Valid: true}
	}
	if req.IsActive != nil {
		m.IsActive = *req.IsActive
	}
	if req.StartDate != nil {
		m.StartDate = sql.NullTime{Time: *req.StartDate, Valid: true}
	}
	if req.EndDate != nil {
		m.EndDate = sql.NullTime{Time: *req.EndDate, Valid: true}
	}
	if req.Deadline != nil {
		m.Deadline = sql.NullTime{Time: *req.Deadline, Valid: true}
	}

	return s.repo.Update(ctx, m)
}

func (s *Service) Delete(ctx context.Context, id uint, userID uint) error {
	m, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return apperrors.Wrap(err, "DB_ERROR", "Failed to get mission")
	}
	if m == nil {
		return apperrors.ErrNotFound
	}
	if m.CreatorID != userID {
		return apperrors.ErrForbidden
	}

	return s.repo.Delete(ctx, id)
}

func (s *Service) StartMission(ctx context.Context, missionID, userID uint) (*MissionLogResponse, error) {
	m, err := s.repo.GetByID(ctx, missionID)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to get mission")
	}
	if m == nil {
		return nil, apperrors.ErrNotFound
	}

	// Cannot start own mission
	if m.CreatorID == userID {
		return nil, apperrors.New("CANNOT_START_OWN", "Cannot start your own mission")
	}

	if !m.IsActive {
		return nil, apperrors.New("MISSION_INACTIVE", "Mission is not active")
	}

	// Check if already participated
	existingLog, _ := s.repo.GetLogByMissionAndUser(ctx, missionID, userID)
	if existingLog != nil && !m.IsRepeatable {
		return nil, apperrors.New("ALREADY_PARTICIPATED", "Already participated in this mission")
	}

	// Check max participants
	if m.MaxParticipants.Valid && m.CurrentParticipants >= int(m.MaxParticipants.Int64) {
		return nil, apperrors.New("MAX_PARTICIPANTS", "Maximum participants reached")
	}

	// Start transaction
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to start transaction")
	}
	defer tx.Rollback()

	// Create log
	log := &MissionLog{
		MissionID: missionID,
		UserID:    userID,
		Status:    constants.MissionStatusStarted,
	}

	if err := s.repo.CreateLog(ctx, tx, log); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to create mission log")
	}

	// Increment participants
	if err := s.repo.IncrementParticipants(ctx, tx, missionID); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to increment participants")
	}

	if err := tx.Commit(); err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to commit")
	}

	resp := ToMissionLogResponse(log, m.Title)
	return &resp, nil
}

func (s *Service) SubmitMission(ctx context.Context, missionID, userID uint, req SubmitMissionRequest) error {
	log, err := s.repo.GetLogByMissionAndUser(ctx, missionID, userID)
	if err != nil {
		return apperrors.Wrap(err, "DB_ERROR", "Failed to get mission log")
	}
	if log == nil {
		return apperrors.New("NOT_STARTED", "Mission not started")
	}

	if log.Status != constants.MissionStatusStarted && log.Status != constants.MissionStatusInProgress {
		return apperrors.New("INVALID_STATUS", "Cannot submit in current status")
	}

	answersJSON, _ := json.Marshal(req.Answers)
	return s.repo.SubmitLog(ctx, log.ID, string(answersJSON))
}

func (s *Service) GradeMission(ctx context.Context, missionID, participantUserID, graderID uint, req GradeMissionRequest) error {
	m, err := s.repo.GetByID(ctx, missionID)
	if err != nil {
		return apperrors.Wrap(err, "DB_ERROR", "Failed to get mission")
	}
	if m == nil {
		return apperrors.ErrNotFound
	}

	// Only creator can grade
	if m.CreatorID != graderID {
		return apperrors.ErrForbidden
	}

	log, err := s.repo.GetLogByMissionAndUser(ctx, missionID, participantUserID)
	if err != nil {
		return apperrors.Wrap(err, "DB_ERROR", "Failed to get mission log")
	}
	if log == nil {
		return apperrors.New("NOT_FOUND", "Submission not found")
	}

	if log.Status != constants.MissionStatusSubmitted {
		return apperrors.New("NOT_SUBMITTED", "No submission to grade")
	}

	// Start transaction
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return apperrors.Wrap(err, "DB_ERROR", "Failed to start transaction")
	}
	defer tx.Rollback()

	rewardPoints := int64(0)
	if req.Approved {
		rewardPoints = m.RewardPoints
	}

	// Grade the log
	if err := s.repo.GradeLog(ctx, tx, log.ID, req.Score, req.Notes, req.Approved, graderID, rewardPoints); err != nil {
		return apperrors.Wrap(err, "DB_ERROR", "Failed to grade")
	}

	// If approved, credit wallet
	if req.Approved {
		userWallet, err := s.walletRepo.GetByUserIDForUpdate(ctx, tx, participantUserID)
		if err != nil {
			return apperrors.Wrap(err, "DB_ERROR", "Failed to get wallet")
		}

		// Credit wallet
		if err := s.walletRepo.UpdateBalanceWithStats(ctx, tx, userWallet.ID, rewardPoints, true); err != nil {
			return apperrors.Wrap(err, "DB_ERROR", "Failed to credit wallet")
		}

		// Create ledger entry
		txCode := utils.GenerateTransactionCode("MIS")
		entry := &wallet.WalletLedger{
			WalletID:      userWallet.ID,
			EntryType:     constants.LedgerCredit,
			Amount:        rewardPoints,
			BalanceBefore: userWallet.Balance,
			BalanceAfter:  userWallet.Balance + rewardPoints,
			Description:   "Mission reward: " + m.Title,
			ReferenceType: constants.TxTypeMissionReward,
			ReferenceID:   txCode,
		}

		if err := s.walletRepo.CreateLedgerEntry(ctx, tx, entry); err != nil {
			return apperrors.Wrap(err, "DB_ERROR", "Failed to create ledger")
		}
	}

	return tx.Commit()
}

func (s *Service) GetMyParticipations(ctx context.Context, userID uint, page, perPage int) ([]*MissionLogResponse, int, error) {
	offset := (page - 1) * perPage
	logs, total, err := s.repo.GetLogsByUserID(ctx, userID, perPage, offset)
	if err != nil {
		return nil, 0, apperrors.Wrap(err, "DB_ERROR", "Failed to get participations")
	}

	var responses []*MissionLogResponse
	for _, l := range logs {
		resp := ToMissionLogResponse(&l.MissionLog, l.MissionTitle)
		responses = append(responses, &resp)
	}

	return responses, total, nil
}

func (s *Service) GetParticipants(ctx context.Context, missionID, userID uint) ([]*ParticipantResponse, error) {
	m, err := s.repo.GetByID(ctx, missionID)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to get mission")
	}
	if m == nil {
		return nil, apperrors.ErrNotFound
	}

	// Only creator can view participants
	if m.CreatorID != userID {
		return nil, apperrors.ErrForbidden
	}

	logs, err := s.repo.GetLogsByMissionID(ctx, missionID)
	if err != nil {
		return nil, apperrors.Wrap(err, "DB_ERROR", "Failed to get participants")
	}

	var responses []*ParticipantResponse
	for _, l := range logs {
		resp := &ParticipantResponse{
			UserID:   l.UserID,
			UserName: l.UserName,
			Status:   l.Status,
		}
		if l.Score.Valid {
			resp.Score = &l.Score.Float64
		}
		if l.SubmittedAt.Valid {
			t := l.SubmittedAt.Time.Format(time.RFC3339)
			resp.SubmittedAt = &t
		}
		if l.CompletedAt.Valid {
			t := l.CompletedAt.Time.Format(time.RFC3339)
			resp.CompletedAt = &t
		}
		responses = append(responses, resp)
	}

	return responses, nil
}
