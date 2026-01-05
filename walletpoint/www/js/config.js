/**
 * WalletPoint Configuration
 */
const Config = {
    // API Configuration
    API_URL: 'http://localhost:3000/api/v1',

    // Storage keys
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'wp_access_token',
        REFRESH_TOKEN: 'wp_refresh_token',
        USER: 'wp_user',
        OFFLINE_QUEUE: 'wp_offline_queue'
    },

    // QR Code settings
    QR: {
        EXPIRY_MINUTES: 10
    },

    // Default pagination
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 10
    },

    // Role definitions
    ROLES: {
        ADMIN: 'admin',
        DOSEN: 'dosen',
        MAHASISWA: 'mahasiswa'
    },

    // Transaction types
    TRANSACTION_TYPES: {
        QR_PAYMENT: 'QR_PAYMENT',
        MISSION_REWARD: 'MISSION_REWARD',
        TOP_UP: 'TOP_UP',
        PURCHASE: 'PURCHASE',
        TRANSFER: 'TRANSFER',
        SYNC: 'SYNC'
    }
};

// Freeze config to prevent modifications
Object.freeze(Config);
Object.freeze(Config.STORAGE_KEYS);
Object.freeze(Config.QR);
Object.freeze(Config.PAGINATION);
Object.freeze(Config.ROLES);
Object.freeze(Config.TRANSACTION_TYPES);
