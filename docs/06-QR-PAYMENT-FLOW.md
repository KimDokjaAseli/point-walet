# BAB 6: ARSITEKTUR QR PAYMENT FLOW

## 6.1 Diagram Alur QR Payment

```
┌─────────────────────────────────────────────────────────────────┐
│                    QR PAYMENT FLOW DIAGRAM                       │
└─────────────────────────────────────────────────────────────────┘

    DOSEN                                           MAHASISWA
      │                                                  │
      │ 1. Generate QR                                   │
      ▼                                                  │
  ┌───────┐                                              │
  │Create │                                              │
  │  QR   │                                              │
  └───┬───┘                                              │
      │                                                  │
      ▼                                                  │
  ┌───────────────────┐                                  │
  │ POST /qr/create   │                                  │
  │ amount, desc,     │                                  │
  │ expires: 10min    │                                  │
  └─────────┬─────────┘                                  │
            │                                            │
            ▼                                            │
  ┌───────────────────┐                                  │
  │ Generate:         │                                  │
  │ - UUID code       │                                  │
  │ - HMAC signature  │                                  │
  │ - QR Image        │                                  │
  └─────────┬─────────┘                                  │
            │                                            │
            ▼                                            │
  ┌───────────────────┐                                  │
  │ Display QR +      │                                  │
  │ Countdown Timer   │◄──────── 2. Scan QR ────────────┤
  └───────────────────┘                                  │
                                                         ▼
                                               ┌───────────────────┐
                                               │ Camera Scan QR    │
                                               │ Extract: code     │
                                               └─────────┬─────────┘
                                                         │
                                                         ▼
                                               ┌───────────────────┐
                                               │ POST /qr/process  │
                                               │ qr_code, idemp_key│
                                               └─────────┬─────────┘
                                                         │
            ┌────────────────────────────────────────────┘
            │
            ▼
  ╔═══════════════════════════════════════════════════════════════╗
  ║                    SERVER PROCESSING                          ║
  ╠═══════════════════════════════════════════════════════════════╣
  ║                                                               ║
  ║  3. Validate QR                                               ║
  ║  ┌─────────────────┐                                          ║
  ║  │ Check:          │                                          ║
  ║  │ - QR exists?    │──NO──► Return: QR_NOT_FOUND              ║
  ║  │ - Signature OK? │──NO──► Return: INVALID_SIGNATURE         ║
  ║  │ - Not expired?  │──NO──► Return: QR_EXPIRED                ║
  ║  │ - Not used?     │──NO──► Return: QR_ALREADY_USED           ║
  ║  │ - Self-payment? │──YES─► Return: CANNOT_PAY_SELF           ║
  ║  └────────┬────────┘                                          ║
  ║           │ ALL OK                                            ║
  ║           ▼                                                   ║
  ║  4. Atomic Transaction                                        ║
  ║  ┌─────────────────────────────────────────────────────────┐  ║
  ║  │ BEGIN TRANSACTION (SERIALIZABLE)                        │  ║
  ║  │                                                         │  ║
  ║  │ ┌─────────────────────────────────────────────────────┐ │  ║
  ║  │ │ 4a. Lock Payer Wallet (SELECT ... FOR UPDATE)       │ │  ║
  ║  │ └─────────────────────────────────────────────────────┘ │  ║
  ║  │                          │                              │  ║
  ║  │                          ▼                              │  ║
  ║  │ ┌─────────────────────────────────────────────────────┐ │  ║
  ║  │ │ 4b. Check Balance >= Amount                         │ │  ║
  ║  │ │     IF NOT: ROLLBACK → INSUFFICIENT_BALANCE         │ │  ║
  ║  │ └─────────────────────────────────────────────────────┘ │  ║
  ║  │                          │                              │  ║
  ║  │                          ▼                              │  ║
  ║  │ ┌─────────────────────────────────────────────────────┐ │  ║
  ║  │ │ 4c. Lock Payee Wallet (SELECT ... FOR UPDATE)       │ │  ║
  ║  │ └─────────────────────────────────────────────────────┘ │  ║
  ║  │                          │                              │  ║
  ║  │                          ▼                              │  ║
  ║  │ ┌─────────────────────────────────────────────────────┐ │  ║
  ║  │ │ 4d. Debit Payer: balance -= amount                  │ │  ║
  ║  │ └─────────────────────────────────────────────────────┘ │  ║
  ║  │                          │                              │  ║
  ║  │                          ▼                              │  ║
  ║  │ ┌─────────────────────────────────────────────────────┐ │  ║
  ║  │ │ 4e. Credit Payee: balance += amount                 │ │  ║
  ║  │ └─────────────────────────────────────────────────────┘ │  ║
  ║  │                          │                              │  ║
  ║  │                          ▼                              │  ║
  ║  │ ┌─────────────────────────────────────────────────────┐ │  ║
  ║  │ │ 4f. Create Ledger Entries (DEBIT + CREDIT)          │ │  ║
  ║  │ └─────────────────────────────────────────────────────┘ │  ║
  ║  │                          │                              │  ║
  ║  │                          ▼                              │  ║
  ║  │ ┌─────────────────────────────────────────────────────┐ │  ║
  ║  │ │ 4g. Create Transaction Record                       │ │  ║
  ║  │ └─────────────────────────────────────────────────────┘ │  ║
  ║  │                          │                              │  ║
  ║  │                          ▼                              │  ║
  ║  │ ┌─────────────────────────────────────────────────────┐ │  ║
  ║  │ │ 4h. Mark QR as USED                                 │ │  ║
  ║  │ └─────────────────────────────────────────────────────┘ │  ║
  ║  │                          │                              │  ║
  ║  │                          ▼                              │  ║
  ║  │ ┌─────────────────────────────────────────────────────┐ │  ║
  ║  │ │ 4i. Create Audit Log                                │ │  ║
  ║  │ └─────────────────────────────────────────────────────┘ │  ║
  ║  │                          │                              │  ║
  ║  │                          ▼                              │  ║
  ║  │ COMMIT TRANSACTION                                      │  ║
  ║  └─────────────────────────────────────────────────────────┘  ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
            │
            ▼
  ┌───────────────────┐                            ┌───────────────────┐
  │ Response:         │                            │ Response:         │
  │ SUCCESS           │────────────────────────────► Show Success      │
  │ transaction_code  │                            │ + New Balance     │
  │ amount            │                            │                   │
  └───────────────────┘                            └───────────────────┘
```

---

## 6.2 Detail Implementasi Step-by-Step

### 6.2.1 Step 1: Generate QR oleh Dosen

```go
// internal/modules/qr/service.go
func (s *Service) CreateQR(ctx context.Context, req CreateQRRequest, creatorID uint) (*QRCode, error) {
    // Validate amount
    if req.Amount <= 0 {
        return nil, errors.New("amount must be positive")
    }

    // Generate unique code
    code := uuid.New().String()

    // Generate HMAC signature for integrity
    signature := s.generateSignature(code, req.Amount, creatorID)

    // Calculate expiry (10 minutes from now)
    expiresAt := time.Now().Add(10 * time.Minute)

    qr := &QRCode{
        Code:        code,
        QRType:      "PAYMENT",
        CreatorID:   creatorID,
        Amount:      req.Amount,
        Description: req.Description,
        Signature:   signature,
        Status:      "ACTIVE",
        IsSingleUse: true,
        ExpiresAt:   expiresAt,
        CreatedAt:   time.Now(),
    }

    // Save to database
    if err := s.repo.Create(ctx, qr); err != nil {
        return nil, err
    }

    // Generate QR image
    qr.ImageBase64, _ = s.generateQRImage(code)

    return qr, nil
}

func (s *Service) generateSignature(code string, amount int64, creatorID uint) string {
    data := fmt.Sprintf("%s|%d|%d", code, amount, creatorID)
    h := hmac.New(sha256.New, []byte(s.config.SigningSecret))
    h.Write([]byte(data))
    return hex.EncodeToString(h.Sum(nil))
}
```

### 6.2.2 Step 2: Scan QR oleh Mahasiswa

```javascript
// Mobile: js/pages/mahasiswa/qr-scanner.js
async function handleScan() {
    try {
        Loading.show('Memindai QR...');
        
        const qrCode = await QRScanner.scan();
        
        if (!qrCode) {
            Toast.error('Scan dibatalkan');
            return;
        }

        Loading.show('Memproses pembayaran...');
        
        const result = await processPayment(qrCode);
        
        if (result.success) {
            showSuccessDialog(result.data);
        } else if (result.offline) {
            showOfflineDialog(result);
        }
    } catch (error) {
        handleScanError(error);
    } finally {
        Loading.hide();
    }
}

async function processPayment(qrCode) {
    const idempotencyKey = generateIdempotencyKey();
    
    // Store locally for retry
    await Storage.setTemp('pending_payment', {
        qr_code: qrCode,
        idempotency_key: idempotencyKey,
        timestamp: Date.now()
    });

    try {
        const response = await API.post('/qr/process', {
            qr_code: qrCode,
            idempotency_key: idempotencyKey
        });
        
        // Clear pending on success
        await Storage.removeTemp('pending_payment');
        
        return response;
    } catch (error) {
        if (!navigator.onLine) {
            return {
                success: false,
                offline: true,
                message: 'Akan diproses saat online'
            };
        }
        throw error;
    }
}
```

### 6.2.3 Step 3: Validasi QR

```go
// internal/modules/qr/service.go
func (s *Service) ValidateQR(ctx context.Context, code string, payerID uint) (*QRCode, error) {
    // Get QR with lock
    qr, err := s.repo.GetByCodeForUpdate(ctx, nil, code)
    if err != nil {
        return nil, &QRError{Code: "QR_NOT_FOUND", Message: "QR Code tidak ditemukan"}
    }

    // Validate signature
    expectedSig := s.generateSignature(qr.Code, qr.Amount, qr.CreatorID)
    if qr.Signature != expectedSig {
        return nil, &QRError{Code: "INVALID_SIGNATURE", Message: "QR Code tidak valid"}
    }

    // Check expiry
    if time.Now().After(qr.ExpiresAt) {
        s.repo.UpdateStatus(ctx, qr.ID, "EXPIRED")
        return nil, &QRError{Code: "QR_EXPIRED", Message: "QR Code sudah kadaluarsa"}
    }

    // Check if already used
    if qr.Status == "USED" {
        return nil, &QRError{Code: "QR_ALREADY_USED", Message: "QR Code sudah digunakan"}
    }

    // Check self-payment
    if qr.CreatorID == payerID {
        return nil, &QRError{Code: "CANNOT_PAY_SELF", Message: "Tidak dapat membayar ke diri sendiri"}
    }

    return qr, nil
}
```

### 6.2.4 Step 4: Atomic Wallet Transaction

```go
// internal/modules/qr/service.go
func (s *Service) ProcessQRPayment(ctx context.Context, req ProcessQRRequest, payerID uint) (*TransactionResult, error) {
    // Check idempotency first
    if existing, _ := s.txRepo.GetByIdempotencyKey(ctx, req.IdempotencyKey); existing != nil {
        return &TransactionResult{
            TransactionID:   existing.ID,
            TransactionCode: existing.TransactionCode,
            Status:          existing.Status,
            Amount:          existing.Amount,
            AlreadyProcessed: true,
        }, nil
    }

    // Start atomic transaction
    tx, err := s.db.BeginTx(ctx, &sql.TxOptions{
        Isolation: sql.LevelSerializable,
    })
    if err != nil {
        return nil, err
    }
    defer tx.Rollback()

    // 1. Validate QR
    qr, err := s.validateAndLockQR(ctx, tx, req.QRCode, payerID)
    if err != nil {
        return nil, err
    }

    // 2. Lock and validate payer wallet
    payerWallet, err := s.walletRepo.GetByUserIDForUpdate(ctx, tx, payerID)
    if err != nil {
        return nil, &QRError{Code: "WALLET_NOT_FOUND", Message: "Wallet tidak ditemukan"}
    }

    if payerWallet.Balance < qr.Amount {
        return nil, &QRError{Code: "INSUFFICIENT_BALANCE", Message: "Saldo tidak mencukupi"}
    }

    if payerWallet.IsFrozen {
        return nil, &QRError{Code: "WALLET_FROZEN", Message: "Wallet dibekukan"}
    }

    // 3. Lock payee wallet
    payeeWallet, err := s.walletRepo.GetByUserIDForUpdate(ctx, tx, qr.CreatorID)
    if err != nil {
        return nil, err
    }

    // 4. Generate transaction record
    txCode := s.generateTransactionCode()
    transaction := &Transaction{
        TransactionCode: txCode,
        IdempotencyKey:  req.IdempotencyKey,
        TransactionType: "QR_PAYMENT",
        Status:          "COMPLETED",
        FromWalletID:    &payerWallet.ID,
        ToWalletID:      &payeeWallet.ID,
        Amount:          qr.Amount,
        FeeAmount:       0,
        NetAmount:       qr.Amount,
        Description:     fmt.Sprintf("QR Payment - %s", qr.Description),
        ProcessedAt:     sql.NullTime{Time: time.Now(), Valid: true},
    }

    if err := s.txRepo.Create(ctx, tx, transaction); err != nil {
        return nil, err
    }

    // 5. Debit payer wallet
    if err := s.walletRepo.UpdateBalance(ctx, tx, payerWallet.ID, -qr.Amount); err != nil {
        return nil, err
    }

    // 6. Credit payee wallet
    if err := s.walletRepo.UpdateBalance(ctx, tx, payeeWallet.ID, qr.Amount); err != nil {
        return nil, err
    }

    // 7. Create ledger entries
    debitLedger := &WalletLedger{
        WalletID:      payerWallet.ID,
        TransactionID: &transaction.ID,
        EntryType:     "DEBIT",
        Amount:        qr.Amount,
        BalanceBefore: payerWallet.Balance,
        BalanceAfter:  payerWallet.Balance - qr.Amount,
        Description:   "QR Payment",
        ReferenceType: "QR_PAYMENT",
        ReferenceID:   qr.Code,
    }

    creditLedger := &WalletLedger{
        WalletID:      payeeWallet.ID,
        TransactionID: &transaction.ID,
        EntryType:     "CREDIT",
        Amount:        qr.Amount,
        BalanceBefore: payeeWallet.Balance,
        BalanceAfter:  payeeWallet.Balance + qr.Amount,
        Description:   "QR Payment Received",
        ReferenceType: "QR_PAYMENT",
        ReferenceID:   qr.Code,
    }

    if err := s.ledgerRepo.Create(ctx, tx, debitLedger); err != nil {
        return nil, err
    }
    if err := s.ledgerRepo.Create(ctx, tx, creditLedger); err != nil {
        return nil, err
    }

    // 8. Mark QR as used
    if err := s.qrRepo.MarkAsUsed(ctx, tx, qr.ID, payerID); err != nil {
        return nil, err
    }

    // 9. Create audit log
    auditLog := &AuditLog{
        UserID:         &payerID,
        TargetType:     "qr_codes",
        TargetID:       qr.ID,
        Action:         "QR_PAYMENT",
        ActionCategory: "TRANSACTION",
        NewValues: map[string]interface{}{
            "amount":      qr.Amount,
            "qr_code":     qr.Code,
            "transaction": txCode,
        },
        Description: fmt.Sprintf("QR Payment of %d points", qr.Amount),
        RiskLevel:   "LOW",
    }

    if err := s.auditRepo.Create(ctx, tx, auditLog); err != nil {
        return nil, err
    }

    // 10. Commit transaction
    if err := tx.Commit(); err != nil {
        return nil, err
    }

    return &TransactionResult{
        TransactionID:   transaction.ID,
        TransactionCode: txCode,
        Status:          "COMPLETED",
        Amount:          qr.Amount,
        PayerNewBalance: payerWallet.Balance - qr.Amount,
    }, nil
}
```

---

## 6.3 Anti-Duplicate Transaction (Idempotency)

```go
// internal/modules/transaction/repository.go
func (r *Repository) GetByIdempotencyKey(ctx context.Context, key string) (*Transaction, error) {
    query := `
        SELECT id, transaction_code, status, amount, processed_at
        FROM transactions
        WHERE idempotency_key = ?
    `
    
    var tx Transaction
    err := r.db.QueryRowContext(ctx, query, key).Scan(
        &tx.ID, &tx.TransactionCode, &tx.Status, &tx.Amount, &tx.ProcessedAt,
    )
    
    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    
    return &tx, nil
}
```

---

## 6.4 Offline Scan Handling

```javascript
// Mobile: js/core/offline-queue.js
class OfflinePaymentHandler {
    async handleOfflinePayment(qrCode, idempotencyKey) {
        const queueItem = {
            type: 'QR_PAYMENT',
            data: {
                qr_code: qrCode,
                idempotency_key: idempotencyKey,
                scanned_at: new Date().toISOString()
            },
            status: 'PENDING',
            retry_count: 0,
            max_retries: 3
        };

        await OfflineQueue.add(queueItem);

        // Register for when back online
        this.registerOnlineHandler();

        return {
            success: true,
            offline: true,
            message: 'Transaksi tersimpan. Akan diproses saat online.',
            queue_id: queueItem.id
        };
    }

    registerOnlineHandler() {
        const handler = async () => {
            window.removeEventListener('online', handler);
            await this.processQueue();
        };
        window.addEventListener('online', handler);
    }

    async processQueue() {
        const pending = await OfflineQueue.getPending();
        
        for (const item of pending) {
            if (item.type === 'QR_PAYMENT') {
                try {
                    const result = await API.post('/qr/process', item.data);
                    await OfflineQueue.markComplete(item.id, result);
                    Toast.success('Transaksi offline berhasil diproses');
                } catch (error) {
                    if (error.code === 'QR_EXPIRED') {
                        await OfflineQueue.markFailed(item.id, 'QR sudah kadaluarsa');
                        Toast.error('QR Code sudah kadaluarsa');
                    } else {
                        await OfflineQueue.incrementRetry(item.id);
                    }
                }
            }
        }
    }
}
```

---

## 6.5 Error Handling Matrix

| Error Code | HTTP Status | Message | User Action |
|------------|-------------|---------|-------------|
| QR_NOT_FOUND | 404 | QR Code tidak ditemukan | Scan ulang |
| INVALID_SIGNATURE | 400 | QR Code tidak valid | Hubungi penjual |
| QR_EXPIRED | 410 | QR Code sudah kadaluarsa | Minta QR baru |
| QR_ALREADY_USED | 409 | QR Code sudah digunakan | Minta QR baru |
| CANNOT_PAY_SELF | 400 | Tidak dapat membayar ke diri sendiri | - |
| INSUFFICIENT_BALANCE | 402 | Saldo tidak mencukupi | Top-up |
| WALLET_FROZEN | 403 | Wallet dibekukan | Hubungi admin |
| DUPLICATE_REQUEST | 200 | Transaksi sudah diproses | Return cached result |
| DB_ERROR | 500 | Terjadi kesalahan sistem | Retry |
