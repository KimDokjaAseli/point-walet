/**
 * Notifications Page
 */
Pages.Notifications = {
    notifications: [],
    unreadCount: 0,

    async render() {
        const app = document.getElementById('app');
        const user = Auth.getUser();

        app.innerHTML = `
            <div class="page">
                ${Components.pageHeader('Notifikasi', true)}
                
                <div class="flex items-center justify-between mb-md">
                    <span class="text-muted">Semua notifikasi</span>
                    <button class="btn btn-sm btn-ghost" onclick="Pages.Notifications.markAllAsRead()">
                        <i class="fas fa-check-double"></i> Tandai Dibaca
                    </button>
                </div>
                
                <div id="notifications-container">
                    <div class="flex justify-center">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        `;

        await this.loadNotifications();
    },

    async loadNotifications() {
        const container = document.getElementById('notifications-container');

        try {
            // Try to get notifications from API
            const response = await Api.request('/notifications');

            if (response.success && response.data?.notifications) {
                this.notifications = response.data.notifications;
            } else {
                // Use mock data if API not available
                this.notifications = this.getMockNotifications();
            }

            this.renderNotifications();
        } catch (error) {
            // Use mock data on error
            console.log('Using mock notifications:', error.message);
            this.notifications = this.getMockNotifications();
            this.renderNotifications();
        }
    },

    getMockNotifications() {
        const user = Auth.getUser();
        const now = Date.now();
        const role = user?.role || 'mahasiswa';

        const notifications = [];

        // Role-specific notifications
        if (role === 'admin') {
            notifications.push({
                id: 'admin-1',
                type: 'system',
                title: 'Laporan Harian',
                message: 'Ada 15 transaksi baru hari ini dengan total Rp 1.250.000',
                icon: 'fa-chart-bar',
                iconColor: '#3b82f6',
                is_read: false,
                created_at: new Date(now - 1000 * 60 * 10).toISOString()
            });
            notifications.push({
                id: 'admin-2',
                type: 'system',
                title: 'User Baru Terdaftar',
                message: '3 mahasiswa baru telah terdaftar hari ini',
                icon: 'fa-user-plus',
                iconColor: '#10b981',
                is_read: false,
                created_at: new Date(now - 1000 * 60 * 30).toISOString()
            });
        }

        if (role === 'dosen') {
            notifications.push({
                id: 'dosen-1',
                type: 'order',
                title: 'Pesanan Baru!',
                message: 'Mahasiswa telah membeli produk Anda. Siapkan untuk pengambilan.',
                icon: 'fa-shopping-bag',
                iconColor: '#ef4444',
                is_read: false,
                action: 'pickup',
                created_at: new Date(now - 1000 * 60 * 2).toISOString()
            });
            notifications.push({
                id: 'dosen-2',
                type: 'product',
                title: 'Produk Laris',
                message: 'E-Book "Panduan Praktikum" sudah terjual 10 kali!',
                icon: 'fa-fire',
                iconColor: '#f59e0b',
                is_read: true,
                created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString()
            });
        }

        if (role === 'mahasiswa') {
            notifications.push({
                id: 'mhs-1',
                type: 'transaction',
                title: 'Pembayaran Berhasil',
                message: 'Pembelian E-Book "Panduan Praktikum" telah berhasil.',
                icon: 'fa-check-circle',
                iconColor: '#10b981',
                is_read: false,
                created_at: new Date(now - 1000 * 60 * 5).toISOString()
            });
            notifications.push({
                id: 'mhs-2',
                type: 'mission',
                title: 'Misi Tersedia!',
                message: 'Selesaikan 3 transaksi minggu ini dan dapatkan bonus 500 poin!',
                icon: 'fa-trophy',
                iconColor: '#f59e0b',
                is_read: false,
                created_at: new Date(now - 1000 * 60 * 30).toISOString()
            });
        }

        // Common notifications for all roles
        notifications.push({
            id: 'common-1',
            type: 'product',
            title: 'Produk Baru',
            message: 'Dr. Ahmad Fauzi menambahkan produk baru: "Modul IoT"',
            icon: 'fa-box',
            iconColor: '#3b82f6',
            is_read: true,
            created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString()
        });

        notifications.push({
            id: 'common-2',
            type: 'system',
            title: 'Selamat Datang!',
            message: 'Terima kasih telah bergabung dengan WalletPoint.',
            icon: 'fa-bell',
            iconColor: '#8b5cf6',
            is_read: true,
            created_at: new Date(now - 1000 * 60 * 60 * 24).toISOString()
        });

        return notifications;
    },

    renderNotifications() {
        const container = document.getElementById('notifications-container');

        if (!this.notifications || this.notifications.length === 0) {
            container.innerHTML = Components.emptyState(
                '🔔',
                'Belum ada notifikasi',
                'Notifikasi akan muncul di sini'
            );
            return;
        }

        this.unreadCount = this.notifications.filter(n => !n.is_read).length;

        container.innerHTML = `
            <div class="list">
                ${this.notifications.map(notif => this.renderNotificationItem(notif)).join('')}
            </div>
        `;
    },

    renderNotificationItem(notif) {
        const timeAgo = this.getTimeAgo(notif.created_at);
        const unreadClass = notif.is_read ? '' : 'notification-unread';

        return `
            <div class="list-item ${unreadClass}" onclick="Pages.Notifications.handleNotificationClick('${notif.id}')">
                <div class="list-item-icon" style="background: ${notif.iconColor}20;">
                    <i class="fas ${notif.icon}" style="color: ${notif.iconColor};"></i>
                </div>
                <div class="list-item-content">
                    <div class="list-item-title" style="font-weight: ${notif.is_read ? '500' : '600'};">
                        ${Utils.escapeHtml(notif.title)}
                        ${!notif.is_read ? '<span class="notification-dot"></span>' : ''}
                    </div>
                    <div class="list-item-subtitle">${Utils.escapeHtml(notif.message)}</div>
                    <div class="text-muted" style="font-size: 11px; margin-top: 4px;">
                        <i class="fas fa-clock"></i> ${timeAgo}
                    </div>
                </div>
                ${notif.action === 'pickup' ? `
                    <div>
                        <span class="badge badge-danger">Perlu Aksi</span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Baru saja';
        if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
        return date.toLocaleDateString('id-ID');
    },

    async handleNotificationClick(id) {
        const notif = this.notifications.find(n => n.id === id);
        if (!notif) return;

        // Mark as read
        notif.is_read = true;
        this.renderNotifications();

        // Handle action based on type
        switch (notif.type) {
            case 'transaction':
                Router.navigate('/wallet');
                break;
            case 'mission':
                Router.navigate('/missions');
                break;
            case 'product':
                Router.navigate('/marketplace');
                break;
            case 'order':
                this.showOrderPickupModal(notif);
                break;
            default:
                break;
        }
    },

    showOrderPickupModal(notif) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Pesanan Perlu Disiapkan</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="text-center mb-lg">
                    <div style="font-size: 64px; margin-bottom: 16px;">📦</div>
                    <p class="text-muted">${Utils.escapeHtml(notif.message)}</p>
                </div>
                
                <div class="alert alert-info mb-md">
                    <i class="fas fa-info-circle"></i>
                    Mahasiswa akan datang untuk mengambil produk. Pastikan produk sudah siap!
                </div>
                
                <button class="btn btn-primary btn-block" onclick="this.closest('.modal-overlay').remove(); Utils.toast('Pesanan siap diambil!', 'success');">
                    <i class="fas fa-check"></i> Tandai Siap Diambil
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    async markAllAsRead() {
        this.notifications.forEach(n => n.is_read = true);
        this.renderNotifications();

        // Save read state to localStorage
        Utils.storage.set('wp_notifications_read', true);
        Utils.storage.set('wp_notifications_read_at', Date.now());

        // Update badge immediately
        this.updateNotificationBadge();

        Utils.toast('Semua notifikasi ditandai dibaca', 'success');
    },

    updateNotificationBadge() {
        this.unreadCount = this.notifications.filter(n => !n.is_read).length;

        // Update badge on dashboard
        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        // Save unread count to localStorage for persistence
        Utils.storage.set('wp_notification_unread_count', this.unreadCount);
    },

    // Get unread count for badge
    async getUnreadCount() {
        // Check if notifications were already read
        const readAt = Utils.storage.get('wp_notifications_read_at');
        const lastRead = readAt ? new Date(readAt) : null;

        try {
            const response = await Api.request('/notifications/unread-count');
            if (response.success) {
                this.unreadCount = response.data.count;
            }
        } catch (error) {
            // Check localStorage for cached count or use default
            const cachedCount = Utils.storage.get('wp_notification_unread_count');
            if (cachedCount !== null) {
                this.unreadCount = cachedCount;
            } else {
                // Only show unread if we haven't marked as read recently
                this.unreadCount = lastRead && (Date.now() - lastRead < 1000 * 60 * 60) ? 0 : 2;
            }
        }
        return this.unreadCount;
    },

    // Check for new notifications (call periodically)
    checkForNewNotifications() {
        // In a real app, this would check the API for new notifications
        // For now, we simulate by checking if enough time has passed
        const lastCheck = Utils.storage.get('wp_notification_last_check');
        const now = Date.now();

        if (!lastCheck || (now - lastCheck > 1000 * 60 * 30)) {
            // 30 minutes since last check, might have new notifications
            // Reset the read state so new notifications can show
            Utils.storage.remove('wp_notifications_read');
        }

        Utils.storage.set('wp_notification_last_check', now);
    }
};
