package wallet

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"walletpoint-backend/internal/middleware"
	"walletpoint-backend/internal/shared/utils"
)

// Handler handles wallet HTTP requests
type Handler struct {
	service *Service
}

// NewHandler creates a new wallet handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetWallet gets current user's wallet
// GET /api/v1/wallet
func (h *Handler) GetWallet(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return utils.Unauthorized(c, "User not found")
	}

	summary, err := h.service.GetWalletSummary(c.Context(), userID)
	if err != nil {
		if err == ErrWalletNotFound {
			return utils.NotFound(c, "Wallet not found")
		}
		return utils.InternalServerError(c, err.Error())
	}

	return utils.SuccessResponse(c, "Wallet retrieved successfully", summary)
}

// GetTransactions gets current user's transactions
// GET /api/v1/wallet/transactions
func (h *Handler) GetTransactions(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return utils.Unauthorized(c, "User not found")
	}

	// Parse query params
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	txType := c.Query("type", "")

	transactions, total, err := h.service.GetTransactions(c.Context(), userID, page, limit, txType)
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	_, totalPages := utils.CalculatePagination(page, limit, int(total))

	return utils.SuccessWithMeta(c, "Transactions retrieved successfully",
		fiber.Map{"transactions": transactions},
		&utils.Meta{
			Page:       page,
			Limit:      limit,
			Total:      int(total),
			TotalPages: totalPages,
		},
	)
}

// GetLedger gets current user's ledger entries
// GET /api/v1/wallet/ledger
func (h *Handler) GetLedger(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return utils.Unauthorized(c, "User not found")
	}

	// Parse query params
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	ledgers, total, err := h.service.GetLedger(c.Context(), userID, page, limit)
	if err != nil {
		if err == ErrWalletNotFound {
			return utils.NotFound(c, "Wallet not found")
		}
		return utils.InternalServerError(c, err.Error())
	}

	_, totalPages := utils.CalculatePagination(page, limit, int(total))

	return utils.SuccessWithMeta(c, "Ledger entries retrieved successfully",
		fiber.Map{"ledger_entries": ledgers},
		&utils.Meta{
			Page:       page,
			Limit:      limit,
			Total:      int(total),
			TotalPages: totalPages,
		},
	)
}

// Transfer transfers points to another user (dosen only)
// POST /api/v1/wallet/transfer
func (h *Handler) Transfer(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)

	if userID == "" {
		return utils.Unauthorized(c, "User not found")
	}

	// Only dosen can transfer
	if userRole != "dosen" {
		return utils.Forbidden(c, "Only dosen can transfer points")
	}

	var req TransferRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	// Validate
	if req.ReceiverID == "" {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "receiver_id", "message": "Receiver ID is required"},
		})
	}
	if req.Amount <= 0 {
		return utils.ValidationError(c, []fiber.Map{
			{"field": "amount", "message": "Amount must be greater than 0"},
		})
	}

	// Get idempotency key from header or body
	idempotencyKey := c.Get("X-Idempotency-Key")
	if idempotencyKey == "" {
		idempotencyKey = req.IdempotencyKey
	}

	transaction, err := h.service.TransferPoints(
		c.Context(),
		userID,
		req.ReceiverID,
		req.Amount,
		"TRANSFER",
		req.Description,
		idempotencyKey,
	)

	if err != nil {
		if err == ErrDuplicateTransaction {
			return utils.DuplicateTransaction(c, transaction.ID)
		}
		if err == ErrInsufficientBalance {
			wallet, _ := h.service.GetWallet(c.Context(), userID)
			shortfall := req.Amount - wallet.Balance
			return utils.InsufficientBalance(c, req.Amount, wallet.Balance, shortfall)
		}
		if err == ErrWalletNotFound {
			return utils.NotFound(c, "Wallet not found")
		}
		return utils.InternalServerError(c, err.Error())
	}

	return utils.SuccessResponse(c, "Transfer successful", fiber.Map{
		"transaction": fiber.Map{
			"id":     transaction.ID,
			"amount": transaction.Amount,
			"status": transaction.Status,
		},
	})
}

// QuizReward gives reward for completing a quiz
// POST /api/v1/wallet/quiz-reward
func (h *Handler) QuizReward(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return utils.Unauthorized(c, "User not found")
	}

	var req struct {
		QuizID string  `json:"quiz_id"`
		Score  int     `json:"score"`
		Total  int     `json:"total"`
		Reward float64 `json:"reward"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	// Validate minimum score (60%)
	minScore := int(float64(req.Total) * 0.6)
	if req.Score < minScore {
		return utils.BadRequest(c, "Score too low to receive reward")
	}

	// Check if already claimed (idempotency)
	idempotencyKey := "quiz_" + req.QuizID + "_" + userID

	// Credit points to user wallet
	transaction, err := h.service.CreditPoints(
		c.Context(),
		userID,
		req.Reward,
		"QUIZ_REWARD",
		"Quiz Reward: "+req.QuizID,
		idempotencyKey,
	)

	if err != nil {
		if err == ErrDuplicateTransaction {
			return utils.SuccessResponse(c, "Reward already claimed", fiber.Map{
				"already_claimed": true,
			})
		}
		return utils.InternalServerError(c, err.Error())
	}

	// Get updated wallet
	wallet, _ := h.service.GetWallet(c.Context(), userID)
	balance := float64(0)
	if wallet != nil {
		balance = wallet.Balance
	}

	return utils.SuccessResponse(c, "Quiz reward credited", fiber.Map{
		"transaction": fiber.Map{
			"id":     transaction.ID,
			"amount": transaction.Amount,
			"status": transaction.Status,
		},
		"wallet": fiber.Map{
			"balance": balance,
		},
	})
}
