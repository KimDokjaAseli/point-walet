/**
 * WalletPoint - Main Application
 */
const App = {
    // Initialize the application
    async init() {
        console.log('WalletPoint initializing...');

        // Wait for Cordova to be ready
        document.addEventListener('deviceready', () => {
            this.onDeviceReady();
        }, false);

        // For browser testing
        if (typeof cordova === 'undefined') {
            setTimeout(() => this.onDeviceReady(), 500);
        }
    },

    async onDeviceReady() {
        console.log('Device ready');

        // Initialize modules
        API.init();
        Router.init();

        // Initialize offline database
        try {
            await OfflineDB.init();
        } catch (e) {
            console.log('SQLite not available, using localStorage');
        }

        // Check if logged in
        if (Storage.isLoggedIn()) {
            // Verify token is still valid
            try {
                const result = await API.getProfile();
                if (result.success) {
                    // Update stored user data
                    Storage.set(Config.STORAGE_KEYS.USER, result.data);
                    Router.navigate('dashboard');
                } else {
                    Storage.clearAuth();
                    Router.navigate('login');
                }
            } catch (e) {
                // If offline and has token, allow access
                if (!API.isOnline) {
                    Router.navigate('dashboard');
                } else {
                    Storage.clearAuth();
                    Router.navigate('login');
                }
            }
        } else {
            Router.navigate('login');
        }

        // Setup status bar if available
        if (window.StatusBar) {
            StatusBar.styleLightContent();
            StatusBar.backgroundColorByHexString('#6366f1');
        }
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');

        toast.className = 'toast ' + type;
        toastMessage.textContent = message;
        toast.classList.remove('hidden');

        // Auto hide after 3 seconds
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },

    // Show offline indicator
    showOfflineIndicator() {
        let indicator = document.querySelector('.offline-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'offline-indicator';
            indicator.textContent = '⚠️ Anda sedang offline';
            document.body.prepend(indicator);
        }
    },

    // Hide offline indicator
    hideOfflineIndicator() {
        const indicator = document.querySelector('.offline-indicator');
        if (indicator) {
            indicator.remove();
        }
    },

    // Close modal
    closeModal() {
        const modal = document.getElementById('modal-container');
        modal.classList.add('hidden');
    },

    // Logout
    logout() {
        Storage.clearAuth();
        Router.navigate('login');
    }
};

// Start the app
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
