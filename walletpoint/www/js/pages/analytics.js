/**
 * Analytics Dashboard Page - Admin Only
 * Shows statistics, charts, and activity data
 */
Pages.Analytics = {
    data: null,
    chartPeriod: 'week',

    async render() {
        if (!Auth.isAdmin()) {
            Utils.toast('Akses ditolak', 'error');
            Router.navigate('/dashboard');
            return;
        }

        const app = document.getElementById('app');

        app.innerHTML = `
            <div class="page" style="padding-bottom: 100px;">
                ${Components.pageHeader('Analytics Dashboard', true)}
                
                <!-- Period Selector -->
                <div class="flex gap-sm mb-lg">
                    <button class="btn btn-sm ${this.chartPeriod === 'week' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="Pages.Analytics.setPeriod('week')">
                        7 Hari
                    </button>
                    <button class="btn btn-sm ${this.chartPeriod === 'month' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="Pages.Analytics.setPeriod('month')">
                        30 Hari
                    </button>
                    <button class="btn btn-sm ${this.chartPeriod === 'year' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="Pages.Analytics.setPeriod('year')">
                        1 Tahun
                    </button>
                </div>
                
                <!-- Quick Stats -->
                <div id="quick-stats" class="mb-lg">
                    <div class="flex gap-sm mb-sm" style="overflow-x: auto;">
                        <div class="stat-card">
                            <div class="skeleton" style="height: 40px; width: 80px;"></div>
                        </div>
                        <div class="stat-card">
                            <div class="skeleton" style="height: 40px; width: 80px;"></div>
                        </div>
                        <div class="stat-card">
                            <div class="skeleton" style="height: 40px; width: 80px;"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Charts Section -->
                <div id="charts-section" class="mb-lg">
                    ${Components.sectionHeader('📊 Grafik Aktivitas', '', '')}
                    <div class="card mb-md">
                        <div id="points-chart" style="height: 200px;">
                            <div class="flex items-center justify-center h-full">
                                <div class="spinner"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- User Activity -->
                <div id="user-activity-section" class="mb-lg">
                    ${Components.sectionHeader('👥 Aktivitas Pengguna', '', '')}
                    <div id="user-activity-list">
                        <div class="text-center text-muted">
                            <div class="spinner" style="margin: 0 auto;"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Top Users -->
                <div id="top-users-section" class="mb-lg">
                    ${Components.sectionHeader('🏆 Top Performer', '', '')}
                    <div id="top-users-list">
                        <div class="text-center text-muted">
                            <div class="spinner" style="margin: 0 auto;"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Transaction Summary -->
                <div id="transaction-summary-section">
                    ${Components.sectionHeader('💰 Ringkasan Transaksi', '', '')}
                    <div id="transaction-summary">
                        <div class="text-center text-muted">
                            <div class="spinner" style="margin: 0 auto;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadData();
    },

    setPeriod(period) {
        this.chartPeriod = period;
        this.render();
    },

    async loadData() {
        try {
            const response = await Api.request(`/admin/analytics?period=${this.chartPeriod}`);

            if (response.success) {
                this.data = response.data;
            }
        } catch (error) {
            console.log('Using calculated analytics data');
            this.data = await this.getCalculatedData();
        }

        this.renderQuickStats();
        this.renderChart();
        this.renderUserActivity();
        this.renderTopUsers();
        this.renderTransactionSummary();
    },

    async getCalculatedData() {
        // Calculate from localStorage/API data
        const period = this.chartPeriod;
        const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;

        return {
            totalUsers: 0,
            totalTransactions: 0,
            totalPoints: 0,
            newUsersToday: 0,
            activeUsersToday: 0,
            totalQuizzesCompleted: 0,
            chartData: this.generateChartData(days),
            topUsers: [],
            recentActivity: []
        };
    },

    generateChartData(days) {
        const data = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            data.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                points: 0,
                transactions: 0
            });
        }

        return data;
    },

    renderQuickStats() {
        const container = document.getElementById('quick-stats');
        const data = this.data || {};

        const stats = [
            { label: 'Total Users', value: data.totalUsers || 0, icon: 'fa-users', color: '#3b82f6' },
            { label: 'Transaksi', value: data.totalTransactions || 0, icon: 'fa-exchange-alt', color: '#10b981' },
            { label: 'Total Poin', value: Utils.formatCurrency(data.totalPoints || 0), icon: 'fa-coins', color: '#f59e0b' },
            { label: 'Quiz Selesai', value: data.totalQuizzesCompleted || 0, icon: 'fa-check-circle', color: '#8b5cf6' }
        ];

        container.innerHTML = `
            <div class="flex gap-sm" style="overflow-x: auto; padding-bottom: 8px;">
                ${stats.map(stat => `
                    <div class="stat-card" style="min-width: 140px; flex: 1; background: linear-gradient(135deg, ${stat.color}20, ${stat.color}10); border-radius: 16px; padding: 16px;">
                        <div class="flex items-center gap-sm mb-sm">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: ${stat.color}; display: flex; align-items: center; justify-content: center;">
                                <i class="fas ${stat.icon}" style="color: white; font-size: 14px;"></i>
                            </div>
                        </div>
                        <div style="font-size: 24px; font-weight: 700;">${stat.value}</div>
                        <div class="text-muted" style="font-size: 12px;">${stat.label}</div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Today's Summary -->
            <div class="card mt-md" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="text-muted" style="font-size: 12px;">Hari Ini</div>
                        <div style="font-size: 18px; font-weight: 600;">${data.newUsersToday || 0} user baru</div>
                    </div>
                    <div class="text-right">
                        <div class="text-muted" style="font-size: 12px;">Aktif Hari Ini</div>
                        <div style="font-size: 18px; font-weight: 600; color: var(--accent);">${data.activeUsersToday || 0} user</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderChart() {
        const container = document.getElementById('points-chart');
        const chartData = this.data?.chartData || [];

        if (chartData.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted" style="padding: 40px;">
                    <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p>Belum ada data untuk ditampilkan</p>
                </div>
            `;
            return;
        }

        // Simple bar chart using CSS
        const maxValue = Math.max(...chartData.map(d => d.points), 1);
        const showLabels = chartData.length <= 14;

        container.innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column;">
                <div class="flex items-end gap-xs" style="flex: 1; padding: 8px 0;">
                    ${chartData.map((d, i) => `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%;">
                            <div style="flex: 1; width: 100%; display: flex; align-items: flex-end;">
                                <div style="width: 100%; height: ${(d.points / maxValue) * 100}%; background: linear-gradient(to top, var(--primary), var(--accent)); border-radius: 4px 4px 0 0; min-height: 4px;" title="${d.label}: ${d.points} poin"></div>
                            </div>
                            ${showLabels ? `<div style="font-size: 9px; color: var(--text-muted); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${d.label}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderUserActivity() {
        const container = document.getElementById('user-activity-list');
        const activities = this.data?.recentActivity || [];

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="card text-center text-muted">
                    <p>Belum ada aktivitas tercatat</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="list">
                ${activities.map(activity => {
            const iconConfig = this.getActivityIcon(activity.type);
            return `
                        <div class="list-item">
                            <div class="list-item-icon" style="background: ${iconConfig.bg};">
                                <i class="fas ${iconConfig.icon}" style="color: ${iconConfig.color};"></i>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">${Utils.escapeHtml(activity.user_name)}</div>
                                <div class="list-item-subtitle">${Utils.escapeHtml(activity.description)}</div>
                            </div>
                            <div class="text-muted" style="font-size: 11px;">
                                ${this.getTimeAgo(activity.created_at)}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    getActivityIcon(type) {
        const icons = {
            transaction: { icon: 'fa-exchange-alt', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
            quiz: { icon: 'fa-check-circle', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
            login: { icon: 'fa-user', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
            transfer: { icon: 'fa-paper-plane', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
            order: { icon: 'fa-shopping-bag', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
        };
        return icons[type] || icons.login;
    },

    getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Baru saja';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    },

    renderTopUsers() {
        const container = document.getElementById('top-users-list');
        const topUsers = this.data?.topUsers || [];

        if (topUsers.length === 0) {
            container.innerHTML = `
                <div class="card text-center text-muted">
                    <p>Belum ada data pengguna</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="list">
                ${topUsers.map((user, index) => {
            const medals = ['🥇', '🥈', '🥉'];
            const medal = medals[index] || `#${index + 1}`;

            return `
                        <div class="list-item">
                            <div style="font-size: 24px; min-width: 40px; text-align: center;">${medal}</div>
                            <div class="list-item-content">
                                <div class="list-item-title">${Utils.escapeHtml(user.name)}</div>
                                <div class="list-item-subtitle">${Utils.escapeHtml(user.email)}</div>
                            </div>
                            <div class="text-right">
                                <div style="font-weight: 600; color: var(--accent);">${Utils.formatCurrency(user.points)}</div>
                                <div class="text-muted" style="font-size: 11px;">${user.quizzes_completed || 0} quiz</div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    renderTransactionSummary() {
        const container = document.getElementById('transaction-summary');
        const data = this.data || {};

        const summaryData = [
            { label: 'Top Up', value: data.totalTopUp || 0, color: '#10b981', icon: 'fa-plus' },
            { label: 'Transfer', value: data.totalTransfers || 0, color: '#3b82f6', icon: 'fa-exchange-alt' },
            { label: 'Pembelian', value: data.totalPurchases || 0, color: '#f59e0b', icon: 'fa-shopping-cart' },
            { label: 'Reward Quiz', value: data.totalQuizRewards || 0, color: '#8b5cf6', icon: 'fa-trophy' }
        ];

        container.innerHTML = `
            <div class="card">
                ${summaryData.map(item => `
                    <div class="flex items-center justify-between py-sm" style="border-bottom: 1px solid var(--card);">
                        <div class="flex items-center gap-sm">
                            <div style="width: 32px; height: 32px; border-radius: 8px; background: ${item.color}20; display: flex; align-items: center; justify-content: center;">
                                <i class="fas ${item.icon}" style="color: ${item.color}; font-size: 12px;"></i>
                            </div>
                            <span>${item.label}</span>
                        </div>
                        <span style="font-weight: 600;">${Utils.formatCurrency(item.value)}</span>
                    </div>
                `).join('')}
                
                <div class="flex items-center justify-between pt-md mt-sm" style="border-top: 2px solid var(--primary);">
                    <span style="font-weight: 700;">Total Sirkulasi</span>
                    <span style="font-size: 20px; font-weight: 700; color: var(--primary);">
                        ${Utils.formatCurrency((data.totalTopUp || 0) + (data.totalQuizRewards || 0))}
                    </span>
                </div>
            </div>
        `;
    }
};
