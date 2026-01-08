# BAB 5: ARSITEKTUR API GATEWAY & MICROSERVICE READY

## 5.1 Fungsi API Gateway

### 5.1.1 Diagram Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Mobile App  │  │  Web Admin  │  │ External    │              │
│  │  (Cordova)  │  │  (Browser)  │  │   System    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    NGINX / Traefik                       │    │
│  │  • SSL Termination     • Load Balancing                 │    │
│  │  • Request Routing     • Rate Limiting (L7)             │    │
│  │  • CORS Handling       • Request/Response Logging       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER (FIBER)                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 MIDDLEWARE CHAIN                         │    │
│  │  JWT Auth → RBAC → Rate Limit → Request Validation      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────┬───────────┬───────────┬───────────┬──────────┐   │
│  │   Auth    │  Wallet   │    QR     │  Mission  │Marketplace│   │
│  │  Module   │  Module   │  Module   │  Module   │  Module   │   │
│  └───────────┴───────────┴───────────┴───────────┴──────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    MySQL    │  │    Redis    │  │    S3/      │              │
│  │  (Primary)  │  │   (Cache)   │  │   MinIO     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 5.1.2 Implementasi API Gateway di Fiber

```go
// cmd/app/main.go
package main

import (
    "log"
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/recover"
    "github.com/gofiber/fiber/v2/middleware/requestid"
)

func main() {
    app := fiber.New(fiber.Config{
        AppName:      "WalletPoint API v1.0",
        ErrorHandler: customErrorHandler,
    })

    // Global middlewares (API Gateway functions)
    app.Use(recover.New())
    app.Use(requestid.New())
    app.Use(logger.New(logger.Config{
        Format: "[${time}] ${status} - ${method} ${path} - ${latency}\n",
    }))
    app.Use(cors.New(cors.Config{
        AllowOrigins: config.AllowedOrigins,
        AllowMethods: "GET,POST,PUT,DELETE,PATCH",
        AllowHeaders: "Origin,Content-Type,Accept,Authorization,X-Idempotency-Key",
    }))

    // Rate limiting
    app.Use(middleware.RateLimiterMiddleware())

    // API versioning
    v1 := app.Group("/api/v1")

    // Health check
    v1.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{"status": "healthy"})
    })

    // Register module routes
    auth.RegisterRoutes(v1, authService)
    user.RegisterRoutes(v1, userService)
    wallet.RegisterRoutes(v1, walletService)
    qr.RegisterRoutes(v1, qrService)
    mission.RegisterRoutes(v1, missionService)
    marketplace.RegisterRoutes(v1, marketplaceService)
    audit.RegisterRoutes(v1, auditService)

    log.Fatal(app.Listen(":8080"))
}
```

---

## 5.2 Rate Limiting & Security

### 5.2.1 Multi-Layer Rate Limiting

```go
// internal/middleware/ratelimit.go
package middleware

import (
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/limiter"
)

// Rate limit configurations per endpoint type
var rateLimitConfigs = map[string]limiter.Config{
    "default": {
        Max:        100,
        Expiration: 1 * time.Minute,
    },
    "auth": {
        Max:        10,
        Expiration: 1 * time.Minute,
    },
    "transaction": {
        Max:        30,
        Expiration: 1 * time.Minute,
    },
    "qr_scan": {
        Max:        20,
        Expiration: 1 * time.Minute,
    },
}

func RateLimiter(configName string) fiber.Handler {
    config := rateLimitConfigs[configName]
    if config.Max == 0 {
        config = rateLimitConfigs["default"]
    }

    config.KeyGenerator = func(c *fiber.Ctx) string {
        if userID := c.Locals("userID"); userID != nil {
            return fmt.Sprintf("%s:user:%d", configName, userID)
        }
        return fmt.Sprintf("%s:ip:%s", configName, c.IP())
    }

    config.LimitReached = func(c *fiber.Ctx) error {
        return c.Status(429).JSON(fiber.Map{
            "success": false,
            "error": fiber.Map{
                "code":    "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please try again later.",
            },
        })
    }

    return limiter.New(config)
}
```

### 5.2.2 Security Headers Middleware

```go
// internal/middleware/security.go
package middleware

import "github.com/gofiber/fiber/v2"

func SecurityHeaders() fiber.Handler {
    return func(c *fiber.Ctx) error {
        c.Set("X-Content-Type-Options", "nosniff")
        c.Set("X-Frame-Options", "DENY")
        c.Set("X-XSS-Protection", "1; mode=block")
        c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
        c.Set("Content-Security-Policy", "default-src 'self'")
        c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return c.Next()
    }
}
```

---

## 5.3 Rencana Migrasi ke Microservice

### 5.3.1 Service Decomposition Strategy

| Service | Responsibilities | Database |
|---------|-----------------|----------|
| **Auth Service** | Login, JWT, Sessions, RBAC | auth_db |
| **User Service** | User management, Profiles | user_db |
| **Wallet Service** | Balance, Ledger, Transactions | wallet_db |
| **QR Service** | Generate, Validate, Process QR | qr_db |
| **Mission Service** | CRUD Mission, Participation | mission_db |
| **Marketplace Service** | Products, Orders, Checkout | marketplace_db |
| **Audit Service** | Logging, Compliance, Reports | audit_db |
| **Notification Service** | Push, Email, SMS | notification_db |

### 5.3.2 Migration Phases

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Modular Monolith (Current)                             │
│ • Single deployment                                             │
│ • Shared database                                               │
│ • In-process communication                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Database per Module                                    │
│ • Single deployment                                             │
│ • Separate schemas (logical separation)                         │
│ • In-process communication                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Extract Critical Services                              │
│ • Auth Service → Separate deployment                            │
│ • Wallet Service → Separate deployment                          │
│ • REST communication                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: Full Microservices                                     │
│ • All services independent                                      │
│ • Event-driven communication (Kafka/RabbitMQ)                   │
│ • Service mesh (Istio/Linkerd)                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3.3 Service Interface Contract

```go
// pkg/contracts/wallet_service.go
package contracts

type WalletServiceInterface interface {
    GetBalance(ctx context.Context, userID uint) (*BalanceResponse, error)
    Debit(ctx context.Context, req DebitRequest) (*TransactionResponse, error)
    Credit(ctx context.Context, req CreditRequest) (*TransactionResponse, error)
    GetLedger(ctx context.Context, userID uint, params PaginationParams) (*LedgerResponse, error)
}

type BalanceResponse struct {
    UserID   uint  `json:"user_id"`
    Balance  int64 `json:"balance"`
    Locked   int64 `json:"locked_balance"`
}

type DebitRequest struct {
    UserID         uint   `json:"user_id"`
    Amount         int64  `json:"amount"`
    Description    string `json:"description"`
    ReferenceType  string `json:"reference_type"`
    ReferenceID    string `json:"reference_id"`
    IdempotencyKey string `json:"idempotency_key"`
}

type TransactionResponse struct {
    TransactionID   uint   `json:"transaction_id"`
    TransactionCode string `json:"transaction_code"`
    Status          string `json:"status"`
    Amount          int64  `json:"amount"`
}
```

---

## 5.4 Pola Komunikasi

### 5.4.1 Synchronous (REST)

Digunakan untuk operasi yang membutuhkan respons langsung:

```go
// HTTP Client untuk inter-service communication
type ServiceClient struct {
    baseURL    string
    httpClient *http.Client
}

func (c *ServiceClient) Call(ctx context.Context, method, path string, body interface{}) (*Response, error) {
    reqBody, _ := json.Marshal(body)
    
    req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewBuffer(reqBody))
    if err != nil {
        return nil, err
    }
    
    // Forward trace context
    req.Header.Set("X-Request-ID", ctx.Value("request_id").(string))
    req.Header.Set("Content-Type", "application/json")
    
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var response Response
    json.NewDecoder(resp.Body).Decode(&response)
    
    return &response, nil
}
```

### 5.4.2 Asynchronous (Event-Driven) - Future

Digunakan untuk operasi yang tidak membutuhkan respons langsung:

```go
// Event publisher interface (untuk implementasi di masa depan)
type EventPublisher interface {
    Publish(ctx context.Context, topic string, event Event) error
}

type Event struct {
    ID        string    `json:"id"`
    Type      string    `json:"type"`
    Source    string    `json:"source"`
    Timestamp time.Time `json:"timestamp"`
    Data      interface{} `json:"data"`
}

// Contoh events yang akan dikirim
// - TransactionCompleted
// - MissionCompleted
// - OrderCreated
// - PointsEarned
```

### 5.4.3 Communication Matrix

| From → To | Auth | Wallet | QR | Mission | Marketplace |
|-----------|------|--------|-----|---------|-------------|
| **Auth** | - | - | - | - | - |
| **Wallet** | Sync | - | - | - | - |
| **QR** | Sync | Sync | - | - | Sync |
| **Mission** | Sync | Sync | - | - | - |
| **Marketplace** | Sync | Sync | Sync | - | - |
