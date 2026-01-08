# BAB 3: IMPLEMENTASI SQL

## 3.1 Query JOIN

### 3.1.1 Riwayat Transaksi User
```sql
-- Query untuk melihat riwayat transaksi lengkap user
SELECT 
    t.id,
    t.transaction_code,
    t.transaction_type,
    t.status,
    t.amount,
    t.net_amount,
    t.description,
    t.created_at,
    CASE 
        WHEN t.from_wallet_id = w.id THEN 'DEBIT'
        WHEN t.to_wallet_id = w.id THEN 'CREDIT'
    END as direction,
    COALESCE(from_u.full_name, 'System') as from_user,
    COALESCE(to_u.full_name, 'System') as to_user,
    qr.code as qr_code,
    m.title as mission_title
FROM transactions t
INNER JOIN wallets w ON w.user_id = ?
LEFT JOIN wallets from_w ON t.from_wallet_id = from_w.id
LEFT JOIN users from_u ON from_w.user_id = from_u.id
LEFT JOIN wallets to_w ON t.to_wallet_id = to_w.id
LEFT JOIN users to_u ON to_w.user_id = to_u.id
LEFT JOIN qr_codes qr ON t.id = (
    SELECT transaction_id FROM qr_codes WHERE id = qr.id LIMIT 1
)
LEFT JOIN mission_logs ml ON t.id = ml.id
LEFT JOIN missions m ON ml.mission_id = m.id
WHERE t.from_wallet_id = w.id OR t.to_wallet_id = w.id
ORDER BY t.created_at DESC
LIMIT 50 OFFSET 0;
```

### 3.1.2 Rekap Pembelian Marketplace
```sql
-- Rekap pembelian per user dengan detail produk
SELECT 
    o.order_code,
    o.created_at as order_date,
    o.status as order_status,
    o.total_amount,
    u_buyer.full_name as buyer_name,
    u_seller.full_name as seller_name,
    GROUP_CONCAT(
        CONCAT(oi.product_name, ' (', oi.quantity, 'x ', oi.unit_price, ' pts)')
        SEPARATOR ', '
    ) as items,
    COUNT(oi.id) as total_items,
    p.product_type,
    t.transaction_code,
    t.status as payment_status
FROM orders o
INNER JOIN users u_buyer ON o.buyer_id = u_buyer.id
INNER JOIN users u_seller ON o.seller_id = u_seller.id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
LEFT JOIN transactions t ON o.transaction_id = t.id
WHERE o.buyer_id = ?
GROUP BY o.id, o.order_code, o.created_at, o.status, 
         o.total_amount, u_buyer.full_name, u_seller.full_name,
         p.product_type, t.transaction_code, t.status
ORDER BY o.created_at DESC;
```

### 3.1.3 Audit Wallet
```sql
-- Query audit wallet dengan ledger dan transaksi terkait
SELECT 
    wl.id as ledger_id,
    wl.entry_type,
    wl.amount,
    wl.balance_before,
    wl.balance_after,
    wl.description as ledger_description,
    wl.reference_type,
    wl.reference_id,
    wl.created_at as ledger_time,
    t.transaction_code,
    t.transaction_type,
    t.status as transaction_status,
    u.full_name as wallet_owner,
    al.action as audit_action,
    al.ip_address,
    al.risk_level
FROM wallet_ledgers wl
INNER JOIN wallets w ON wl.wallet_id = w.id
INNER JOIN users u ON w.user_id = u.id
LEFT JOIN transactions t ON wl.transaction_id = t.id
LEFT JOIN audit_logs al ON al.target_type = 'wallet_ledgers' 
    AND al.target_id = wl.id
WHERE w.user_id = ?
ORDER BY wl.created_at DESC
LIMIT 100;
```

---

## 3.2 TRIGGER

### 3.2.1 Trigger Update Saldo Wallet Otomatis
```sql
DELIMITER //

-- Trigger untuk auto-update wallet balance setelah ledger entry
CREATE TRIGGER trg_wallet_balance_after_ledger
AFTER INSERT ON wallet_ledgers
FOR EACH ROW
BEGIN
    DECLARE current_balance BIGINT;
    
    -- Get current balance
    SELECT balance INTO current_balance 
    FROM wallets 
    WHERE id = NEW.wallet_id 
    FOR UPDATE;
    
    -- Update balance based on entry type
    IF NEW.entry_type = 'CREDIT' THEN
        UPDATE wallets 
        SET balance = balance + NEW.amount,
            lifetime_earned = lifetime_earned + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.wallet_id;
    ELSEIF NEW.entry_type = 'DEBIT' THEN
        UPDATE wallets 
        SET balance = balance - NEW.amount,
            lifetime_spent = lifetime_spent + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.wallet_id;
    END IF;
END //

DELIMITER ;
```

### 3.2.2 Trigger Insert Audit Log Otomatis
```sql
DELIMITER //

-- Trigger untuk auto-insert audit log saat transaksi selesai
CREATE TRIGGER trg_audit_log_after_transaction
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    -- Log saat status berubah menjadi COMPLETED
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        INSERT INTO audit_logs (
            user_id,
            target_type,
            target_id,
            action,
            action_category,
            old_values,
            new_values,
            description,
            risk_level,
            created_at
        ) VALUES (
            NULL, -- System action
            'transactions',
            NEW.id,
            'TRANSACTION_COMPLETED',
            'TRANSACTION',
            JSON_OBJECT('status', OLD.status),
            JSON_OBJECT(
                'status', NEW.status,
                'amount', NEW.amount,
                'type', NEW.transaction_type
            ),
            CONCAT('Transaction ', NEW.transaction_code, ' completed. Amount: ', NEW.amount),
            CASE 
                WHEN NEW.amount >= 100000 THEN 'HIGH'
                WHEN NEW.amount >= 10000 THEN 'MEDIUM'
                ELSE 'LOW'
            END,
            NOW()
        );
    END IF;
    
    -- Log saat status berubah menjadi FAILED
    IF NEW.status = 'FAILED' AND OLD.status != 'FAILED' THEN
        INSERT INTO audit_logs (
            user_id,
            target_type,
            target_id,
            action,
            action_category,
            old_values,
            new_values,
            description,
            risk_level,
            created_at
        ) VALUES (
            NULL,
            'transactions',
            NEW.id,
            'TRANSACTION_FAILED',
            'TRANSACTION',
            JSON_OBJECT('status', OLD.status),
            JSON_OBJECT('status', NEW.status, 'reason', NEW.failure_reason),
            CONCAT('Transaction ', NEW.transaction_code, ' failed: ', COALESCE(NEW.failure_reason, 'Unknown')),
            'MEDIUM',
            NOW()
        );
    END IF;
END //

DELIMITER ;
```

### 3.2.3 Trigger Validasi Balance Sebelum Debit
```sql
DELIMITER //

CREATE TRIGGER trg_validate_balance_before_ledger
BEFORE INSERT ON wallet_ledgers
FOR EACH ROW
BEGIN
    DECLARE current_balance BIGINT;
    
    IF NEW.entry_type = 'DEBIT' THEN
        SELECT balance INTO current_balance 
        FROM wallets 
        WHERE id = NEW.wallet_id;
        
        IF current_balance < NEW.amount THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient balance for debit operation';
        END IF;
        
        -- Set balance_before dan balance_after
        SET NEW.balance_before = current_balance;
        SET NEW.balance_after = current_balance - NEW.amount;
    ELSE
        SELECT balance INTO current_balance 
        FROM wallets 
        WHERE id = NEW.wallet_id;
        
        SET NEW.balance_before = current_balance;
        SET NEW.balance_after = current_balance + NEW.amount;
    END IF;
END //

DELIMITER ;
```

---

## 3.3 STORED PROCEDURE

### 3.3.1 Proses QR Payment
```sql
DELIMITER //

CREATE PROCEDURE sp_process_qr_payment(
    IN p_qr_code VARCHAR(100),
    IN p_payer_user_id BIGINT,
    IN p_idempotency_key VARCHAR(64),
    OUT p_result_code INT,
    OUT p_result_message VARCHAR(255),
    OUT p_transaction_id BIGINT
)
proc_label: BEGIN
    DECLARE v_qr_id BIGINT;
    DECLARE v_qr_status VARCHAR(20);
    DECLARE v_qr_amount BIGINT;
    DECLARE v_qr_expires_at TIMESTAMP;
    DECLARE v_creator_id BIGINT;
    DECLARE v_payer_wallet_id BIGINT;
    DECLARE v_payer_balance BIGINT;
    DECLARE v_creator_wallet_id BIGINT;
    DECLARE v_transaction_code VARCHAR(50);
    DECLARE v_existing_tx BIGINT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result_code = -1;
        SET p_result_message = 'Database error occurred';
        SET p_transaction_id = NULL;
    END;
    
    -- Check idempotency
    SELECT id INTO v_existing_tx
    FROM transactions
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;
    
    IF v_existing_tx IS NOT NULL THEN
        SET p_result_code = 0;
        SET p_result_message = 'Transaction already processed';
        SET p_transaction_id = v_existing_tx;
        LEAVE proc_label;
    END IF;
    
    START TRANSACTION;
    
    -- 1. Lock dan validasi QR Code
    SELECT id, status, amount, expires_at, creator_id
    INTO v_qr_id, v_qr_status, v_qr_amount, v_qr_expires_at, v_creator_id
    FROM qr_codes
    WHERE code = p_qr_code
    FOR UPDATE;
    
    IF v_qr_id IS NULL THEN
        ROLLBACK;
        SET p_result_code = 1;
        SET p_result_message = 'QR Code not found';
        SET p_transaction_id = NULL;
        LEAVE proc_label;
    END IF;
    
    IF v_qr_status = 'USED' THEN
        ROLLBACK;
        SET p_result_code = 2;
        SET p_result_message = 'QR Code already used';
        SET p_transaction_id = NULL;
        LEAVE proc_label;
    END IF;
    
    IF v_qr_status = 'EXPIRED' OR v_qr_expires_at < NOW() THEN
        UPDATE qr_codes SET status = 'EXPIRED' WHERE id = v_qr_id;
        ROLLBACK;
        SET p_result_code = 3;
        SET p_result_message = 'QR Code expired';
        SET p_transaction_id = NULL;
        LEAVE proc_label;
    END IF;
    
    IF v_creator_id = p_payer_user_id THEN
        ROLLBACK;
        SET p_result_code = 4;
        SET p_result_message = 'Cannot pay to own QR Code';
        SET p_transaction_id = NULL;
        LEAVE proc_label;
    END IF;
    
    -- 2. Lock dan validasi wallet payer
    SELECT id, balance
    INTO v_payer_wallet_id, v_payer_balance
    FROM wallets
    WHERE user_id = p_payer_user_id
    FOR UPDATE;
    
    IF v_payer_balance < v_qr_amount THEN
        ROLLBACK;
        SET p_result_code = 5;
        SET p_result_message = 'Insufficient balance';
        SET p_transaction_id = NULL;
        LEAVE proc_label;
    END IF;
    
    -- 3. Lock wallet creator
    SELECT id INTO v_creator_wallet_id
    FROM wallets
    WHERE user_id = v_creator_id
    FOR UPDATE;
    
    -- 4. Generate transaction code
    SET v_transaction_code = CONCAT('TRX-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
    
    -- 5. Create transaction record
    INSERT INTO transactions (
        transaction_code, idempotency_key, transaction_type, status,
        from_wallet_id, to_wallet_id, amount, fee_amount, net_amount,
        description, processed_at, created_at
    ) VALUES (
        v_transaction_code, p_idempotency_key, 'QR_PAYMENT', 'COMPLETED',
        v_payer_wallet_id, v_creator_wallet_id, v_qr_amount, 0, v_qr_amount,
        CONCAT('QR Payment - ', p_qr_code), NOW(), NOW()
    );
    
    SET p_transaction_id = LAST_INSERT_ID();
    
    -- 6. Debit payer wallet
    UPDATE wallets
    SET balance = balance - v_qr_amount,
        lifetime_spent = lifetime_spent + v_qr_amount,
        updated_at = NOW()
    WHERE id = v_payer_wallet_id;
    
    -- 7. Credit creator wallet
    UPDATE wallets
    SET balance = balance + v_qr_amount,
        lifetime_earned = lifetime_earned + v_qr_amount,
        updated_at = NOW()
    WHERE id = v_creator_wallet_id;
    
    -- 8. Create ledger entries
    INSERT INTO wallet_ledgers (wallet_id, transaction_id, entry_type, amount, balance_before, balance_after, description, reference_type, reference_id)
    VALUES (v_payer_wallet_id, p_transaction_id, 'DEBIT', v_qr_amount, v_payer_balance, v_payer_balance - v_qr_amount, 'QR Payment', 'QR_PAYMENT', p_qr_code);
    
    INSERT INTO wallet_ledgers (wallet_id, transaction_id, entry_type, amount, balance_before, balance_after, description, reference_type, reference_id)
    SELECT v_creator_wallet_id, p_transaction_id, 'CREDIT', v_qr_amount, balance, balance, 'QR Payment Received', 'QR_PAYMENT', p_qr_code
    FROM wallets WHERE id = v_creator_wallet_id;
    
    -- 9. Mark QR as used
    UPDATE qr_codes
    SET status = 'USED', scanned_by = p_payer_user_id, scanned_at = NOW()
    WHERE id = v_qr_id;
    
    -- 10. Create audit log
    INSERT INTO audit_logs (user_id, target_type, target_id, action, action_category, new_values, description, risk_level)
    VALUES (p_payer_user_id, 'qr_codes', v_qr_id, 'QR_PAYMENT', 'TRANSACTION',
            JSON_OBJECT('amount', v_qr_amount, 'qr_code', p_qr_code),
            CONCAT('QR Payment of ', v_qr_amount, ' points'), 'LOW');
    
    COMMIT;
    
    SET p_result_code = 0;
    SET p_result_message = 'Payment successful';
END //

DELIMITER ;
```

---

## 3.4 VIEW

### 3.4.1 View Laporan Saldo & Transaksi Per User
```sql
CREATE OR REPLACE VIEW v_user_wallet_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.full_name,
    u.nim_nip,
    r.name as role_name,
    w.id as wallet_id,
    w.balance as current_balance,
    w.locked_balance,
    w.lifetime_earned,
    w.lifetime_spent,
    w.is_frozen,
    (SELECT COUNT(*) FROM transactions t 
     WHERE t.from_wallet_id = w.id OR t.to_wallet_id = w.id) as total_transactions,
    (SELECT COUNT(*) FROM transactions t 
     WHERE (t.from_wallet_id = w.id OR t.to_wallet_id = w.id) 
     AND t.status = 'COMPLETED') as completed_transactions,
    (SELECT COALESCE(SUM(amount), 0) FROM wallet_ledgers 
     WHERE wallet_id = w.id AND entry_type = 'CREDIT' 
     AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as credits_last_30_days,
    (SELECT COALESCE(SUM(amount), 0) FROM wallet_ledgers 
     WHERE wallet_id = w.id AND entry_type = 'DEBIT' 
     AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as debits_last_30_days,
    w.created_at as wallet_created_at,
    w.updated_at as last_activity
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
INNER JOIN roles r ON ur.role_id = r.id
INNER JOIN wallets w ON u.id = w.user_id
WHERE u.deleted_at IS NULL;
```

### 3.4.2 View Rekap Transaksi Harian
```sql
CREATE OR REPLACE VIEW v_daily_transaction_summary AS
SELECT 
    DATE(t.created_at) as transaction_date,
    t.transaction_type,
    COUNT(*) as total_count,
    SUM(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
    SUM(CASE WHEN t.status = 'FAILED' THEN 1 ELSE 0 END) as failed_count,
    SUM(CASE WHEN t.status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
    SUM(CASE WHEN t.status = 'COMPLETED' THEN t.amount ELSE 0 END) as total_amount,
    AVG(CASE WHEN t.status = 'COMPLETED' THEN t.amount ELSE NULL END) as avg_amount,
    MIN(CASE WHEN t.status = 'COMPLETED' THEN t.amount ELSE NULL END) as min_amount,
    MAX(CASE WHEN t.status = 'COMPLETED' THEN t.amount ELSE NULL END) as max_amount
FROM transactions t
GROUP BY DATE(t.created_at), t.transaction_type
ORDER BY transaction_date DESC, transaction_type;
```

### 3.4.3 View Dashboard Admin
```sql
CREATE OR REPLACE VIEW v_admin_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
    (SELECT COUNT(*) FROM users u 
     INNER JOIN user_roles ur ON u.id = ur.user_id 
     INNER JOIN roles r ON ur.role_id = r.id 
     WHERE r.name = 'mahasiswa' AND u.deleted_at IS NULL) as total_students,
    (SELECT COUNT(*) FROM users u 
     INNER JOIN user_roles ur ON u.id = ur.user_id 
     INNER JOIN roles r ON ur.role_id = r.id 
     WHERE r.name = 'dosen' AND u.deleted_at IS NULL) as total_lecturers,
    (SELECT COALESCE(SUM(balance), 0) FROM wallets) as total_circulating_points,
    (SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = CURDATE()) as today_transactions,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions 
     WHERE DATE(created_at) = CURDATE() AND status = 'COMPLETED') as today_volume,
    (SELECT COUNT(*) FROM qr_codes WHERE status = 'ACTIVE') as active_qr_codes,
    (SELECT COUNT(*) FROM missions WHERE is_active = TRUE) as active_missions,
    (SELECT COUNT(*) FROM products WHERE is_active = TRUE) as active_products,
    (SELECT COUNT(*) FROM audit_logs 
     WHERE risk_level IN ('HIGH', 'CRITICAL') 
     AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as high_risk_events_24h;
```
