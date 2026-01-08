-- ========================================================
-- MIGRATION: CREATE ALL TABLES
-- Database: MySQL 8.0+
-- Charset: utf8mb4
-- ========================================================

-- Disable foreign key checks for clean migration
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 1. TABLE: roles
-- --------------------------------------------------------
DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (name, display_name, description, is_system) VALUES
('admin', 'Administrator', 'System administrator dengan akses penuh', TRUE),
('dosen', 'Dosen', 'Pengajar yang dapat membuat misi dan menjual produk', TRUE),
('mahasiswa', 'Mahasiswa', 'Peserta didik yang mengikuti misi dan membeli produk', TRUE);

-- --------------------------------------------------------
-- 2. TABLE: users
-- --------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    nim_nip VARCHAR(20) UNIQUE COMMENT 'NIM untuk mahasiswa, NIP untuk dosen',
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_nim_nip (nim_nip),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. TABLE: user_roles
-- --------------------------------------------------------
DROP TABLE IF EXISTS user_roles;
CREATE TABLE user_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    assigned_by BIGINT UNSIGNED NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_role (user_id, role_id),
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. TABLE: sessions
-- --------------------------------------------------------
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    revoked_reason VARCHAR(100) NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. TABLE: wallets
-- --------------------------------------------------------
DROP TABLE IF EXISTS wallets;
CREATE TABLE wallets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    balance BIGINT NOT NULL DEFAULT 0,
    locked_balance BIGINT NOT NULL DEFAULT 0,
    lifetime_earned BIGINT NOT NULL DEFAULT 0,
    lifetime_spent BIGINT NOT NULL DEFAULT 0,
    is_frozen BOOLEAN DEFAULT FALSE,
    frozen_reason VARCHAR(255) NULL,
    frozen_at TIMESTAMP NULL,
    frozen_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (frozen_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_balance (balance),
    INDEX idx_is_frozen (is_frozen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. TABLE: transactions
-- --------------------------------------------------------
DROP TABLE IF EXISTS transactions;
CREATE TABLE transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_code VARCHAR(50) NOT NULL UNIQUE,
    idempotency_key VARCHAR(64) UNIQUE NOT NULL,
    transaction_type ENUM('QR_PAYMENT', 'TOPUP', 'MISSION_REWARD', 'TRANSFER', 'SYNC', 'ADJUSTMENT') NOT NULL,
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    from_wallet_id BIGINT UNSIGNED NULL,
    to_wallet_id BIGINT UNSIGNED NULL,
    amount BIGINT NOT NULL,
    fee_amount BIGINT DEFAULT 0,
    net_amount BIGINT NOT NULL,
    description VARCHAR(255),
    qr_code_id BIGINT UNSIGNED NULL,
    order_id BIGINT UNSIGNED NULL,
    mission_log_id BIGINT UNSIGNED NULL,
    topup_id BIGINT UNSIGNED NULL,
    external_transaction_id BIGINT UNSIGNED NULL,
    processed_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    failure_reason VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (from_wallet_id) REFERENCES wallets(id) ON DELETE SET NULL,
    FOREIGN KEY (to_wallet_id) REFERENCES wallets(id) ON DELETE SET NULL,
    INDEX idx_transaction_code (transaction_code),
    INDEX idx_idempotency_key (idempotency_key),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_status (status),
    INDEX idx_from_wallet (from_wallet_id),
    INDEX idx_to_wallet (to_wallet_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. TABLE: wallet_ledgers
-- --------------------------------------------------------
DROP TABLE IF EXISTS wallet_ledgers;
CREATE TABLE wallet_ledgers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    wallet_id BIGINT UNSIGNED NOT NULL,
    transaction_id BIGINT UNSIGNED NULL,
    entry_type ENUM('CREDIT', 'DEBIT') NOT NULL,
    amount BIGINT NOT NULL,
    balance_before BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    description VARCHAR(255) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(100) NOT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    INDEX idx_wallet_id (wallet_id),
    INDEX idx_entry_type (entry_type),
    INDEX idx_reference_type (reference_type),
    INDEX idx_created_at (created_at),
    INDEX idx_wallet_created (wallet_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. TABLE: products
-- --------------------------------------------------------
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seller_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    product_type ENUM('EBOOK', 'ECOURSE', 'MATERIAL', 'OTHER') NOT NULL,
    price BIGINT NOT NULL,
    original_price BIGINT NULL,
    stock INT NULL,
    sold_count INT DEFAULT 0,
    thumbnail_url VARCHAR(255),
    file_url VARCHAR(255),
    preview_url VARCHAR(255),
    metadata JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_seller_id (seller_id),
    INDEX idx_product_type (product_type),
    INDEX idx_price (price),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. TABLE: qr_codes
-- --------------------------------------------------------
DROP TABLE IF EXISTS qr_codes;
CREATE TABLE qr_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    qr_type ENUM('PAYMENT', 'PRODUCT') NOT NULL,
    creator_id BIGINT UNSIGNED NOT NULL,
    amount BIGINT NOT NULL,
    description VARCHAR(255),
    product_id BIGINT UNSIGNED NULL,
    order_id BIGINT UNSIGNED NULL,
    signature VARCHAR(255) NOT NULL,
    status ENUM('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    is_single_use BOOLEAN DEFAULT TRUE,
    max_uses INT DEFAULT 1,
    current_uses INT DEFAULT 0,
    scanned_by BIGINT UNSIGNED NULL,
    scanned_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_creator_id (creator_id),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. TABLE: missions
-- --------------------------------------------------------
DROP TABLE IF EXISTS missions;
CREATE TABLE missions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    mission_type ENUM('QUIZ', 'ASSIGNMENT', 'ATTENDANCE', 'PROJECT', 'OTHER') NOT NULL,
    creator_id BIGINT UNSIGNED NOT NULL,
    reward_points BIGINT NOT NULL,
    max_participants INT NULL,
    current_participants INT DEFAULT 0,
    difficulty ENUM('EASY', 'MEDIUM', 'HARD') DEFAULT 'MEDIUM',
    requirements JSON NULL,
    content JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_repeatable BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    deadline TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_creator_id (creator_id),
    INDEX idx_mission_type (mission_type),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11. TABLE: mission_logs
-- --------------------------------------------------------
DROP TABLE IF EXISTS mission_logs;
CREATE TABLE mission_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mission_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    status ENUM('STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'STARTED',
    score DECIMAL(5,2) NULL,
    answers JSON NULL,
    reward_claimed BOOLEAN DEFAULT FALSE,
    reward_points BIGINT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    graded_at TIMESTAMP NULL,
    graded_by BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_mission_user (mission_id, user_id),
    INDEX idx_mission_id (mission_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. TABLE: orders
-- --------------------------------------------------------
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    buyer_id BIGINT UNSIGNED NOT NULL,
    seller_id BIGINT UNSIGNED NOT NULL,
    total_amount BIGINT NOT NULL,
    status ENUM('PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    payment_method ENUM('WALLET', 'QR_CODE') NOT NULL DEFAULT 'WALLET',
    qr_code_id BIGINT UNSIGNED NULL,
    transaction_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    paid_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancel_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE SET NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    INDEX idx_order_code (order_code),
    INDEX idx_buyer_id (buyer_id),
    INDEX idx_seller_id (seller_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 13. TABLE: order_items
-- --------------------------------------------------------
DROP TABLE IF EXISTS order_items;
CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price BIGINT NOT NULL,
    subtotal BIGINT NOT NULL,
    download_url VARCHAR(255) NULL,
    download_count INT DEFAULT 0,
    max_downloads INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 14. TABLE: topups
-- --------------------------------------------------------
DROP TABLE IF EXISTS topups;
CREATE TABLE topups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    topup_code VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    wallet_id BIGINT UNSIGNED NOT NULL,
    amount BIGINT NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_gateway VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NULL,
    external_id VARCHAR(100) NULL,
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    payment_url VARCHAR(500) NULL,
    paid_at TIMESTAMP NULL,
    expired_at TIMESTAMP NULL,
    callback_data JSON NULL,
    failure_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
    INDEX idx_topup_code (topup_code),
    INDEX idx_user_id (user_id),
    INDEX idx_external_id (external_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 15. TABLE: external_transactions
-- --------------------------------------------------------
DROP TABLE IF EXISTS external_transactions;
CREATE TABLE external_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sync_batch_id VARCHAR(50) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    wallet_id BIGINT UNSIGNED NOT NULL,
    external_system VARCHAR(50) NOT NULL,
    external_user_id VARCHAR(100) NOT NULL,
    external_transaction_id VARCHAR(100) NOT NULL,
    external_type VARCHAR(50) NOT NULL,
    amount BIGINT NOT NULL,
    description VARCHAR(255),
    external_timestamp TIMESTAMP NOT NULL,
    sync_status ENUM('PENDING', 'SYNCED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    sync_error VARCHAR(255) NULL,
    synced_at TIMESTAMP NULL,
    raw_data JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
    UNIQUE KEY uk_external_tx (external_system, external_transaction_id),
    INDEX idx_sync_batch_id (sync_batch_id),
    INDEX idx_user_id (user_id),
    INDEX idx_sync_status (sync_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 16. TABLE: audit_logs
-- --------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(50) NOT NULL,
    action_category ENUM('AUTH', 'WALLET', 'TRANSACTION', 'USER', 'MISSION', 'PRODUCT', 'SYSTEM') NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    description VARCHAR(500),
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
    is_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at TIMESTAMP NULL,
    review_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_target_type_id (target_type, target_id),
    INDEX idx_action_category (action_category),
    INDEX idx_risk_level (risk_level),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 17. TABLE: idempotency_keys (untuk anti-duplicate)
-- --------------------------------------------------------
DROP TABLE IF EXISTS idempotency_keys;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================
-- VIEWS
-- ========================================================

-- View: User Wallet Summary
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
    w.is_frozen
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
INNER JOIN roles r ON ur.role_id = r.id
INNER JOIN wallets w ON u.id = w.user_id
WHERE u.deleted_at IS NULL;

-- View: Daily Transaction Summary
CREATE OR REPLACE VIEW v_daily_transaction_summary AS
SELECT 
    DATE(t.created_at) as transaction_date,
    t.transaction_type,
    COUNT(*) as total_count,
    SUM(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
    SUM(CASE WHEN t.status = 'COMPLETED' THEN t.amount ELSE 0 END) as total_amount
FROM transactions t
GROUP BY DATE(t.created_at), t.transaction_type
ORDER BY transaction_date DESC, transaction_type;

-- ========================================================
-- TRIGGERS
-- ========================================================

DELIMITER //

-- Trigger: Auto-create wallet when user is created
CREATE TRIGGER trg_create_wallet_after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO wallets (user_id, balance, created_at)
    VALUES (NEW.id, 0, NOW());
END //

-- Trigger: Update transaction status to audit log
CREATE TRIGGER trg_audit_transaction_status_change
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO audit_logs (
            target_type, target_id, action, action_category,
            old_values, new_values, description, risk_level, created_at
        ) VALUES (
            'transactions', NEW.id, 'STATUS_CHANGE', 'TRANSACTION',
            JSON_OBJECT('status', OLD.status),
            JSON_OBJECT('status', NEW.status, 'amount', NEW.amount),
            CONCAT('Transaction ', NEW.transaction_code, ' status changed to ', NEW.status),
            CASE WHEN NEW.amount >= 100000 THEN 'HIGH' ELSE 'LOW' END,
            NOW()
        );
    END IF;
END //

DELIMITER ;

-- ========================================================
-- SAMPLE DATA (untuk development)
-- ========================================================

-- Password hash untuk semua user: Password123
-- Hash: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bVUqe2PQ2aGFnAu

-- Admin user
INSERT INTO users (username, email, password_hash, full_name, nim_nip, is_active) VALUES
('admin', 'admin@kampus.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bVUqe2PQ2aGFnAu', 'System Administrator', 'ADM001', TRUE);

INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1); -- admin role

-- Dosen users
INSERT INTO users (username, email, password_hash, full_name, nim_nip, is_active) VALUES
('dosen1', 'dosen1@kampus.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bVUqe2PQ2aGFnAu', 'Dr. Ahmad Wijaya', '1985010120230301', TRUE),
('dosen2', 'dosen2@kampus.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bVUqe2PQ2aGFnAu', 'Dr. Siti Rahayu', '1987050220230302', TRUE);

INSERT INTO user_roles (user_id, role_id) VALUES
(2, 2), -- dosen role
(3, 2); -- dosen role

-- Mahasiswa users
INSERT INTO users (username, email, password_hash, full_name, nim_nip, is_active) VALUES
('mhs1', 'mhs1@kampus.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bVUqe2PQ2aGFnAu', 'Budi Santoso', '2021001001', TRUE),
('mhs2', 'mhs2@kampus.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bVUqe2PQ2aGFnAu', 'Ani Lestari', '2021001002', TRUE),
('mhs3', 'mhs3@kampus.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bVUqe2PQ2aGFnAu', 'Candra Putra', '2021001003', TRUE);

INSERT INTO user_roles (user_id, role_id) VALUES
(4, 3), -- mahasiswa role
(5, 3), -- mahasiswa role
(6, 3); -- mahasiswa role

-- Give mahasiswa some initial balance for testing
UPDATE wallets SET balance = 5000, lifetime_earned = 5000 WHERE user_id IN (4, 5, 6);
UPDATE wallets SET balance = 10000, lifetime_earned = 10000 WHERE user_id IN (2, 3);

-- Sample missions
INSERT INTO missions (title, description, mission_type, creator_id, reward_points, difficulty, is_active) VALUES
('Quiz Algoritma Dasar', 'Kuis tentang konsep dasar algoritma dan pemrograman', 'QUIZ', 2, 100, 'EASY', TRUE),
('Tugas UML Design', 'Buat diagram UML untuk sistem perpustakaan', 'ASSIGNMENT', 2, 250, 'MEDIUM', TRUE),
('Project Web Development', 'Buat website portfolio menggunakan HTML, CSS, JS', 'PROJECT', 3, 500, 'HARD', TRUE);

-- Sample products
INSERT INTO products (seller_id, name, description, product_type, price, stock, is_active) VALUES
(2, 'E-Book Algoritma Lengkap', 'Panduan lengkap belajar algoritma dari dasar', 'EBOOK', 150, NULL, TRUE),
(2, 'Video Course: Basis Data', 'Kursus video lengkap tentang basis data SQL', 'ECOURSE', 300, NULL, TRUE),
(3, 'Materi Kuliah Pemrograman Web', 'Slide dan praktikum pemrograman web semester 3', 'MATERIAL', 100, 50, TRUE);

