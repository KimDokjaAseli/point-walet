/**
 * WalletPoint Utility Functions
 */
const Utils = {
    /**
     * Format number as currency
     */
    formatCurrency(amount, symbol = 'Rp') {
        const num = parseFloat(amount) || 0;
        return `${symbol} ${num.toLocaleString('id-ID')}`;
    },

    /**
     * Format date
     */
    formatDate(dateStr, format = 'short') {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const options = format === 'short'
            ? { day: 'numeric', month: 'short', year: 'numeric' }
            : { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('id-ID', options);
    },

    /**
     * Format date and time
     */
    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Format relative time
     */
    formatRelativeTime(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Baru saja';
        if (minutes < 60) return `${minutes} menit lalu`;
        if (hours < 24) return `${hours} jam lalu`;
        if (days < 7) return `${days} hari lalu`;

        return this.formatDate(dateStr);
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Local storage helpers
     */
    storage: {
        get(key) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch {
                return localStorage.getItem(key);
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },

        remove(key) {
            localStorage.removeItem(key);
        },

        clear() {
            Object.values(Config.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        }
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Show toast notification
     */
    toast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${this.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        let loader = document.getElementById('loading-overlay');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loading-overlay';
            loader.className = 'loading-overlay';
            loader.innerHTML = `
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p id="loading-message">${this.escapeHtml(message)}</p>
                </div>
            `;
            document.body.appendChild(loader);
        } else {
            document.getElementById('loading-message').textContent = message;
            loader.style.display = 'flex';
        }
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.style.display = 'none';
        }
    },

    /**
     * Confirm dialog
     */
    confirm(message, title = 'Konfirmasi') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">${this.escapeHtml(title)}</h3>
                    </div>
                    <p style="margin-bottom: 24px;">${this.escapeHtml(message)}</p>
                    <div class="flex gap-md">
                        <button class="btn btn-secondary flex-1" id="confirm-cancel">Batal</button>
                        <button class="btn btn-primary flex-1" id="confirm-ok">Ya</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            overlay.querySelector('#confirm-cancel').onclick = () => {
                overlay.remove();
                resolve(false);
            };

            overlay.querySelector('#confirm-ok').onclick = () => {
                overlay.remove();
                resolve(true);
            };
        });
    },

    /**
     * Check if online
     */
    isOnline() {
        return navigator.onLine;
    },

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Truncate text
     */
    truncate(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    },

    /**
     * Deref pointer (get value or default)
     */
    deref(value, defaultValue = '') {
        return value !== null && value !== undefined ? value : defaultValue;
    }
};
