/**
 * WalletPoint - API Module
 * Handles all API calls with automatic token refresh and offline support
 */
const API = {
    isOnline: true,

    // Initialize network listener
    init() {
        document.addEventListener('online', () => {
            this.isOnline = true;
            App.hideOfflineIndicator();
            this.processOfflineQueue();
        }, false);

        document.addEventListener('offline', () => {
            this.isOnline = false;
            App.showOfflineIndicator();
        }, false);

        // Check initial state
        if (navigator.connection) {
            this.isOnline = navigator.connection.type !== 'none';
        }
    },

    // Generate idempotency key
    generateIdempotencyKey() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    // Core request method
    async request(endpoint, options = {}) {
        const url = `${Config.API_BASE_URL}${endpoint}`;
        const token = Storage.getAccessToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.idempotencyKey) {
            headers['X-Idempotency-Key'] = options.idempotencyKey;
        }

        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            // Handle 401 - try to refresh token
            if (response.status === 401 && token) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry original request
                    headers['Authorization'] = `Bearer ${Storage.getAccessToken()}`;
                    const retryResponse = await fetch(url, {
                        method: options.method || 'GET',
                        headers,
                        body: options.body ? JSON.stringify(options.body) : undefined
                    });
                    return retryResponse.json();
                } else {
                    // Refresh failed, logout
                    App.logout();
                    throw new Error('Session expired');
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw { response: data, status: response.status };
            }

            return data;
        } catch (error) {
            if (!this.isOnline && options.queueIfOffline) {
                // Queue for later
                await OfflineDB.queueAction(options.queueAction || 'api_request', {
                    endpoint,
                    options
                });
                throw { message: 'Disimpan untuk dikirim saat online', offline: true };
            }
            throw error;
        }
    },

    // Refresh access token
    async refreshToken() {
        const refreshToken = Storage.getRefreshToken();
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${Config.API_BASE_URL}${Config.ENDPOINTS.REFRESH_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (!response.ok) return false;

            const data = await response.json();
            if (data.success) {
                Storage.saveAuth(
                    data.data.access_token,
                    data.data.refresh_token,
                    data.data.user
                );
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    },

    // Process offline queue when back online
    async processOfflineQueue() {
        const queue = await OfflineDB.getQueuedActions();

        for (const action of queue) {
            try {
                if (action.type === 'qr_payment') {
                    await this.processQRPayment(action.payload.qrCode, action.payload.idempotencyKey);
                } else if (action.type === 'api_request') {
                    await this.request(action.payload.endpoint, action.payload.options);
                }

                await OfflineDB.removeFromQueue(action.id);
                App.showToast('Transaksi offline berhasil disinkronkan', 'success');
            } catch (e) {
                console.error('Failed to process queued action:', e);
            }
        }
    },

    // ========================================
    // Auth API
    // ========================================
    async login(username, password, role) {
        let endpoint;
        switch (role) {
            case Config.ROLES.ADMIN:
                endpoint = Config.ENDPOINTS.LOGIN_ADMIN;
                break;
            case Config.ROLES.DOSEN:
                endpoint = Config.ENDPOINTS.LOGIN_DOSEN;
                break;
            default:
                endpoint = Config.ENDPOINTS.LOGIN_MAHASISWA;
        }

        const result = await this.request(endpoint, {
            method: 'POST',
            body: { username, password }
        });

        if (result.success) {
            Storage.saveAuth(
                result.data.access_token,
                result.data.refresh_token,
                result.data.user
            );
        }

        return result;
    },

    async logout() {
        try {
            await this.request(Config.ENDPOINTS.LOGOUT, { method: 'POST' });
        } catch (e) {
            // Ignore errors
        }
        Storage.clearAuth();
    },

    async getProfile() {
        return this.request(Config.ENDPOINTS.PROFILE);
    },

    async changePassword(currentPassword, newPassword) {
        return this.request(Config.ENDPOINTS.CHANGE_PASSWORD, {
            method: 'PUT',
            body: {
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: newPassword
            }
        });
    },

    // ========================================
    // Wallet API
    // ========================================
    async getBalance() {
        return this.request(Config.ENDPOINTS.WALLET_BALANCE);
    },

    async getTransactionHistory(page = 1, perPage = 20) {
        return this.request(`${Config.ENDPOINTS.WALLET_HISTORY}?page=${page}&per_page=${perPage}`);
    },

    async getLedger(page = 1, perPage = 20) {
        return this.request(`${Config.ENDPOINTS.WALLET_LEDGER}?page=${page}&per_page=${perPage}`);
    },

    async transfer(toUserId, amount, description) {
        const idempotencyKey = this.generateIdempotencyKey();
        return this.request(Config.ENDPOINTS.WALLET_TRANSFER, {
            method: 'POST',
            body: {
                to_user_id: toUserId,
                amount,
                description,
                idempotency_key: idempotencyKey
            },
            idempotencyKey
        });
    },

    // ========================================
    // QR API
    // ========================================
    async createQR(amount, description, type = 'PAYMENT') {
        return this.request(Config.ENDPOINTS.QR_CREATE, {
            method: 'POST',
            body: { amount, description, type }
        });
    },

    async processQRPayment(qrCode, idempotencyKey = null) {
        idempotencyKey = idempotencyKey || this.generateIdempotencyKey();

        return this.request(Config.ENDPOINTS.QR_PROCESS, {
            method: 'POST',
            body: { qr_code: qrCode, idempotency_key: idempotencyKey },
            idempotencyKey,
            queueIfOffline: true,
            queueAction: 'qr_payment'
        });
    },

    async getMyQRs(page = 1, perPage = 20) {
        return this.request(`${Config.ENDPOINTS.QR_MY}?page=${page}&per_page=${perPage}`);
    },

    async getQRDetail(id) {
        return this.request(`${Config.ENDPOINTS.QR_DETAIL}${id}`);
    },

    async cancelQR(id) {
        return this.request(`${Config.ENDPOINTS.QR_CANCEL}${id}`, {
            method: 'DELETE'
        });
    },

    // ========================================
    // Mission API
    // ========================================
    async getMissions(page = 1, perPage = 20) {
        return this.request(`${Config.ENDPOINTS.MISSIONS}?page=${page}&per_page=${perPage}`);
    },

    async getMissionDetail(id) {
        return this.request(`${Config.ENDPOINTS.MISSIONS}/${id}`);
    },

    async getMyMissions(page = 1, perPage = 20) {
        return this.request(`${Config.ENDPOINTS.MISSIONS_MY}?page=${page}&per_page=${perPage}`);
    },

    async getMyParticipations(page = 1, perPage = 20) {
        return this.request(`${Config.ENDPOINTS.MISSIONS_PARTICIPATIONS}?page=${page}&per_page=${perPage}`);
    },

    async createMission(data) {
        return this.request(Config.ENDPOINTS.MISSIONS, {
            method: 'POST',
            body: data
        });
    },

    async startMission(id) {
        return this.request(`${Config.ENDPOINTS.MISSIONS}/${id}/start`, {
            method: 'POST'
        });
    },

    async submitMission(id, answers) {
        return this.request(`${Config.ENDPOINTS.MISSIONS}/${id}/submit`, {
            method: 'POST',
            body: { answers }
        });
    },

    async getMissionParticipants(id) {
        return this.request(`${Config.ENDPOINTS.MISSIONS}/${id}/participants`);
    },

    async gradeMission(missionId, userId, score, notes, approved) {
        return this.request(`${Config.ENDPOINTS.MISSIONS}/${missionId}/grade/${userId}`, {
            method: 'POST',
            body: { score, notes, approved }
        });
    },

    // ========================================
    // Products API
    // ========================================
    async getProducts(page = 1, perPage = 20) {
        return this.request(`${Config.ENDPOINTS.PRODUCTS}?page=${page}&per_page=${perPage}`);
    },

    async getProductDetail(id) {
        return this.request(`${Config.ENDPOINTS.PRODUCTS}/${id}`);
    },

    async createOrder(productId, quantity = 1) {
        return this.request(Config.ENDPOINTS.ORDERS, {
            method: 'POST',
            body: { product_id: productId, quantity }
        });
    },

    async getOrders(page = 1, perPage = 20) {
        return this.request(`${Config.ENDPOINTS.ORDERS}?page=${page}&per_page=${perPage}`);
    }
};
