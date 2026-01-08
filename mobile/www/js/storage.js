/**
 * WalletPoint - Storage Module
 * Handles local storage and SQLite for offline support
 */
const Storage = {
    // Use localStorage for simple data
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage set error:', e);
        }
    },

    get(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Storage remove error:', e);
        }
    },

    clear() {
        try {
            localStorage.clear();
        } catch (e) {
            console.error('Storage clear error:', e);
        }
    },

    // Session management
    saveAuth(accessToken, refreshToken, user) {
        this.set(Config.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        this.set(Config.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        this.set(Config.STORAGE_KEYS.USER, user);
    },

    getAccessToken() {
        return this.get(Config.STORAGE_KEYS.ACCESS_TOKEN);
    },

    getRefreshToken() {
        return this.get(Config.STORAGE_KEYS.REFRESH_TOKEN);
    },

    getUser() {
        return this.get(Config.STORAGE_KEYS.USER);
    },

    clearAuth() {
        this.remove(Config.STORAGE_KEYS.ACCESS_TOKEN);
        this.remove(Config.STORAGE_KEYS.REFRESH_TOKEN);
        this.remove(Config.STORAGE_KEYS.USER);
    },

    isLoggedIn() {
        return !!this.getAccessToken();
    },

    // Offline queue management
    addToOfflineQueue(action) {
        const queue = this.get(Config.STORAGE_KEYS.OFFLINE_QUEUE) || [];
        action.id = Date.now().toString();
        action.timestamp = new Date().toISOString();
        queue.push(action);
        this.set(Config.STORAGE_KEYS.OFFLINE_QUEUE, queue);
    },

    getOfflineQueue() {
        return this.get(Config.STORAGE_KEYS.OFFLINE_QUEUE) || [];
    },

    removeFromOfflineQueue(id) {
        const queue = this.get(Config.STORAGE_KEYS.OFFLINE_QUEUE) || [];
        const filtered = queue.filter(item => item.id !== id);
        this.set(Config.STORAGE_KEYS.OFFLINE_QUEUE, filtered);
    },

    clearOfflineQueue() {
        this.set(Config.STORAGE_KEYS.OFFLINE_QUEUE, []);
    }
};

// SQLite wrapper for more complex offline data
const OfflineDB = {
    db: null,

    init() {
        return new Promise((resolve, reject) => {
            if (!window.sqlitePlugin) {
                console.log('SQLite plugin not available, using localStorage');
                resolve();
                return;
            }

            this.db = window.sqlitePlugin.openDatabase({
                name: 'walletpoint.db',
                location: 'default'
            });

            this.db.transaction(tx => {
                // Create offline queue table
                tx.executeSql(`
                    CREATE TABLE IF NOT EXISTS offline_queue (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        action_type TEXT NOT NULL,
                        payload TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        retry_count INTEGER DEFAULT 0
                    )
                `);

                // Create cached data table
                tx.executeSql(`
                    CREATE TABLE IF NOT EXISTS cached_data (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        expires_at TEXT
                    )
                `);
            }, reject, resolve);
        });
    },

    // Add action to offline queue
    queueAction(actionType, payload) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                Storage.addToOfflineQueue({ type: actionType, payload });
                resolve();
                return;
            }

            this.db.transaction(tx => {
                tx.executeSql(
                    'INSERT INTO offline_queue (action_type, payload, created_at) VALUES (?, ?, ?)',
                    [actionType, JSON.stringify(payload), new Date().toISOString()]
                );
            }, reject, resolve);
        });
    },

    // Get all queued actions
    getQueuedActions() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(Storage.getOfflineQueue());
                return;
            }

            this.db.transaction(tx => {
                tx.executeSql(
                    'SELECT * FROM offline_queue ORDER BY created_at ASC',
                    [],
                    (tx, result) => {
                        const actions = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            const row = result.rows.item(i);
                            actions.push({
                                id: row.id,
                                type: row.action_type,
                                payload: JSON.parse(row.payload),
                                createdAt: row.created_at,
                                retryCount: row.retry_count
                            });
                        }
                        resolve(actions);
                    }
                );
            }, reject);
        });
    },

    // Remove action from queue
    removeFromQueue(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                Storage.removeFromOfflineQueue(id);
                resolve();
                return;
            }

            this.db.transaction(tx => {
                tx.executeSql('DELETE FROM offline_queue WHERE id = ?', [id]);
            }, reject, resolve);
        });
    },

    // Cache data
    cacheData(key, value, expiresIn = null) {
        return new Promise((resolve, reject) => {
            const expiresAt = expiresIn
                ? new Date(Date.now() + expiresIn).toISOString()
                : null;

            if (!this.db) {
                Storage.set(`cache_${key}`, { value, expiresAt });
                resolve();
                return;
            }

            this.db.transaction(tx => {
                tx.executeSql(
                    'INSERT OR REPLACE INTO cached_data (key, value, expires_at) VALUES (?, ?, ?)',
                    [key, JSON.stringify(value), expiresAt]
                );
            }, reject, resolve);
        });
    },

    // Get cached data
    getCachedData(key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                const cached = Storage.get(`cache_${key}`);
                if (cached && cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
                    resolve(null);
                } else {
                    resolve(cached ? cached.value : null);
                }
                return;
            }

            this.db.transaction(tx => {
                tx.executeSql(
                    'SELECT * FROM cached_data WHERE key = ?',
                    [key],
                    (tx, result) => {
                        if (result.rows.length === 0) {
                            resolve(null);
                            return;
                        }

                        const row = result.rows.item(0);
                        if (row.expires_at && new Date(row.expires_at) < new Date()) {
                            // Expired, delete and return null
                            tx.executeSql('DELETE FROM cached_data WHERE key = ?', [key]);
                            resolve(null);
                        } else {
                            resolve(JSON.parse(row.value));
                        }
                    }
                );
            }, reject);
        });
    }
};
