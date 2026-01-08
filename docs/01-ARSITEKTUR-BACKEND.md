# BAB 1: ARSITEKTUR BACKEND (GOLANG + FIBER)

## 1.1 Pola Arsitektur: Modular Monolith

### 1.1.1 Definisi dan Prinsip

**Modular Monolith** adalah pola arsitektur yang menggabungkan kesederhanaan deployment monolith dengan modularitas microservice. Sistem dibangun sebagai satu binary executable, namun internal codebase diorganisasi dalam modul-modul terpisah dengan boundary yang jelas.

### 1.1.2 Karakteristik Arsitektur

| Aspek | Implementasi |
|-------|-------------|
| Deployment | Single binary, single process |
| Database | Shared MySQL instance dengan logical separation |
| Communication | In-process function calls |
| Boundaries | Package-level isolation |
| Scalability | Vertical scaling, horizontal via load balancer |

### 1.1.3 Boundary Antar Modul

```
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                        │
│  (JWT Auth, RBAC, Rate Limiting, Request Validation)        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      MODULE BOUNDARY                         │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│   Auth   │  Wallet  │    QR    │ Mission  │  Marketplace   │
│  Module  │  Module  │  Module  │  Module  │    Module      │
├──────────┴──────────┴──────────┴──────────┴────────────────┤
│                   SHARED KERNEL                              │
│  (Ledger, Audit, User Management, Common Utilities)         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                            │
│              (MySQL + Connection Pool)                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.1.4 Prinsip Kesiapan Migrasi ke Microservice

1. **Interface-First Design**: Setiap modul berkomunikasi melalui interface, bukan concrete implementation
2. **Domain Isolation**: Business logic terisolasi dalam package masing-masing
3. **Shared Nothing**: Modul tidak mengakses internal state modul lain secara langsung
4. **Event-Ready**: Struktur mendukung penambahan message broker di masa depan
5. **Database Schema Ownership**: Setiap modul memiliki tabel yang jelas

---

## 1.2 Struktur Folder Backend

```
/backend
│
├── /cmd
│   └── /app
│       └── main.go                    # Entry point aplikasi
│
├── /internal
│   ├── /config
│   │   └── config.go                  # Konfigurasi aplikasi
│   │
│   ├── /database
│   │   └── mysql.go                   # Database connection & migration
│   │
│   ├── /middleware
│   │   ├── jwt.go                     # JWT authentication middleware
│   │   ├── rbac.go                    # Role-based access control
│   │   ├── ratelimit.go               # Rate limiting middleware
│   │   └── cors.go                    # CORS configuration
│   │
│   ├── /modules
│   │   ├── /auth
│   │   │   ├── dto.go                 # Data Transfer Objects
│   │   │   ├── entity.go              # Domain entities
│   │   │   ├── handler.go             # HTTP handlers
│   │   │   ├── service.go             # Business logic
│   │   │   ├── repository.go          # Data access
│   │   │   └── routes.go              # Route definitions
│   │   │
│   │   ├── /user
│   │   │   ├── dto.go
│   │   │   ├── entity.go
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── routes.go
│   │   │
│   │   ├── /wallet
│   │   │   ├── dto.go
│   │   │   ├── entity.go
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── routes.go
│   │   │
│   │   ├── /ledger
│   │   │   ├── dto.go
│   │   │   ├── entity.go
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── routes.go
│   │   │
│   │   ├── /transaction
│   │   │   ├── dto.go
│   │   │   ├── entity.go
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── routes.go
│   │   │
│   │   ├── /qr
│   │   │   ├── dto.go
│   │   │   ├── entity.go
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── routes.go
│   │   │
│   │   ├── /mission
│   │   │   ├── dto.go
│   │   │   ├── entity.go
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── routes.go
│   │   │
│   │   ├── /marketplace
│   │   │   ├── dto.go
│   │   │   ├── entity.go
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── routes.go
│   │   │
│   │   ├── /topup
│   │   │   ├── dto.go
│   │   │   ├── entity.go
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── routes.go
│   │   │
│   │   ├── /sync
│   │   │   ├── dto.go
│   │   │   ├── entity.go
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── routes.go
│   │   │
│   │   └── /audit
│   │       ├── dto.go
│   │       ├── entity.go
│   │       ├── handler.go
│   │       ├── service.go
│   │       ├── repository.go
│   │       └── routes.go
│   │
│   └── /shared
│       ├── /constants
│       │   └── constants.go           # Application constants
│       ├── /errors
│       │   └── errors.go              # Custom error types
│       └── /response
│           └── response.go            # Standard API response
│
├── /pkg
│   ├── /utils
│   │   ├── hash.go                    # Password hashing
│   │   ├── validator.go               # Input validation
│   │   └── generator.go               # ID/Token generator
│   │
│   ├── /logger
│   │   └── logger.go                  # Structured logging
│   │
│   └── /qrcode
│       └── generator.go               # QR code generation
│
├── /migrations
│   └── *.sql                          # Database migrations
│
├── go.mod
├── go.sum
└── .env.example
```

---

## 1.3 Tanggung Jawab Layer

### 1.3.1 Handler Layer

**Fungsi**: Menangani HTTP request/response menggunakan Fiber framework

```go
// internal/modules/wallet/handler.go
package wallet

import (
    "github.com/gofiber/fiber/v2"
)

type Handler struct {
    service ServiceInterface
}

func NewHandler(service ServiceInterface) *Handler {
    return &Handler{service: service}
}

// GetBalance godoc
// @Summary Get wallet balance
// @Tags Wallet
// @Security BearerAuth
// @Success 200 {object} response.Response{data=BalanceResponse}
// @Router /api/v1/wallet/balance [get]
func (h *Handler) GetBalance(c *fiber.Ctx) error {
    userID := c.Locals("userID").(uint)
    
    balance, err := h.service.GetBalance(c.Context(), userID)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "success": false,
            "message": err.Error(),
        })
    }
    
    return c.JSON(fiber.Map{
        "success": true,
        "data": BalanceResponse{
            UserID:  userID,
            Balance: balance,
        },
    })
}
```

**Tanggung Jawab**:
- Parsing request body, query params, path params
- Validasi input format (bukan business validation)
- Memanggil service layer
- Format response JSON
- HTTP status code management

### 1.3.2 Service Layer

**Fungsi**: Menangani business logic dan manajemen transaksi database

```go
// internal/modules/wallet/service.go
package wallet

import (
    "context"
    "database/sql"
    "errors"
)

type ServiceInterface interface {
    GetBalance(ctx context.Context, userID uint) (int64, error)
    Debit(ctx context.Context, req DebitRequest) error
    Credit(ctx context.Context, req CreditRequest) error
    Transfer(ctx context.Context, req TransferRequest) error
}

type Service struct {
    repo       RepositoryInterface
    ledgerRepo ledger.RepositoryInterface
    auditRepo  audit.RepositoryInterface
    db         *sql.DB
}

func NewService(
    repo RepositoryInterface,
    ledgerRepo ledger.RepositoryInterface,
    auditRepo audit.RepositoryInterface,
    db *sql.DB,
) *Service {
    return &Service{
        repo:       repo,
        ledgerRepo: ledgerRepo,
        auditRepo:  auditRepo,
        db:         db,
    }
}

// Transfer - Atomic wallet transfer dengan ledger recording
func (s *Service) Transfer(ctx context.Context, req TransferRequest) error {
    // Start database transaction
    tx, err := s.db.BeginTx(ctx, &sql.TxOptions{
        Isolation: sql.LevelSerializable,
    })
    if err != nil {
        return err
    }
    defer tx.Rollback()
    
    // Lock source wallet
    sourceWallet, err := s.repo.GetWalletForUpdate(ctx, tx, req.FromUserID)
    if err != nil {
        return err
    }
    
    // Validate balance
    if sourceWallet.Balance < req.Amount {
        return errors.New("insufficient balance")
    }
    
    // Lock destination wallet
    destWallet, err := s.repo.GetWalletForUpdate(ctx, tx, req.ToUserID)
    if err != nil {
        return err
    }
    
    // Debit source
    err = s.repo.UpdateBalance(ctx, tx, req.FromUserID, -req.Amount)
    if err != nil {
        return err
    }
    
    // Credit destination
    err = s.repo.UpdateBalance(ctx, tx, req.ToUserID, req.Amount)
    if err != nil {
        return err
    }
    
    // Record ledger entries
    err = s.ledgerRepo.CreateEntry(ctx, tx, ledger.Entry{
        WalletID:    sourceWallet.ID,
        Type:        "DEBIT",
        Amount:      req.Amount,
        Description: req.Description,
        RefType:     "TRANSFER",
        RefID:       req.IdempotencyKey,
    })
    if err != nil {
        return err
    }
    
    err = s.ledgerRepo.CreateEntry(ctx, tx, ledger.Entry{
        WalletID:    destWallet.ID,
        Type:        "CREDIT",
        Amount:      req.Amount,
        Description: req.Description,
        RefType:     "TRANSFER",
        RefID:       req.IdempotencyKey,
    })
    if err != nil {
        return err
    }
    
    // Commit transaction
    return tx.Commit()
}
```

**Tanggung Jawab**:
- Business logic validation
- Database transaction management
- Koordinasi antar repository
- Error handling dan rollback
- Idempotency checking

### 1.3.3 Repository Layer

**Fungsi**: Query database dan mapping entity

```go
// internal/modules/wallet/repository.go
package wallet

import (
    "context"
    "database/sql"
)

type RepositoryInterface interface {
    GetByUserID(ctx context.Context, userID uint) (*Wallet, error)
    GetWalletForUpdate(ctx context.Context, tx *sql.Tx, userID uint) (*Wallet, error)
    UpdateBalance(ctx context.Context, tx *sql.Tx, userID uint, amount int64) error
    Create(ctx context.Context, wallet *Wallet) error
}

type Repository struct {
    db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
    return &Repository{db: db}
}

// GetWalletForUpdate - Row-level locking untuk atomic transaction
func (r *Repository) GetWalletForUpdate(ctx context.Context, tx *sql.Tx, userID uint) (*Wallet, error) {
    query := `
        SELECT id, user_id, balance, created_at, updated_at 
        FROM wallets 
        WHERE user_id = ? 
        FOR UPDATE
    `
    
    var wallet Wallet
    err := tx.QueryRowContext(ctx, query, userID).Scan(
        &wallet.ID,
        &wallet.UserID,
        &wallet.Balance,
        &wallet.CreatedAt,
        &wallet.UpdatedAt,
    )
    if err != nil {
        return nil, err
    }
    
    return &wallet, nil
}

// UpdateBalance - Update wallet balance dalam transaction
func (r *Repository) UpdateBalance(ctx context.Context, tx *sql.Tx, userID uint, amount int64) error {
    query := `
        UPDATE wallets 
        SET balance = balance + ?, updated_at = NOW() 
        WHERE user_id = ?
    `
    
    result, err := tx.ExecContext(ctx, query, amount, userID)
    if err != nil {
        return err
    }
    
    rows, err := result.RowsAffected()
    if err != nil {
        return err
    }
    
    if rows == 0 {
        return errors.New("wallet not found")
    }
    
    return nil
}
```

**Tanggung Jawab**:
- SQL query execution
- Entity mapping dari database rows
- No business logic
- Transaction-aware operations

---

## 1.4 Atomic Wallet Transaction

### 1.4.1 Database Transaction Pattern

```go
// Pattern untuk atomic transaction
func (s *Service) ExecuteAtomicTransaction(ctx context.Context, operation func(tx *sql.Tx) error) error {
    tx, err := s.db.BeginTx(ctx, &sql.TxOptions{
        Isolation: sql.LevelSerializable,
    })
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    
    defer func() {
        if p := recover(); p != nil {
            tx.Rollback()
            panic(p)
        }
    }()
    
    if err := operation(tx); err != nil {
        if rbErr := tx.Rollback(); rbErr != nil {
            return fmt.Errorf("rollback failed: %v, original error: %w", rbErr, err)
        }
        return err
    }
    
    if err := tx.Commit(); err != nil {
        return fmt.Errorf("commit failed: %w", err)
    }
    
    return nil
}
```

### 1.4.2 Row-Level Locking

```sql
-- SELECT ... FOR UPDATE untuk lock row
SELECT id, user_id, balance, created_at, updated_at 
FROM wallets 
WHERE user_id = ? 
FOR UPDATE;

-- Dengan NOWAIT untuk immediate failure jika locked
SELECT id, user_id, balance 
FROM wallets 
WHERE user_id = ? 
FOR UPDATE NOWAIT;
```

### 1.4.3 Rollback Strategy

```go
type TransactionResult struct {
    Success bool
    Error   error
    RollbackReason string
}

func (s *Service) ProcessPayment(ctx context.Context, req PaymentRequest) TransactionResult {
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil {
        return TransactionResult{
            Success: false,
            Error:   err,
            RollbackReason: "FAILED_TO_START_TX",
        }
    }
    
    // Step 1: Validate QR
    qr, err := s.qrRepo.GetForUpdate(ctx, tx, req.QRCodeID)
    if err != nil {
        tx.Rollback()
        return TransactionResult{
            Success: false,
            Error:   err,
            RollbackReason: "QR_NOT_FOUND",
        }
    }
    
    if qr.IsExpired() {
        tx.Rollback()
        return TransactionResult{
            Success: false,
            Error:   errors.New("QR code expired"),
            RollbackReason: "QR_EXPIRED",
        }
    }
    
    if qr.IsUsed {
        tx.Rollback()
        return TransactionResult{
            Success: false,
            Error:   errors.New("QR code already used"),
            RollbackReason: "QR_ALREADY_USED",
        }
    }
    
    // Step 2: Validate Balance
    wallet, err := s.walletRepo.GetForUpdate(ctx, tx, req.PayerID)
    if err != nil {
        tx.Rollback()
        return TransactionResult{
            Success: false,
            Error:   err,
            RollbackReason: "WALLET_NOT_FOUND",
        }
    }
    
    if wallet.Balance < qr.Amount {
        tx.Rollback()
        return TransactionResult{
            Success: false,
            Error:   errors.New("insufficient balance"),
            RollbackReason: "INSUFFICIENT_BALANCE",
        }
    }
    
    // Step 3-5: Execute debit, credit, ledger...
    // ...
    
    if err := tx.Commit(); err != nil {
        return TransactionResult{
            Success: false,
            Error:   err,
            RollbackReason: "COMMIT_FAILED",
        }
    }
    
    return TransactionResult{Success: true}
}
```

### 1.4.4 Idempotency Key Implementation

```go
// internal/modules/transaction/service.go

type IdempotencyStore interface {
    Check(ctx context.Context, key string) (exists bool, result *TransactionResult, err error)
    Store(ctx context.Context, key string, result *TransactionResult) error
}

func (s *Service) ProcessWithIdempotency(ctx context.Context, idempotencyKey string, operation func() (*TransactionResult, error)) (*TransactionResult, error) {
    // Check if transaction already processed
    exists, cachedResult, err := s.idempotencyStore.Check(ctx, idempotencyKey)
    if err != nil {
        return nil, fmt.Errorf("idempotency check failed: %w", err)
    }
    
    if exists {
        // Return cached result for duplicate request
        return cachedResult, nil
    }
    
    // Execute new transaction
    result, err := operation()
    if err != nil {
        return nil, err
    }
    
    // Store result for future duplicate checks
    if err := s.idempotencyStore.Store(ctx, idempotencyKey, result); err != nil {
        // Log but don't fail - transaction succeeded
        s.logger.Warn("failed to store idempotency result", "key", idempotencyKey)
    }
    
    return result, nil
}
```

**Database Table untuk Idempotency**:

```sql
CREATE TABLE idempotency_keys (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    idempotency_key VARCHAR(64) NOT NULL UNIQUE,
    request_hash VARCHAR(64) NOT NULL,
    response_body JSON,
    status_code INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    INDEX idx_idempotency_key (idempotency_key),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 1.5 Keamanan

### 1.5.1 JWT + Refresh Token

```go
// internal/middleware/jwt.go
package middleware

import (
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
)

type JWTConfig struct {
    AccessSecret  string
    RefreshSecret string
    AccessExpiry  time.Duration
    RefreshExpiry time.Duration
}

type TokenPair struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
    ExpiresIn    int64  `json:"expires_in"`
}

type Claims struct {
    UserID   uint   `json:"user_id"`
    Username string `json:"username"`
    Role     string `json:"role"`
    jwt.RegisteredClaims
}

func GenerateTokenPair(config JWTConfig, user User) (*TokenPair, error) {
    // Access Token (short-lived: 15 minutes)
    accessClaims := Claims{
        UserID:   user.ID,
        Username: user.Username,
        Role:     user.Role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(config.AccessExpiry)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "wallet-gamification",
        },
    }
    
    accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
    accessTokenString, err := accessToken.SignedString([]byte(config.AccessSecret))
    if err != nil {
        return nil, err
    }
    
    // Refresh Token (long-lived: 7 days)
    refreshClaims := Claims{
        UserID: user.ID,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(config.RefreshExpiry)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }
    
    refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
    refreshTokenString, err := refreshToken.SignedString([]byte(config.RefreshSecret))
    if err != nil {
        return nil, err
    }
    
    return &TokenPair{
        AccessToken:  accessTokenString,
        RefreshToken: refreshTokenString,
        ExpiresIn:    int64(config.AccessExpiry.Seconds()),
    }, nil
}

func JWTMiddleware(secret string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        authHeader := c.Get("Authorization")
        if authHeader == "" {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "success": false,
                "message": "Missing authorization header",
            })
        }
        
        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        
        token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
            return []byte(secret), nil
        })
        
        if err != nil || !token.Valid {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "success": false,
                "message": "Invalid or expired token",
            })
        }
        
        claims := token.Claims.(*Claims)
        c.Locals("userID", claims.UserID)
        c.Locals("username", claims.Username)
        c.Locals("role", claims.Role)
        
        return c.Next()
    }
}
```

### 1.5.2 RBAC Middleware

```go
// internal/middleware/rbac.go
package middleware

import (
    "github.com/gofiber/fiber/v2"
)

const (
    RoleAdmin     = "admin"
    RoleDosen     = "dosen"
    RoleMahasiswa = "mahasiswa"
)

// Permission matrix
var rolePermissions = map[string][]string{
    RoleAdmin: {
        "user:read", "user:write", "user:delete",
        "wallet:read", "wallet:adjust",
        "transaction:read", "transaction:audit",
        "mission:read", "mission:write",
        "product:read", "product:write",
        "audit:read",
        "impersonate:view",
    },
    RoleDosen: {
        "wallet:read", "wallet:transfer",
        "transaction:read", "transaction:create",
        "qr:create", "qr:read",
        "mission:read", "mission:write", "mission:participate",
        "product:read", "product:write", "product:own",
    },
    RoleMahasiswa: {
        "wallet:read",
        "transaction:read", "transaction:create",
        "qr:scan",
        "mission:read", "mission:participate",
        "product:read", "product:buy",
    },
}

func RequireRole(allowedRoles ...string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        userRole := c.Locals("role").(string)
        
        for _, role := range allowedRoles {
            if userRole == role {
                return c.Next()
            }
        }
        
        return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
            "success": false,
            "message": "Access denied: insufficient role",
        })
    }
}

func RequirePermission(permission string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        userRole := c.Locals("role").(string)
        
        permissions, exists := rolePermissions[userRole]
        if !exists {
            return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
                "success": false,
                "message": "Access denied: role not found",
            })
        }
        
        for _, p := range permissions {
            if p == permission {
                return c.Next()
            }
        }
        
        return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
            "success": false,
            "message": "Access denied: missing permission",
        })
    }
}
```

### 1.5.3 Rate Limiting Middleware

```go
// internal/middleware/ratelimit.go
package middleware

import (
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/limiter"
)

func RateLimiterMiddleware() fiber.Handler {
    return limiter.New(limiter.Config{
        Max:        100,              // 100 requests
        Expiration: 1 * time.Minute,  // per minute
        KeyGenerator: func(c *fiber.Ctx) string {
            // Rate limit per user if authenticated, else per IP
            if userID := c.Locals("userID"); userID != nil {
                return fmt.Sprintf("user:%d", userID)
            }
            return c.IP()
        },
        LimitReached: func(c *fiber.Ctx) error {
            return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
                "success": false,
                "message": "Rate limit exceeded. Please try again later.",
            })
        },
    })
}

// Stricter rate limit for sensitive endpoints
func StrictRateLimiter() fiber.Handler {
    return limiter.New(limiter.Config{
        Max:        10,               // 10 requests
        Expiration: 1 * time.Minute,  // per minute
        KeyGenerator: func(c *fiber.Ctx) string {
            return c.IP()
        },
    })
}

// QR Scan specific rate limiter
func QRScanRateLimiter() fiber.Handler {
    return limiter.New(limiter.Config{
        Max:        30,               // 30 scans
        Expiration: 1 * time.Minute,  // per minute
        KeyGenerator: func(c *fiber.Ctx) string {
            if userID := c.Locals("userID"); userID != nil {
                return fmt.Sprintf("qr_scan:%d", userID)
            }
            return fmt.Sprintf("qr_scan:%s", c.IP())
        },
    })
}
```
