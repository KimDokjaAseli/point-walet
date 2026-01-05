/**
 * WalletPoint API Client
 */
const Api = {
    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${Config.API_URL}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token
        const token = Utils.storage.get(Config.STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Add idempotency key for POST/PUT
        if (['POST', 'PUT'].includes(options.method) && !headers['X-Idempotency-Key']) {
            headers['X-Idempotency-Key'] = Utils.generateId();
        }

        // Debug log for scan requests
        if (endpoint.includes('/qr/scan')) {
            const user = Utils.storage.get(Config.STORAGE_KEYS.USER);
            console.log('[QR Scan Debug]', {
                scannerUserId: user?.id,
                scannerEmail: user?.email,
                qrCode: options.body?.qr_code,
                tokenPrefix: token?.substring(0, 20)
            });
        }

        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            const data = await response.json();

            // Handle 401 - try refresh token
            if (response.status === 401 && token) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry original request
                    return this.request(endpoint, options);
                } else {
                    // Redirect to login
                    Auth.logout();
                    return;
                }
            }

            if (!response.ok) {
                throw {
                    status: response.status,
                    code: data.error?.code || 'ERROR',
                    message: data.error?.message || 'Something went wrong',
                    details: data.error?.details
                };
            }

            return data;
        } catch (error) {
            // Handle network error
            if (error.message === 'Failed to fetch') {
                throw {
                    status: 0,
                    code: 'NETWORK_ERROR',
                    message: 'Tidak dapat terhubung ke server'
                };
            }
            throw error;
        }
    },

    /**
     * Refresh access token
     */
    async refreshToken() {
        const refreshToken = Utils.storage.get(Config.STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${Config.API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (!response.ok) return false;

            const data = await response.json();
            Utils.storage.set(Config.STORAGE_KEYS.ACCESS_TOKEN, data.data.access_token);
            return true;
        } catch {
            return false;
        }
    },

    // === Auth ===

    login(email, password, role) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { email, password, role }
        });
    },

    register(data) {
        return this.request('/auth/register', {
            method: 'POST',
            body: data
        });
    },

    logout() {
        const refreshToken = Utils.storage.get(Config.STORAGE_KEYS.REFRESH_TOKEN);
        return this.request('/auth/logout', {
            method: 'POST',
            body: { refresh_token: refreshToken }
        }).finally(() => {
            Utils.storage.clear();
        });
    },

    getMe() {
        return this.request('/auth/me');
    },

    // === Wallet ===

    getWallet() {
        return this.request('/wallet');
    },

    getTransactions(page = 1, limit = 10, type = '') {
        let url = `/wallet/transactions?page=${page}&limit=${limit}`;
        if (type) url += `&type=${type}`;
        return this.request(url);
    },

    getLedger(page = 1, limit = 10) {
        return this.request(`/wallet/ledger?page=${page}&limit=${limit}`);
    },

    transfer(receiverId, amount, description) {
        return this.request('/wallet/transfer', {
            method: 'POST',
            body: { receiver_id: receiverId, amount, description }
        });
    },

    // === QR ===

    generateQR(amount, description) {
        return this.request('/qr/generate', {
            method: 'POST',
            body: { amount, description }
        });
    },

    scanQR(qrCode) {
        return this.request('/qr/scan', {
            method: 'POST',
            body: { qr_code: qrCode }
        });
    },

    getQRById(id) {
        return this.request(`/qr/${id}`);
    },

    getMyQRCodes(page = 1, limit = 10) {
        return this.request(`/qr/my?page=${page}&limit=${limit}`);
    },

    // === Products ===

    getProducts(page = 1, limit = 10, category = '', search = '') {
        let url = `/products?page=${page}&limit=${limit}`;
        if (category) url += `&category=${category}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return this.request(url);
    },

    getProductById(id) {
        return this.request(`/products/${id}`);
    },

    createProduct(data) {
        return this.request('/products', {
            method: 'POST',
            body: data
        });
    },

    // === Orders ===

    createOrder(items, paymentMethod = 'balance', notes = '') {
        return this.request('/orders', {
            method: 'POST',
            body: { items, notes, payment_method: paymentMethod }
        });
    },

    getMyOrders() {
        return this.request('/orders');
    },

    getOrderById(id) {
        return this.request(`/orders/${id}`);
    },

    // === Missions ===

    getMissions(page = 1, limit = 10, type = '') {
        let url = `/missions?page=${page}&limit=${limit}`;
        if (type) url += `&type=${type}`;
        return this.request(url);
    },

    getMissionById(id) {
        return this.request(`/missions/${id}`);
    },

    joinMission(id) {
        return this.request(`/missions/${id}/join`, { method: 'POST' });
    },

    completeMission(id) {
        return this.request(`/missions/${id}/complete`, { method: 'POST' });
    },

    claimMissionReward(id) {
        return this.request(`/missions/${id}/claim`, { method: 'POST' });
    },

    getMyMissionProgress(id) {
        return this.request(`/missions/${id}/my-progress`);
    },

    createMission(data) {
        return this.request('/missions', {
            method: 'POST',
            body: data
        });
    },

    updateMission(id, data) {
        return this.request(`/missions/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    deleteMission(id) {
        return this.request(`/missions/${id}`, {
            method: 'DELETE'
        });
    },

    // === Admin ===

    updateProduct(id, data) {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    deleteProduct(id) {
        return this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    },

    adminTopup(userId, amount, description) {
        return this.request('/admin/topup', {
            method: 'POST',
            body: { user_id: userId, amount, description }
        });
    },

    getAdminStats() {
        return this.request('/admin/stats');
    },

    getAdminTransactions(page = 1, limit = 50) {
        return this.request(`/admin/transactions?page=${page}&limit=${limit}`);
    },

    getAuditLogs(page = 1, limit = 50) {
        return this.request(`/admin/audit?page=${page}&limit=${limit}`);
    },

    // === Seller Orders ===

    getSellerOrders() {
        return this.request('/orders/seller');
    },

    getMyOrders() {
        return this.request('/orders');
    }
};
