/**
 * Push Notification Service
 * Handles real-time notifications for quiz updates, transfers, etc.
 */
const PushNotification = {
    isSupported: false,
    permission: 'default',
    swRegistration: null,

    /**
     * Initialize push notification service
     */
    async init() {
        // Check browser support
        if ('Notification' in window && 'serviceWorker' in navigator) {
            this.isSupported = true;
            this.permission = Notification.permission;

            // Register service worker
            try {
                this.swRegistration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }

        // Start polling for notifications (fallback)
        this.startPolling();
    },

    /**
     * Request notification permission from user
     */
    async requestPermission() {
        if (!this.isSupported) {
            Utils.toast('Browser tidak mendukung notifikasi', 'error');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;

            if (permission === 'granted') {
                Utils.toast('Notifikasi diaktifkan!', 'success');
                this.savePreference(true);
                return true;
            } else {
                Utils.toast('Notifikasi ditolak', 'info');
                return false;
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
            return false;
        }
    },

    /**
     * Save notification preference
     */
    savePreference(enabled) {
        Utils.storage.set('wp_push_enabled', enabled);
    },

    /**
     * Check if notifications are enabled
     */
    isEnabled() {
        return this.permission === 'granted' && Utils.storage.get('wp_push_enabled') !== false;
    },

    /**
     * Show a local notification
     */
    async show(title, options = {}) {
        if (!this.isEnabled()) return;

        const defaultOptions = {
            icon: '/img/icon-192.png',
            badge: '/img/badge-72.png',
            vibrate: [200, 100, 200],
            tag: options.tag || 'wp-notification',
            renotify: true,
            requireInteraction: false,
            ...options
        };

        try {
            if (this.swRegistration) {
                await this.swRegistration.showNotification(title, defaultOptions);
            } else {
                new Notification(title, defaultOptions);
            }
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    },

    /**
     * Notify about new transfer received
     */
    notifyTransferReceived(senderName, amount) {
        this.show('Transfer Diterima! 💰', {
            body: `${senderName} mengirim ${Utils.formatCurrency(amount)} poin`,
            tag: 'transfer-received',
            data: { type: 'transfer', action: 'received' }
        });

        // Also add to in-app notifications
        this.addInAppNotification({
            type: 'transfer',
            title: 'Transfer Diterima',
            message: `${senderName} mengirim ${Utils.formatCurrency(amount)} poin`,
            icon: 'fa-arrow-down',
            iconColor: '#10b981'
        });
    },

    /**
     * Notify about new quiz from dosen
     */
    notifyNewQuiz(quizTitle, dosenName, reward) {
        this.show('Quiz Baru Tersedia! 📝', {
            body: `${dosenName}: ${quizTitle} - Hadiah ${Utils.formatCurrency(reward)} poin`,
            tag: 'new-quiz',
            data: { type: 'quiz', action: 'new' }
        });

        this.addInAppNotification({
            type: 'mission',
            title: 'Quiz Baru dari Dosen',
            message: `${dosenName} membuat quiz "${quizTitle}"`,
            icon: 'fa-chalkboard-teacher',
            iconColor: '#8b5cf6'
        });
    },

    /**
     * Notify about order status change
     */
    notifyOrderReady(orderInfo) {
        this.show('Pesanan Siap Diambil! 📦', {
            body: `Pesanan Anda sudah siap diambil`,
            tag: 'order-ready',
            data: { type: 'order', action: 'ready' }
        });

        this.addInAppNotification({
            type: 'order',
            title: 'Pesanan Siap',
            message: 'Pesanan Anda sudah siap diambil di tempat penjual',
            icon: 'fa-check-circle',
            iconColor: '#10b981'
        });
    },

    /**
     * Notify seller about new order
     */
    notifyNewOrder(buyerName, totalAmount) {
        this.show('Pesanan Baru Masuk! 🛒', {
            body: `${buyerName} membeli produk senilai ${Utils.formatCurrency(totalAmount)}`,
            tag: 'new-order',
            data: { type: 'order', action: 'new' }
        });

        this.addInAppNotification({
            type: 'order',
            title: 'Pesanan Baru',
            message: `${buyerName} membeli produk Anda`,
            icon: 'fa-shopping-bag',
            iconColor: '#ef4444',
            action: 'pickup'
        });
    },

    /**
     * Add notification to in-app notification list
     */
    addInAppNotification(notification) {
        const notifications = Utils.storage.get('wp_in_app_notifications') || [];

        const newNotif = {
            id: 'notif-' + Date.now(),
            ...notification,
            is_read: false,
            created_at: new Date().toISOString()
        };

        notifications.unshift(newNotif);

        // Keep only last 50 notifications
        if (notifications.length > 50) {
            notifications.splice(50);
        }

        Utils.storage.set('wp_in_app_notifications', notifications);

        // Update badge count
        const unreadCount = notifications.filter(n => !n.is_read).length;
        Utils.storage.set('wp_notification_unread_count', unreadCount);

        // Update badge if visible
        const badge = document.getElementById('notification-badge');
        if (badge) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    },

    /**
     * Get in-app notifications
     */
    getInAppNotifications() {
        return Utils.storage.get('wp_in_app_notifications') || [];
    },

    /**
     * Clear all in-app notifications
     */
    clearAll() {
        Utils.storage.set('wp_in_app_notifications', []);
        Utils.storage.set('wp_notification_unread_count', 0);
    },

    /**
     * Start polling for new notifications (fallback for push)
     */
    startPolling() {
        // Check every 30 seconds for new notifications
        setInterval(async () => {
            if (!Auth.isLoggedIn()) return;

            try {
                const response = await Api.request('/notifications/check');
                if (response.success && response.data.hasNew) {
                    // Process new notifications
                    response.data.notifications?.forEach(notif => {
                        this.processServerNotification(notif);
                    });
                }
            } catch (error) {
                // Silently fail
            }
        }, 30000);
    },

    /**
     * Process notification from server
     */
    processServerNotification(notif) {
        switch (notif.type) {
            case 'transfer':
                this.notifyTransferReceived(notif.sender_name, notif.amount);
                break;
            case 'quiz':
                this.notifyNewQuiz(notif.title, notif.dosen_name, notif.reward);
                break;
            case 'order_ready':
                this.notifyOrderReady(notif);
                break;
            case 'new_order':
                this.notifyNewOrder(notif.buyer_name, notif.total_amount);
                break;
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    PushNotification.init();
});
