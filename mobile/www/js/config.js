/**
 * WalletPoint - Configuration
 */
const Config = {
    // API Configuration
    API_BASE_URL: 'http://localhost:8080/api/v1',
    
    // App Version
    VERSION: '1.0.0',
    
    // Storage Keys
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'access_token',
        REFRESH_TOKEN: 'refresh_token',
        USER: 'user',
        OFFLINE_QUEUE: 'offline_queue',
        LAST_SYNC: 'last_sync'
    },
    
    // QR Code Configuration
    QR: {
        EXPIRY_MINUTES: 10,
        REFRESH_INTERVAL: 1000 // ms
    },
    
    // API Endpoints
    ENDPOINTS: {
        // Auth
        LOGIN_ADMIN: '/auth/admin/login',
        LOGIN_DOSEN: '/auth/dosen/login',
        LOGIN_MAHASISWA: '/auth/mahasiswa/login',
        REFRESH_TOKEN: '/auth/refresh',
        LOGOUT: '/auth/logout',
        PROFILE: '/auth/me',
        CHANGE_PASSWORD: '/auth/password',
        
        // Wallet
        WALLET_BALANCE: '/wallet/balance',
        WALLET_HISTORY: '/wallet/history',
        WALLET_LEDGER: '/wallet/ledger',
        WALLET_TRANSFER: '/wallet/transfer',
        
        // QR
        QR_CREATE: '/qr/create',
        QR_PROCESS: '/qr/process',
        QR_MY: '/qr/my',
        QR_DETAIL: '/qr/', // + id
        QR_CANCEL: '/qr/', // + id
        
        // Missions
        MISSIONS: '/missions',
        MISSIONS_MY: '/missions/my/created',
        MISSIONS_PARTICIPATIONS: '/missions/my/participations',
        MISSIONS_START: '/missions/', // + id + /start
        MISSIONS_SUBMIT: '/missions/', // + id + /submit
        MISSIONS_PARTICIPANTS: '/missions/', // + id + /participants
        MISSIONS_GRADE: '/missions/', // + id + /grade/ + userId
        
        // Products
        PRODUCTS: '/products',
        ORDERS: '/orders'
    },
    
    // Role configurations
    ROLES: {
        ADMIN: 'admin',
        DOSEN: 'dosen',
        MAHASISWA: 'mahasiswa'
    },
    
    // Transaction types
    TRANSACTION_TYPES: {
        QR_PAYMENT: { icon: '📱', label: 'QR Payment' },
        TOPUP: { icon: '💳', label: 'Top Up' },
        MISSION_REWARD: { icon: '🎯', label: 'Misi Selesai' },
        TRANSFER: { icon: '💸', label: 'Transfer' },
        SYNC: { icon: '🔄', label: 'Sinkronisasi' },
        ADJUSTMENT: { icon: '⚙️', label: 'Penyesuaian' }
    },
    
    // Mission types
    MISSION_TYPES: {
        QUIZ: { icon: '📝', label: 'Kuis' },
        ASSIGNMENT: { icon: '📄', label: 'Tugas' },
        ATTENDANCE: { icon: '✅', label: 'Kehadiran' },
        PROJECT: { icon: '🔧', label: 'Proyek' },
        OTHER: { icon: '📌', label: 'Lainnya' }
    }
};
