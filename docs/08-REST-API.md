# BAB 8: WEB SERVICE (REST API - FIBER)

## 8.1 Prinsip REST API

### 8.1.1 Prinsip Dasar RESTful

| Prinsip | Implementasi |
|---------|--------------|
| **Stateless** | Setiap request independen, autentikasi via JWT di header |
| **Resource-Based** | URL merepresentasikan resource, bukan action |
| **HTTP Methods** | GET (read), POST (create), PUT (update), DELETE (remove) |
| **JSON Format** | Request/response dalam format JSON |
| **HTTP Status Codes** | Gunakan status code sesuai hasil operasi |
| **Versioning** | URL prefix `/api/v1/` untuk versioning |

### 8.1.2 Standard Response Format

```json
// Success Response
{
    "success": true,
    "message": "Operation completed successfully",
    "data": {
        // Response data here
    },
    "meta": {
        "page": 1,
        "per_page": 20,
        "total": 150,
        "total_pages": 8
    }
}

// Error Response
{
    "success": false,
    "message": "Validation failed",
    "error": {
        "code": "VALIDATION_ERROR",
        "details": [
            {
                "field": "amount",
                "message": "Amount must be positive"
            }
        ]
    }
}
```

---

## 8.2 Endpoint Utama

### 8.2.1 Authentication Endpoints

```
┌──────────────────────────────────────────────────────────────────┐
│ AUTH ENDPOINTS                                                    │
├──────────────────────────────────────────────────────────────────┤
│ POST   /api/v1/auth/admin/login      Login admin                 │
│ POST   /api/v1/auth/dosen/login      Login dosen                 │
│ POST   /api/v1/auth/mahasiswa/login  Login mahasiswa             │
│ POST   /api/v1/auth/refresh          Refresh access token        │
│ POST   /api/v1/auth/logout           Logout & invalidate token   │
│ GET    /api/v1/auth/me               Get current user profile    │
│ PUT    /api/v1/auth/password         Change password             │
└──────────────────────────────────────────────────────────────────┘
```

#### Login Request/Response

```http
POST /api/v1/auth/mahasiswa/login
Content-Type: application/json

{
    "username": "student001",
    "password": "securePassword123"
}
```

```json
// Response 200 OK
{
    "success": true,
    "message": "Login successful",
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expires_in": 900,
        "token_type": "Bearer",
        "user": {
            "id": 1,
            "username": "student001",
            "full_name": "Ahmad Mahasiswa",
            "email": "ahmad@student.edu",
            "nim_nip": "123456789",
            "role": "mahasiswa",
            "avatar_url": null
        }
    }
}
```

```json
// Response 401 Unauthorized
{
    "success": false,
    "message": "Invalid credentials",
    "error": {
        "code": "INVALID_CREDENTIALS"
    }
}
```

### 8.2.2 Wallet Endpoints

```
┌──────────────────────────────────────────────────────────────────┐
│ WALLET ENDPOINTS                                                  │
├──────────────────────────────────────────────────────────────────┤
│ GET    /api/v1/wallet/balance        Get current balance         │
│ GET    /api/v1/wallet/history        Get transaction history     │
│ GET    /api/v1/wallet/ledger         Get ledger entries          │
│ POST   /api/v1/wallet/transfer       Transfer to mahasiswa (dosen)│
│                                                                   │
│ [ADMIN ONLY]                                                      │
│ GET    /api/v1/admin/wallets         List all wallets            │
│ GET    /api/v1/admin/wallets/:id     Get wallet detail           │
│ POST   /api/v1/admin/wallets/:id/freeze    Freeze wallet         │
│ POST   /api/v1/admin/wallets/:id/unfreeze  Unfreeze wallet       │
│ POST   /api/v1/admin/wallets/:id/adjust    Adjust balance        │
└──────────────────────────────────────────────────────────────────┘
```

#### Get Balance Request/Response

```http
GET /api/v1/wallet/balance
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```json
// Response 200 OK
{
    "success": true,
    "data": {
        "user_id": 1,
        "balance": 5000,
        "locked_balance": 0,
        "lifetime_earned": 15000,
        "lifetime_spent": 10000,
        "is_frozen": false,
        "last_transaction_at": "2024-01-15T10:30:00Z"
    }
}
```

#### Transfer Points (Dosen to Mahasiswa)

```http
POST /api/v1/wallet/transfer
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json


{
    "to_user_id": 25,
    "amount": 500,
    "description": "Bonus presentasi yang bagus",
    "idempotency_key": "transfer-20240115-abc123"
}
```

```json
// Response 200 OK
{
    "success": true,
    "message": "Transfer successful",
    "data": {
        "transaction_id": 1234,
        "transaction_code": "TRX-20240115-0001",
        "amount": 500,
        "from_user": {
            "id": 10,
            "full_name": "Dr. Budi Dosen"
        },
        "to_user": {
            "id": 25,
            "full_name": "Ahmad Mahasiswa"
        },
        "your_new_balance": 12000,
        "created_at": "2024-01-15T10:30:00Z"
    }
}
```

### 8.2.3 QR Code Endpoints

```
┌──────────────────────────────────────────────────────────────────┐
│ QR CODE ENDPOINTS                                                 │
├──────────────────────────────────────────────────────────────────┤
│ POST   /api/v1/qr/create             Create QR (dosen only)      │
│ GET    /api/v1/qr/:id                Get QR details              │
│ GET    /api/v1/qr/my                 List my created QRs         │
│ POST   /api/v1/qr/process            Process/scan QR payment     │
│ DELETE /api/v1/qr/:id                Cancel QR (creator only)    │
└──────────────────────────────────────────────────────────────────┘
```

#### Create QR Code

```http
POST /api/v1/qr/create
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "amount": 1000,
    "description": "Pembayaran E-Book Algoritma",
    "type": "PAYMENT"
}
```

```json
// Response 201 Created
{
    "success": true,
    "message": "QR Code created successfully",
    "data": {
        "id": 567,
        "code": "550e8400-e29b-41d4-a716-446655440000",
        "qr_type": "PAYMENT",
        "amount": 1000,
        "description": "Pembayaran E-Book Algoritma",
        "status": "ACTIVE",
        "qr_image_base64": "data:image/png;base64,iVBORw0KGgo...",
        "qr_image_url": "https://api.example.com/qr/images/567.png",
        "expires_at": "2024-01-15T10:40:00Z",
        "created_at": "2024-01-15T10:30:00Z"
    }
}
```

#### Process QR Payment (Scan)

```http
POST /api/v1/qr/process
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Idempotency-Key: scan-20240115-xyz789

{
    "qr_code": "550e8400-e29b-41d4-a716-446655440000"
}
```

```json
// Response 200 OK
{
    "success": true,
    "message": "Payment successful",
    "data": {
        "transaction_id": 1235,
        "transaction_code": "TRX-20240115-0002",
        "amount": 1000,
        "description": "Pembayaran E-Book Algoritma",
        "payee": {
            "id": 10,
            "full_name": "Dr. Budi Dosen"
        },
        "your_new_balance": 4000,
        "processed_at": "2024-01-15T10:35:00Z"
    }
}
```

```json
// Response 410 Gone (QR Expired)
{
    "success": false,
    "message": "QR Code has expired",
    "error": {
        "code": "QR_EXPIRED",
        "expired_at": "2024-01-15T10:40:00Z"
    }
}
```

### 8.2.4 Sync Endpoints (External System)

```
┌──────────────────────────────────────────────────────────────────┐
│ SYNC ENDPOINTS                                                    │
├──────────────────────────────────────────────────────────────────┤
│ POST   /api/v1/sync/pull             Manual trigger sync         │
│ GET    /api/v1/sync/status           Get sync status             │
│ GET    /api/v1/sync/history          Get sync history            │
│                                                                   │
│ [WEBHOOK - Called by external system]                            │
│ POST   /api/v1/webhook/points        Receive points webhook      │
└──────────────────────────────────────────────────────────────────┘
```

#### Webhook from External System

```http
POST /api/v1/webhook/points
X-Webhook-Secret: your-webhook-secret-key
Content-Type: application/json

{
    "batch_id": "batch-20240115-001",
    "transactions": [
        {
            "external_user_id": "EXT-001",
            "nim": "123456789",
            "points": 100,
            "type": "QUIZ_COMPLETED",
            "description": "Quiz Matematika Dasar",
            "timestamp": "2024-01-15T10:00:00Z",
            "external_transaction_id": "EXT-TRX-001"
        },
        {
            "external_user_id": "EXT-002",
            "nim": "987654321",
            "points": 150,
            "type": "ASSIGNMENT_SUBMITTED",
            "description": "Tugas Pemrograman",
            "timestamp": "2024-01-15T10:05:00Z",
            "external_transaction_id": "EXT-TRX-002"
        }
    ]
}
```

```json
// Response 200 OK
{
    "success": true,
    "message": "Webhook processed",
    "data": {
        "batch_id": "batch-20240115-001",
        "received": 2,
        "processed": 2,
        "failed": 0,
        "results": [
            {
                "external_transaction_id": "EXT-TRX-001",
                "status": "SYNCED",
                "wallet_transaction_id": 1236
            },
            {
                "external_transaction_id": "EXT-TRX-002",
                "status": "SYNCED",
                "wallet_transaction_id": 1237
            }
        ]
    }
}
```

### 8.2.5 Mission Endpoints

```
┌──────────────────────────────────────────────────────────────────┐
│ MISSION ENDPOINTS                                                 │
├──────────────────────────────────────────────────────────────────┤
│ GET    /api/v1/missions              List available missions     │
│ GET    /api/v1/missions/:id          Get mission detail          │
│ POST   /api/v1/missions/:id/start    Start a mission             │
│ POST   /api/v1/missions/:id/submit   Submit mission answers      │
│ GET    /api/v1/missions/my           List my mission history     │
│                                                                   │
│ [DOSEN ONLY]                                                      │
│ POST   /api/v1/missions              Create mission              │
│ PUT    /api/v1/missions/:id          Update mission              │
│ DELETE /api/v1/missions/:id          Delete mission              │
│ GET    /api/v1/missions/:id/participants  List participants      │
│ POST   /api/v1/missions/:id/grade    Grade submission            │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2.6 Marketplace Endpoints

```
┌──────────────────────────────────────────────────────────────────┐
│ MARKETPLACE ENDPOINTS                                             │
├──────────────────────────────────────────────────────────────────┤
│ GET    /api/v1/products              List products               │
│ GET    /api/v1/products/:id          Get product detail          │
│ POST   /api/v1/orders                Create order                │
│ GET    /api/v1/orders                List my orders              │
│ GET    /api/v1/orders/:id            Get order detail            │
│ POST   /api/v1/orders/:id/pay        Pay order                   │
│ GET    /api/v1/orders/:id/download   Download purchased item     │
│                                                                   │
│ [DOSEN ONLY]                                                      │
│ POST   /api/v1/products              Create product              │
│ PUT    /api/v1/products/:id          Update product              │
│ DELETE /api/v1/products/:id          Delete product              │
│ GET    /api/v1/products/my           List my products            │
│ GET    /api/v1/products/:id/sales    Get sales report            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8.3 Implementasi Handler (Fiber)

```go
// internal/modules/qr/handler.go
package qr

import (
    "github.com/gofiber/fiber/v2"
)

type Handler struct {
    service ServiceInterface
}

func NewHandler(service ServiceInterface) *Handler {
    return &Handler{service: service}
}

// CreateQR godoc
// @Summary Create a new QR code for payment
// @Description Dosen creates QR code that mahasiswa can scan to pay
// @Tags QR
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body CreateQRRequest true "QR creation request"
// @Success 201 {object} Response{data=QRCodeResponse}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Router /api/v1/qr/create [post]
func (h *Handler) CreateQR(c *fiber.Ctx) error {
    var req CreateQRRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "success": false,
            "message": "Invalid request body",
            "error": fiber.Map{
                "code": "INVALID_REQUEST",
            },
        })
    }

    // Validate request
    if err := req.Validate(); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "success": false,
            "message": "Validation failed",
            "error": fiber.Map{
                "code":    "VALIDATION_ERROR",
                "details": err.Details(),
            },
        })
    }

    creatorID := c.Locals("userID").(uint)

    qr, err := h.service.CreateQR(c.Context(), req, creatorID)
    if err != nil {
        return h.handleError(c, err)
    }

    return c.Status(fiber.StatusCreated).JSON(fiber.Map{
        "success": true,
        "message": "QR Code created successfully",
        "data":    qr.ToResponse(),
    })
}

// ProcessQR godoc
// @Summary Process QR code payment
// @Description Mahasiswa scans and pays using QR code
// @Tags QR
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param X-Idempotency-Key header string true "Idempotency key"
// @Param request body ProcessQRRequest true "QR process request"
// @Success 200 {object} Response{data=TransactionResponse}
// @Failure 400 {object} ErrorResponse
// @Failure 402 {object} ErrorResponse "Insufficient balance"
// @Failure 409 {object} ErrorResponse "QR already used"
// @Failure 410 {object} ErrorResponse "QR expired"
// @Router /api/v1/qr/process [post]
func (h *Handler) ProcessQR(c *fiber.Ctx) error {
    var req ProcessQRRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "success": false,
            "message": "Invalid request body",
        })
    }

    // Get idempotency key from header or body
    idempotencyKey := c.Get("X-Idempotency-Key")
    if idempotencyKey == "" {
        idempotencyKey = req.IdempotencyKey
    }
    if idempotencyKey == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "success": false,
            "message": "Idempotency key is required",
            "error": fiber.Map{
                "code": "MISSING_IDEMPOTENCY_KEY",
            },
        })
    }

    req.IdempotencyKey = idempotencyKey
    payerID := c.Locals("userID").(uint)

    result, err := h.service.ProcessQRPayment(c.Context(), req, payerID)
    if err != nil {
        return h.handleError(c, err)
    }

    if result.AlreadyProcessed {
        return c.Status(fiber.StatusOK).JSON(fiber.Map{
            "success": true,
            "message": "Transaction already processed",
            "data":    result.ToResponse(),
        })
    }

    return c.Status(fiber.StatusOK).JSON(fiber.Map{
        "success": true,
        "message": "Payment successful",
        "data":    result.ToResponse(),
    })
}

func (h *Handler) handleError(c *fiber.Ctx, err error) error {
    if qrErr, ok := err.(*QRError); ok {
        status := fiber.StatusBadRequest
        switch qrErr.Code {
        case "QR_NOT_FOUND":
            status = fiber.StatusNotFound
        case "QR_EXPIRED":
            status = fiber.StatusGone
        case "QR_ALREADY_USED":
            status = fiber.StatusConflict
        case "INSUFFICIENT_BALANCE":
            status = fiber.StatusPaymentRequired
        case "WALLET_FROZEN":
            status = fiber.StatusForbidden
        }

        return c.Status(status).JSON(fiber.Map{
            "success": false,
            "message": qrErr.Message,
            "error": fiber.Map{
                "code": qrErr.Code,
            },
        })
    }

    return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
        "success": false,
        "message": "Internal server error",
        "error": fiber.Map{
            "code": "INTERNAL_ERROR",
        },
    })
}
```

---

## 8.4 Route Registration

```go
// internal/modules/qr/routes.go
package qr

import (
    "github.com/gofiber/fiber/v2"
    "app/internal/middleware"
)

func RegisterRoutes(router fiber.Router, handler *Handler) {
    qr := router.Group("/qr")
    
    // All routes require authentication
    qr.Use(middleware.JWTMiddleware())
    
    // Create QR - Dosen only
    qr.Post("/create", 
        middleware.RequireRole("dosen"),
        middleware.RateLimiter("transaction"),
        handler.CreateQR,
    )
    
    // Process QR - All authenticated users
    qr.Post("/process",
        middleware.RateLimiter("qr_scan"),
        handler.ProcessQR,
    )
    
    // Get my QRs - Creator only
    qr.Get("/my",
        middleware.RequireRole("dosen"),
        handler.GetMyQRs,
    )
    
    // Get QR detail
    qr.Get("/:id", handler.GetQRDetail)
    
    // Cancel QR - Creator only
    qr.Delete("/:id",
        middleware.RequireRole("dosen"),
        handler.CancelQR,
    )
}
```

---

## 8.5 Best Practices Production

### 8.5.1 Security Checklist

- [x] HTTPS only (TLS 1.2+)
- [x] JWT dengan expiry pendek (15 menit)
- [x] Refresh token dengan rotation
- [x] Rate limiting per endpoint
- [x] Input validation di semua endpoint
- [x] SQL injection prevention (parameterized queries)
- [x] CORS configuration
- [x] Security headers (X-Content-Type-Options, etc.)
- [x] Audit logging untuk operasi sensitif
- [x] Idempotency keys untuk transaksi

### 8.5.2 Performance Checklist

- [x] Connection pooling untuk database
- [x] Response compression (gzip)
- [x] Pagination untuk list endpoints
- [x] Database indexing pada kolom yang sering di-query
- [x] Query optimization (avoid N+1)
- [x] Caching dengan Redis untuk data yang sering diakses

### 8.5.3 Monitoring & Observability

- [x] Request logging dengan correlation ID
- [x] Error tracking dan alerting
- [x] Health check endpoint
- [x] Metrics endpoint untuk Prometheus
- [x] Distributed tracing ready
