package constants

// Roles
const (
	RoleAdmin     = "admin"
	RoleDosen     = "dosen"
	RoleMahasiswa = "mahasiswa"
)

// Transaction Types
const (
	TxTypeQRPayment     = "QR_PAYMENT"
	TxTypeTopup         = "TOPUP"
	TxTypeMissionReward = "MISSION_REWARD"
	TxTypeTransfer      = "TRANSFER"
	TxTypeSync          = "SYNC"
	TxTypeAdjustment    = "ADJUSTMENT"
	TxTypePurchase      = "PURCHASE"
)

// Transaction Status
const (
	TxStatusPending    = "PENDING"
	TxStatusProcessing = "PROCESSING"
	TxStatusCompleted  = "COMPLETED"
	TxStatusFailed     = "FAILED"
	TxStatusCancelled  = "CANCELLED"
	TxStatusRefunded   = "REFUNDED"
)

// QR Status
const (
	QRStatusActive    = "ACTIVE"
	QRStatusUsed      = "USED"
	QRStatusExpired   = "EXPIRED"
	QRStatusCancelled = "CANCELLED"
)

// QR Types
const (
	QRTypePayment = "PAYMENT"
	QRTypeProduct = "PRODUCT"
)

// Ledger Entry Types
const (
	LedgerCredit = "CREDIT"
	LedgerDebit  = "DEBIT"
)

// Mission Types
const (
	MissionTypeQuiz       = "QUIZ"
	MissionTypeAssignment = "ASSIGNMENT"
	MissionTypeAttendance = "ATTENDANCE"
	MissionTypeProject    = "PROJECT"
	MissionTypeOther      = "OTHER"
)

// Mission Status
const (
	MissionStatusStarted    = "STARTED"
	MissionStatusInProgress = "IN_PROGRESS"
	MissionStatusSubmitted  = "SUBMITTED"
	MissionStatusCompleted  = "COMPLETED"
	MissionStatusFailed     = "FAILED"
	MissionStatusExpired    = "EXPIRED"
)

// Order Status
const (
	OrderStatusPending   = "PENDING"
	OrderStatusPaid      = "PAID"
	OrderStatusCompleted = "COMPLETED"
	OrderStatusCancelled = "CANCELLED"
)

// Audit Categories
const (
	AuditCategoryAuth        = "AUTH"
	AuditCategoryWallet      = "WALLET"
	AuditCategoryTransaction = "TRANSACTION"
	AuditCategoryUser        = "USER"
	AuditCategoryMission     = "MISSION"
	AuditCategoryProduct     = "PRODUCT"
	AuditCategorySystem      = "SYSTEM"
)

// Risk Levels
const (
	RiskLevelLow      = "LOW"
	RiskLevelMedium   = "MEDIUM"
	RiskLevelHigh     = "HIGH"
	RiskLevelCritical = "CRITICAL"
)
