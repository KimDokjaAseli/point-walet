/**
 * WalletPoint - Dashboard Page
 */
const DashboardPage = {
    balance: null,
    transactions: [],
    missions: [],

    render(container) {
        const user = Storage.getUser();

        container.innerHTML = `
            <div class="dashboard-page">
                <div class="dashboard-header">
                    <div class="user-greeting">
                        <div class="greeting-text">Selamat datang,</div>
                        <div class="user-name">${user?.full_name || 'User'}</div>
                    </div>
                    <div class="user-avatar">
                        ${user?.full_name?.charAt(0) || '?'}
                    </div>
                </div>
                
                <div id="balance-section">
                    ${Components.skeletonCard()}
                </div>
                
                <div class="quick-actions">
                    <div class="quick-action" onclick="Router.navigate('wallet')">
                        <div class="quick-action-icon">💳</div>
                        <div class="quick-action-label">Wallet</div>
                    </div>
                    <div class="quick-action" onclick="Router.navigate('scan')">
                        <div class="quick-action-icon">📷</div>
                        <div class="quick-action-label">Scan</div>
                    </div>
                    <div class="quick-action" onclick="Router.navigate('missions')">
                        <div class="quick-action-icon">🎯</div>
                        <div class="quick-action-label">Misi</div>
                    </div>
                    <div class="quick-action" onclick="Router.navigate('marketplace')">
                        <div class="quick-action-icon">🛒</div>
                        <div class="quick-action-label">Market</div>
                    </div>
                </div>
                
                ${Components.sectionHeader('Misi Aktif', 'Lihat Semua', "Router.navigate('missions')")}
                <div id="missions-section">
                    ${Components.skeletonList(2)}
                </div>
                
                ${Components.sectionHeader('Transaksi Terbaru', 'Lihat Semua', "Router.navigate('wallet')")}
                <div id="transactions-section">
                    ${Components.skeletonList(3)}
                </div>
            </div>
        `;

        this.loadData();
    },

    async loadData() {
        try {
            // Load balance
            const balanceResult = await API.getBalance();
            if (balanceResult.success) {
                this.balance = balanceResult.data;
                this.renderBalance();
            }
        } catch (e) {
            console.error('Failed to load balance:', e);
        }

        try {
            // Load missions
            const missionsResult = await API.getMissions(1, 5);
            if (missionsResult.success) {
                this.missions = missionsResult.data || [];
                this.renderMissions();
            }
        } catch (e) {
            console.error('Failed to load missions:', e);
        }

        try {
            // Load transactions
            const txResult = await API.getTransactionHistory(1, 5);
            if (txResult.success) {
                this.transactions = txResult.data || [];
                this.renderTransactions();
            }
        } catch (e) {
            console.error('Failed to load transactions:', e);
        }
    },

    renderBalance() {
        const section = document.getElementById('balance-section');
        if (!section) return;

        section.innerHTML = Components.balanceCard(
            this.balance.balance,
            this.balance.lifetime_earned,
            this.balance.lifetime_spent
        );
    },

    renderMissions() {
        const section = document.getElementById('missions-section');
        if (!section) return;

        if (this.missions.length === 0) {
            section.innerHTML = Components.emptyState('🎯', 'Belum ada misi', 'Tunggu dosen membuat misi baru');
            return;
        }

        section.innerHTML = this.missions.map(mission =>
            Components.missionCard(mission, `MissionsPage.viewDetail(${mission.id})`)
        ).join('');
    },

    renderTransactions() {
        const section = document.getElementById('transactions-section');
        if (!section) return;

        if (this.transactions.length === 0) {
            section.innerHTML = Components.emptyState('📋', 'Belum ada transaksi', 'Riwayat transaksi akan muncul di sini');
            return;
        }

        section.innerHTML = this.transactions.map(tx =>
            Components.transactionItem(tx)
        ).join('');
    }
};
