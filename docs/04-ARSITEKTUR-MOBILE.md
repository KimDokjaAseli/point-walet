# BAB 4: ARSITEKTUR MODUL MOBILE (CORDOVA)

## 4.1 Struktur Folder Proyek Cordova

```
/mobile
├── /www
│   ├── /css
│   │   ├── app.css              # Global styles
│   │   ├── variables.css        # CSS custom properties
│   │   ├── components.css       # Reusable components
│   │   └── /pages
│   │       ├── login.css
│   │       ├── dashboard.css
│   │       ├── wallet.css
│   │       ├── qr-scanner.css
│   │       ├── missions.css
│   │       └── marketplace.css
│   │
│   ├── /js
│   │   ├── app.js               # Entry point & initialization
│   │   ├── router.js            # SPA routing
│   │   ├── /core
│   │   │   ├── api.js           # API client
│   │   │   ├── auth.js          # Authentication
│   │   │   ├── storage.js       # Local storage wrapper
│   │   │   ├── offline-queue.js # Offline queue manager
│   │   │   └── sync.js          # Data synchronization
│   │   │
│   │   ├── /services
│   │   │   ├── wallet.service.js
│   │   │   ├── qr.service.js
│   │   │   ├── mission.service.js
│   │   │   └── marketplace.service.js
│   │   │
│   │   ├── /pages
│   │   │   ├── /admin
│   │   │   │   ├── dashboard.js
│   │   │   │   ├── users.js
│   │   │   │   ├── audit.js
│   │   │   │   └── impersonate.js
│   │   │   ├── /dosen
│   │   │   │   ├── dashboard.js
│   │   │   │   ├── qr-generator.js
│   │   │   │   ├── missions.js
│   │   │   │   └── products.js
│   │   │   └── /mahasiswa
│   │   │       ├── dashboard.js
│   │   │       ├── wallet.js
│   │   │       ├── qr-scanner.js
│   │   │       ├── missions.js
│   │   │       └── marketplace.js
│   │   │
│   │   ├── /components
│   │   │   ├── navbar.js
│   │   │   ├── sidebar.js
│   │   │   ├── modal.js
│   │   │   ├── toast.js
│   │   │   └── loading.js
│   │   │
│   │   └── /utils
│   │       ├── helpers.js
│   │       ├── validators.js
│   │       └── formatters.js
│   │
│   ├── /pages
│   │   ├── /admin
│   │   │   ├── login.html
│   │   │   ├── dashboard.html
│   │   │   └── ...
│   │   ├── /dosen
│   │   │   ├── login.html
│   │   │   ├── dashboard.html
│   │   │   └── ...
│   │   └── /mahasiswa
│   │       ├── login.html
│   │       ├── dashboard.html
│   │       └── ...
│   │
│   ├── /assets
│   │   ├── /images
│   │   ├── /icons
│   │   └── /fonts
│   │
│   └── index.html               # Entry HTML
│
├── /plugins
│   ├── cordova-plugin-camera
│   ├── cordova-plugin-barcodescanner
│   ├── cordova-plugin-network-information
│   └── cordova-sqlite-storage
│
├── /platforms
│   └── /android
│
├── config.xml
└── package.json
```

---

## 4.2 Role-Based UI Rendering

### 4.2.1 Authentication & Role Detection

```javascript
// js/core/auth.js
class AuthManager {
    constructor() {
        this.TOKEN_KEY = 'access_token';
        this.REFRESH_KEY = 'refresh_token';
        this.USER_KEY = 'user_data';
    }

    async login(username, password, role) {
        const response = await API.post(`/auth/${role}/login`, {
            username,
            password
        });

        if (response.success) {
            this.setTokens(response.data);
            this.setUserData(response.data.user);
            return response.data;
        }

        throw new Error(response.message);
    }

    setTokens(data) {
        localStorage.setItem(this.TOKEN_KEY, data.access_token);
        localStorage.setItem(this.REFRESH_KEY, data.refresh_token);
    }

    setUserData(user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }

    getUserRole() {
        const user = this.getUser();
        return user?.role || null;
    }

    getUser() {
        const data = localStorage.getItem(this.USER_KEY);
        return data ? JSON.parse(data) : null;
    }

    isAuthenticated() {
        return !!localStorage.getItem(this.TOKEN_KEY);
    }

    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_KEY);
        localStorage.removeItem(this.USER_KEY);
        Router.navigate('/login');
    }
}

const Auth = new AuthManager();
```

### 4.2.2 Router dengan Role Guard

```javascript
// js/router.js
class AppRouter {
    constructor() {
        this.routes = {
            // Public routes
            '/': { page: 'landing', public: true },
            '/login': { page: 'login-select', public: true },
            '/login/admin': { page: 'admin/login', public: true, role: 'admin' },
            '/login/dosen': { page: 'dosen/login', public: true, role: 'dosen' },
            '/login/mahasiswa': { page: 'mahasiswa/login', public: true, role: 'mahasiswa' },
            
            // Admin routes
            '/admin/dashboard': { page: 'admin/dashboard', role: 'admin' },
            '/admin/users': { page: 'admin/users', role: 'admin' },
            '/admin/audit': { page: 'admin/audit', role: 'admin' },
            '/admin/impersonate': { page: 'admin/impersonate', role: 'admin' },
            
            // Dosen routes
            '/dosen/dashboard': { page: 'dosen/dashboard', role: 'dosen' },
            '/dosen/qr/create': { page: 'dosen/qr-generator', role: 'dosen' },
            '/dosen/missions': { page: 'dosen/missions', role: 'dosen' },
            '/dosen/products': { page: 'dosen/products', role: 'dosen' },
            
            // Mahasiswa routes
            '/mahasiswa/dashboard': { page: 'mahasiswa/dashboard', role: 'mahasiswa' },
            '/mahasiswa/wallet': { page: 'mahasiswa/wallet', role: 'mahasiswa' },
            '/mahasiswa/scan': { page: 'mahasiswa/qr-scanner', role: 'mahasiswa' },
            '/mahasiswa/missions': { page: 'mahasiswa/missions', role: 'mahasiswa' },
            '/mahasiswa/marketplace': { page: 'mahasiswa/marketplace', role: 'mahasiswa' }
        };
    }

    async navigate(path) {
        const route = this.routes[path];
        
        if (!route) {
            return this.showNotFound();
        }

        // Check authentication
        if (!route.public && !Auth.isAuthenticated()) {
            return this.navigate('/login');
        }

        // Check role authorization
        if (route.role && Auth.getUserRole() !== route.role) {
            // Redirect to appropriate dashboard
            const userRole = Auth.getUserRole();
            return this.navigate(`/${userRole}/dashboard`);
        }

        await this.loadPage(route.page);
    }

    async loadPage(pageName) {
        const container = document.getElementById('app-container');
        
        try {
            // Load HTML
            const response = await fetch(`pages/${pageName}.html`);
            const html = await response.text();
            container.innerHTML = html;
            
            // Load and execute page script
            const pageModule = await import(`./pages/${pageName}.js`);
            if (pageModule.init) {
                await pageModule.init();
            }
            
            // Update navigation
            this.updateNavigation(pageName);
        } catch (error) {
            console.error('Failed to load page:', error);
            this.showError();
        }
    }

    updateNavigation(currentPage) {
        const role = Auth.getUserRole();
        const navComponent = document.getElementById('main-nav');
        
        if (navComponent) {
            navComponent.innerHTML = this.getNavigationHTML(role, currentPage);
        }
    }

    getNavigationHTML(role, currentPage) {
        const navItems = {
            admin: [
                { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
                { path: '/admin/users', icon: 'people', label: 'Users' },
                { path: '/admin/audit', icon: 'history', label: 'Audit' },
                { path: '/admin/impersonate', icon: 'visibility', label: 'Impersonate' }
            ],
            dosen: [
                { path: '/dosen/dashboard', icon: 'dashboard', label: 'Dashboard' },
                { path: '/dosen/qr/create', icon: 'qr_code', label: 'Buat QR' },
                { path: '/dosen/missions', icon: 'assignment', label: 'Misi' },
                { path: '/dosen/products', icon: 'store', label: 'Produk' }
            ],
            mahasiswa: [
                { path: '/mahasiswa/dashboard', icon: 'dashboard', label: 'Dashboard' },
                { path: '/mahasiswa/wallet', icon: 'account_balance_wallet', label: 'Wallet' },
                { path: '/mahasiswa/scan', icon: 'qr_code_scanner', label: 'Scan QR' },
                { path: '/mahasiswa/missions', icon: 'emoji_events', label: 'Misi' },
                { path: '/mahasiswa/marketplace', icon: 'shopping_cart', label: 'Marketplace' }
            ]
        };

        return navItems[role]?.map(item => `
            <a href="#" onclick="Router.navigate('${item.path}')" 
               class="nav-item ${currentPage.includes(item.path) ? 'active' : ''}">
                <span class="material-icons">${item.icon}</span>
                <span>${item.label}</span>
            </a>
        `).join('') || '';
    }
}

const Router = new AppRouter();
```

---

## 4.3 Integrasi Camera & QR Scanner

### 4.3.1 QR Scanner Service

```javascript
// js/services/qr.service.js
class QRScannerService {
    constructor() {
        this.isScanning = false;
    }

    async scan() {
        return new Promise((resolve, reject) => {
            if (!window.cordova) {
                // Browser fallback untuk development
                const code = prompt('Enter QR Code (dev mode):');
                resolve(code);
                return;
            }

            cordova.plugins.barcodeScanner.scan(
                (result) => {
                    if (result.cancelled) {
                        reject(new Error('Scan cancelled'));
                        return;
                    }
                    resolve(result.text);
                },
                (error) => {
                    reject(new Error('Scan failed: ' + error));
                },
                {
                    preferFrontCamera: false,
                    showFlipCameraButton: true,
                    showTorchButton: true,
                    torchOn: false,
                    prompt: "Arahkan kamera ke QR Code",
                    resultDisplayDuration: 500,
                    formats: "QR_CODE",
                    orientation: "portrait",
                    disableAnimations: true,
                    disableSuccessBeep: false
                }
            );
        });
    }

    async processScannedQR(qrCode) {
        // Check if offline
        if (!navigator.onLine) {
            return this.queueOfflinePayment(qrCode);
        }

        try {
            const response = await API.post('/qr/process', {
                qr_code: qrCode,
                idempotency_key: this.generateIdempotencyKey()
            });

            return response;
        } catch (error) {
            if (error.message.includes('network')) {
                return this.queueOfflinePayment(qrCode);
            }
            throw error;
        }
    }

    async queueOfflinePayment(qrCode) {
        const offlineQueue = new OfflineQueue();
        
        const queueItem = {
            type: 'QR_PAYMENT',
            data: {
                qr_code: qrCode,
                idempotency_key: this.generateIdempotencyKey(),
                scanned_at: new Date().toISOString()
            },
            created_at: new Date().toISOString()
        };

        await offlineQueue.add(queueItem);

        return {
            success: true,
            offline: true,
            message: 'Pembayaran akan diproses saat online'
        };
    }

    generateIdempotencyKey() {
        return 'scan-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
}

const QRScanner = new QRScannerService();
```

### 4.3.2 QR Generator untuk Dosen

```javascript
// js/pages/dosen/qr-generator.js
class QRGeneratorPage {
    async init() {
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('qr-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateQR();
        });
    }

    async generateQR() {
        const amount = document.getElementById('amount').value;
        const description = document.getElementById('description').value;

        try {
            Loading.show();
            
            const response = await API.post('/qr/create', {
                amount: parseInt(amount),
                description,
                type: 'PAYMENT'
            });

            if (response.success) {
                this.displayQR(response.data);
                this.startExpiryCountdown(response.data.expires_at);
            }
        } catch (error) {
            Toast.error(error.message);
        } finally {
            Loading.hide();
        }
    }

    displayQR(data) {
        const container = document.getElementById('qr-display');
        
        // Generate QR code image using qrcode library
        const qrImage = new QRCode(container, {
            text: data.code,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff"
        });

        document.getElementById('qr-amount').textContent = data.amount + ' Poin';
        document.getElementById('qr-code-text').textContent = data.code;
    }

    startExpiryCountdown(expiresAt) {
        const expiryTime = new Date(expiresAt).getTime();
        const countdownEl = document.getElementById('qr-countdown');

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = expiryTime - now;

            if (remaining <= 0) {
                clearInterval(interval);
                countdownEl.textContent = 'EXPIRED';
                countdownEl.classList.add('expired');
                return;
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
}

export const init = () => new QRGeneratorPage().init();
```

---

## 4.4 Offline-First Strategy

### 4.4.1 Offline Queue Manager

```javascript
// js/core/offline-queue.js
class OfflineQueue {
    constructor() {
        this.QUEUE_KEY = 'offline_queue';
        this.db = null;
        this.initDB();
    }

    async initDB() {
        if (!window.cordova) {
            // Use localStorage for browser
            return;
        }

        this.db = window.sqlitePlugin.openDatabase({
            name: 'walletpoint.db',
            location: 'default'
        });

        await this.createTable();
    }

    async createTable() {
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(`
                    CREATE TABLE IF NOT EXISTS offline_queue (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        type TEXT NOT NULL,
                        data TEXT NOT NULL,
                        status TEXT DEFAULT 'PENDING',
                        retry_count INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL,
                        processed_at TEXT
                    )
                `, [], resolve, reject);
            });
        });
    }

    async add(item) {
        if (this.db) {
            return this.addToSQLite(item);
        }
        return this.addToLocalStorage(item);
    }

    addToLocalStorage(item) {
        const queue = this.getQueue();
        queue.push({
            id: Date.now(),
            ...item,
            status: 'PENDING',
            retry_count: 0
        });
        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    }

    async addToSQLite(item) {
        return new Promise((resolve, reject) => {
            this.db.transaction((tx) => {
                tx.executeSql(
                    'INSERT INTO offline_queue (type, data, created_at) VALUES (?, ?, ?)',
                    [item.type, JSON.stringify(item.data), item.created_at],
                    resolve,
                    reject
                );
            });
        });
    }

    getQueue() {
        const data = localStorage.getItem(this.QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    }

    async getPendingItems() {
        if (this.db) {
            return this.getPendingFromSQLite();
        }
        return this.getQueue().filter(item => item.status === 'PENDING');
    }

    async processQueue() {
        if (!navigator.onLine) {
            console.log('Still offline, skipping queue processing');
            return;
        }

        const pendingItems = await this.getPendingItems();
        
        for (const item of pendingItems) {
            try {
                await this.processItem(item);
                await this.markAsProcessed(item.id);
            } catch (error) {
                await this.incrementRetry(item.id);
                console.error('Failed to process queue item:', error);
            }
        }
    }

    async processItem(item) {
        switch (item.type) {
            case 'QR_PAYMENT':
                return API.post('/qr/process', item.data);
            case 'MISSION_COMPLETE':
                return API.post('/missions/complete', item.data);
            default:
                throw new Error('Unknown queue item type: ' + item.type);
        }
    }

    async markAsProcessed(id) {
        if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.transaction((tx) => {
                    tx.executeSql(
                        'UPDATE offline_queue SET status = ?, processed_at = ? WHERE id = ?',
                        ['COMPLETED', new Date().toISOString(), id],
                        resolve,
                        reject
                    );
                });
            });
        }

        const queue = this.getQueue();
        const index = queue.findIndex(item => item.id === id);
        if (index !== -1) {
            queue[index].status = 'COMPLETED';
            queue[index].processed_at = new Date().toISOString();
            localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
        }
    }

    async incrementRetry(id) {
        if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.transaction((tx) => {
                    tx.executeSql(
                        'UPDATE offline_queue SET retry_count = retry_count + 1 WHERE id = ?',
                        [id],
                        resolve,
                        reject
                    );
                });
            });
        }

        const queue = this.getQueue();
        const index = queue.findIndex(item => item.id === id);
        if (index !== -1) {
            queue[index].retry_count++;
            localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
        }
    }
}
```

### 4.4.2 Network Status Handler

```javascript
// js/core/sync.js
class SyncManager {
    constructor() {
        this.offlineQueue = new OfflineQueue();
        this.setupListeners();
    }

    setupListeners() {
        // Browser events
        window.addEventListener('online', () => this.onOnline());
        window.addEventListener('offline', () => this.onOffline());

        // Cordova events
        document.addEventListener('deviceready', () => {
            document.addEventListener('online', () => this.onOnline());
            document.addEventListener('offline', () => this.onOffline());
        });
    }

    onOnline() {
        console.log('Connection restored');
        Toast.success('Koneksi kembali online');
        
        // Process offline queue
        this.processOfflineQueue();
        
        // Sync local data with server
        this.syncData();
    }

    onOffline() {
        console.log('Connection lost');
        Toast.warning('Anda sedang offline. Transaksi akan disimpan dan diproses saat online.');
    }

    async processOfflineQueue() {
        try {
            await this.offlineQueue.processQueue();
            Toast.success('Transaksi offline berhasil diproses');
        } catch (error) {
            console.error('Failed to process offline queue:', error);
        }
    }

    async syncData() {
        try {
            // Sync wallet balance
            const walletResponse = await API.get('/wallet/balance');
            Storage.set('wallet_balance', walletResponse.data.balance);

            // Sync recent transactions
            const txResponse = await API.get('/transactions?limit=20');
            Storage.set('recent_transactions', txResponse.data);

            // Sync missions
            const missionsResponse = await API.get('/missions?active=true');
            Storage.set('active_missions', missionsResponse.data);

        } catch (error) {
            console.error('Sync failed:', error);
        }
    }

    isOnline() {
        if (window.cordova && navigator.connection) {
            return navigator.connection.type !== Connection.NONE;
        }
        return navigator.onLine;
    }
}

const Sync = new SyncManager();
```
