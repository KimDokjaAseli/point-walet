/**
 * Notifications Page
 */
Pages.Notifications = {
    notifications: [],
    unreadCount: 0,
    activityScore: 0,
    moodLevel: 'normal',

    async render() {
        const app = document.getElementById('app');
        const user = Auth.getUser();

        app.innerHTML = `
            <div class="page">
                ${Components.pageHeader('Notifikasi', true)}
                
                <!-- Mood/Motivation Analysis Card -->
                <div id="mood-analysis-card" class="card mb-lg" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));">
                    <div class="text-center">
                        <div class="spinner" style="margin: 0 auto;"></div>
                        <p class="text-muted mt-sm">Menganalisis aktivitas...</p>
                    </div>
                </div>
                
                <!-- Recommended Missions -->
                <div id="recommended-missions" class="mb-lg" style="display: none;">
                    <!-- Will be populated -->
                </div>
                
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
        await this.analyzeUserMood();
    },

    async analyzeUserMood() {
        const user = Auth.getUser();
        const moodCard = document.getElementById('mood-analysis-card');

        // Calculate activity score based on mission history
        const activityData = await this.getActivityData();
        this.activityScore = activityData.score;
        this.moodLevel = this.calculateMoodLevel(activityData);

        const moodConfig = this.getMoodConfig(this.moodLevel);

        moodCard.innerHTML = `
            <div class="flex items-center gap-md">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: ${moodConfig.gradient}; display: flex; align-items: center; justify-content: center; font-size: 32px;">
                    ${moodConfig.emoji}
                </div>
                <div class="flex-1">
                    <h4 style="margin-bottom: 4px; color: ${moodConfig.color};">${moodConfig.title}</h4>
                    <p class="text-muted" style="font-size: 13px; margin-bottom: 8px;">${moodConfig.message}</p>
                    <div class="flex items-center gap-sm">
                        <div style="flex: 1; height: 8px; background: var(--card); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${this.activityScore}%; height: 100%; background: ${moodConfig.gradient}; border-radius: 4px;"></div>
                        </div>
                        <span style="font-size: 12px; font-weight: 600; color: ${moodConfig.color};">${this.activityScore}%</span>
                    </div>
                </div>
            </div>
            
            <div class="flex gap-sm mt-md">
                <div class="flex-1 text-center" style="padding: 8px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <div style="font-size: 20px; font-weight: 700;">${activityData.missionsCompleted}</div>
                    <div class="text-muted" style="font-size: 11px;">Misi Selesai</div>
                </div>
                <div class="flex-1 text-center" style="padding: 8px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <div style="font-size: 20px; font-weight: 700;">${activityData.streak}</div>
                    <div class="text-muted" style="font-size: 11px;">Hari Streak</div>
                </div>
                <div class="flex-1 text-center" style="padding: 8px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <div style="font-size: 20px; font-weight: 700;">${Utils.formatCurrency(activityData.pointsEarned)}</div>
                    <div class="text-muted" style="font-size: 11px;">Poin Minggu Ini</div>
                </div>
            </div>
        `;

        // Show recommended missions
        this.showRecommendedMissions(activityData);
    },

    async getActivityData() {
        // Get real data from localStorage
        const completedQuizzes = Utils.storage.get('wp_completed_quizzes') || [];
        const transactions = Utils.storage.get('wp_transactions') || [];
        const lastLogin = Utils.storage.get('wp_last_login');
        const loginStreak = Utils.storage.get('wp_login_streak') || 0;

        // Calculate missions completed this week
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

        let missionsCompleted = completedQuizzes.length;
        let pointsEarned = Utils.storage.get('wp_points_earned_week') || 0;
        let streak = loginStreak;

        // Update login streak
        if (lastLogin) {
            const lastDate = new Date(lastLogin).toDateString();
            const today = now.toDateString();
            const yesterday = new Date(now - 24 * 60 * 60 * 1000).toDateString();

            if (lastDate !== today) {
                if (lastDate === yesterday) {
                    streak = loginStreak + 1;
                } else {
                    streak = 1;
                }
                Utils.storage.set('wp_login_streak', streak);
                Utils.storage.set('wp_last_login', now.toISOString());
            }
        } else {
            streak = 1;
            Utils.storage.set('wp_login_streak', streak);
            Utils.storage.set('wp_last_login', now.toISOString());
        }

        // Calculate score (0-100)
        const score = Math.min(100, Math.round(
            (missionsCompleted * 15) +
            (streak * 8) +
            Math.min(30, pointsEarned / 20)
        ));

        return {
            missionsCompleted,
            pointsEarned,
            streak,
            score,
            lastActiveDate: now
        };
    },

    calculateMoodLevel(activityData) {
        const score = activityData.score;

        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'normal';
        if (score >= 20) return 'low';
        return 'needs_motivation';
    },

    getMoodConfig(level) {
        const configs = {
            excellent: {
                emoji: '🔥',
                title: 'Semangat Membara!',
                message: 'Luar biasa! Kamu sangat aktif minggu ini.',
                color: '#10b981',
                gradient: 'linear-gradient(135deg, #10b981, #059669)'
            },
            good: {
                emoji: '😊',
                title: 'Semangat Bagus!',
                message: 'Bagus! Terus pertahankan momentum.',
                color: '#3b82f6',
                gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)'
            },
            normal: {
                emoji: '🙂',
                title: 'Semangat Stabil',
                message: 'Aktivitasmu cukup baik. Ayo tingkatkan lagi!',
                color: '#8b5cf6',
                gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
            },
            low: {
                emoji: '😐',
                title: 'Perlu Semangat',
                message: 'Aktivitasmu menurun. Coba selesaikan misi!',
                color: '#f59e0b',
                gradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
            },
            needs_motivation: {
                emoji: '💪',
                title: 'Ayo Bangkit!',
                message: 'Sudah lama tidak aktif. Mulai dari misi mudah!',
                color: '#ef4444',
                gradient: 'linear-gradient(135deg, #ef4444, #dc2626)'
            }
        };

        return configs[level] || configs.normal;
    },

    showRecommendedMissions(activityData) {
        const container = document.getElementById('recommended-missions');
        const moodLevel = this.moodLevel;

        // Get recommended missions based on mood
        const recommendations = this.getRecommendedMissions(moodLevel, activityData);

        if (recommendations.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        container.innerHTML = `
            <div class="flex items-center justify-between mb-sm">
                <h4><i class="fas fa-magic"></i> Rekomendasi Misi</h4>
                <button class="btn btn-sm btn-ghost" onclick="Router.navigate('/missions')">
                    Lihat Semua <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            
            <div class="list">
                ${recommendations.map(mission => `
                    <div class="list-item" onclick="Router.navigate('/missions')">
                        <div class="list-item-icon" style="background: ${mission.bgColor};">
                            <i class="fas ${mission.icon}" style="color: ${mission.iconColor};"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${Utils.escapeHtml(mission.title)}</div>
                            <div class="list-item-subtitle">${Utils.escapeHtml(mission.reason)}</div>
                        </div>
                        <div class="text-right">
                            <span class="badge badge-success">+${Utils.formatCurrency(mission.reward)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    getRecommendedMissions(moodLevel, activityData) {
        const missions = [];

        if (moodLevel === 'needs_motivation' || moodLevel === 'low') {
            missions.push({
                id: 'easy-1',
                title: 'Quiz Cepat: Pengetahuan Umum',
                reason: 'Mudah diselesaikan untuk memulai',
                reward: 25,
                icon: 'fa-bolt',
                iconColor: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.1)'
            });
            missions.push({
                id: 'daily-1',
                title: 'Misi Harian: Login Streak',
                reason: 'Pertahankan kehadiranmu',
                reward: 10,
                icon: 'fa-calendar-check',
                iconColor: '#10b981',
                bgColor: 'rgba(16, 185, 129, 0.1)'
            });
        } else if (moodLevel === 'normal') {
            missions.push({
                id: 'medium-1',
                title: 'Quiz Pemrograman Dasar',
                reason: 'Sesuai dengan kemampuanmu',
                reward: 50,
                icon: 'fa-code',
                iconColor: '#3b82f6',
                bgColor: 'rgba(59, 130, 246, 0.1)'
            });
        } else if (moodLevel === 'good' || moodLevel === 'excellent') {
            missions.push({
                id: 'hard-1',
                title: 'Tantangan: Database Expert',
                reason: 'Tingkatkan skill ke level berikutnya!',
                reward: 100,
                icon: 'fa-database',
                iconColor: '#8b5cf6',
                bgColor: 'rgba(139, 92, 246, 0.1)'
            });
            missions.push({
                id: 'bonus-1',
                title: 'Bonus: Review Materi Lengkap',
                reason: 'Kamu siap untuk tantangan besar!',
                reward: 150,
                icon: 'fa-trophy',
                iconColor: '#eab308',
                bgColor: 'rgba(234, 179, 8, 0.1)'
            });
        }

        return missions;
    },

    async loadNotifications() {
        const container = document.getElementById('notifications-container');

        try {
            // Try to get notifications from API
            const response = await Api.request('/notifications');

            if (response.success && response.data?.notifications) {
                this.notifications = response.data.notifications;
            } else {
                // Use in-app notifications from localStorage
                this.notifications = this.getStoredNotifications();
            }

            this.renderNotifications();
        } catch (error) {
            // Use stored notifications on error
            console.log('Using stored notifications');
            this.notifications = this.getStoredNotifications();
            this.renderNotifications();
        }
    },

    getStoredNotifications() {
        // Get notifications from PushNotification service storage
        const stored = Utils.storage.get('wp_in_app_notifications') || [];

        // If no notifications yet, return welcome notification
        if (stored.length === 0) {
            return [{
                id: 'welcome-1',
                type: 'system',
                title: 'Selamat Datang!',
                message: 'Terima kasih telah bergabung dengan WalletPoint.',
                icon: 'fa-hand-wave',
                iconColor: '#8b5cf6',
                is_read: false,
                created_at: new Date().toISOString()
            }];
        }

        return stored;
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
