/**
 * WalletPoint Auth Manager
 */
const Auth = {
    /**
     * Get current user
     */
    getUser() {
        return Utils.storage.get(Config.STORAGE_KEYS.USER);
    },

    /**
     * Check if logged in
     */
    isLoggedIn() {
        return !!Utils.storage.get(Config.STORAGE_KEYS.ACCESS_TOKEN);
    },

    /**
     * Get user role
     */
    getRole() {
        const user = this.getUser();
        return user?.role || null;
    },

    /**
     * Check if user has role
     */
    hasRole(role) {
        return this.getRole() === role;
    },

    /**
     * Check if admin
     */
    isAdmin() {
        return this.hasRole(Config.ROLES.ADMIN);
    },

    /**
     * Check if dosen
     */
    isDosen() {
        return this.hasRole(Config.ROLES.DOSEN);
    },

    /**
     * Check if mahasiswa
     */
    isMahasiswa() {
        return this.hasRole(Config.ROLES.MAHASISWA);
    },

    /**
     * Login
     */
    async login(email, password, role) {
        // Clear any existing session first to prevent stale data
        Utils.storage.clear();

        const response = await Api.login(email, password, role);

        if (response.success) {
            Utils.storage.set(Config.STORAGE_KEYS.ACCESS_TOKEN, response.data.tokens.access_token);
            Utils.storage.set(Config.STORAGE_KEYS.REFRESH_TOKEN, response.data.tokens.refresh_token);
            Utils.storage.set(Config.STORAGE_KEYS.USER, response.data.user);
        }

        return response;
    },

    /**
     * Register
     */
    async register(data) {
        return Api.register(data);
    },

    /**
     * Logout
     */
    async logout() {
        try {
            await Api.logout();
        } catch (error) {
            console.log('Logout error:', error);
        } finally {
            Utils.storage.clear();
            Router.navigate('/login');
        }
    },

    /**
     * Get access token
     */
    getToken() {
        return Utils.storage.get(Config.STORAGE_KEYS.ACCESS_TOKEN);
    },

    /**
     * Update stored user data
     */
    updateUser(userData) {
        const current = this.getUser() || {};
        Utils.storage.set(Config.STORAGE_KEYS.USER, { ...current, ...userData });
    }
};
