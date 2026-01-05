/**
 * Wallet Page
 */
Pages.Wallet = {
    walletData: null,
    transactions: [],
    currentPage: 1,
    totalPages: 1,

    async render() {
        const app = document.getElementById('app');

        app.innerHTML = `
            <div class="page">
                ${Components.pageHeader('Wallet')}
                
                <div id="wallet-balance">
                    <div class="card balance-card">
                        <div class="balance-label">Total Saldo</div>
                        <div class="balance-amount">
                            <div class="skeleton" style="height: 36px; width: 150px;"></div>
                        </div>
                    </div>
                </div>
                
                <div id="wallet-summary" class="card mt-lg mb-lg">
                    <div class="flex justify-between items-center mb-md">
                        <div>
                            <div class="text-muted" style="font-size: 12px;">Total Masuk</div>
                            <div class="skeleton" style="height: 20px; width: 100px;"></div>
                        </div>
                        <div class="text-right">
                            <div class="text-muted" style="font-size: 12px;">Total Keluar</div>
                            <div class="skeleton" style="height: 20px; width: 100px;"></div>
                        </div>
                    </div>
                </div>
                
                ${Components.sectionHeader('Riwayat Transaksi')}
                
                <div id="transaction-list" class="list">
                    ${[1, 2, 3, 4, 5].map(() => `
                        <div class="list-item">
                            <div class="skeleton" style="width: 44px; height: 44px; border-radius: 12px;"></div>
                            <div class="list-item-content">
                                <div class="skeleton" style="height: 16px; width: 120px; margin-bottom: 8px;"></div>
                                <div class="skeleton" style="height: 12px; width: 80px;"></div>
                            </div>
                            <div class="skeleton" style="height: 16px; width: 80px;"></div>
                        </div>
                    `).join('')}
                </div>
                
                <div id="pagination" class="flex justify-center gap-md mt-lg" style="display: none;">
                    <button class="btn btn-secondary btn-sm" id="prev-btn" onclick="Pages.Wallet.prevPage()">
                        <i class="fas fa-chevron-left"></i> Prev
                    </button>
                    <span id="page-info" class="flex items-center"></span>
                    <button class="btn btn-secondary btn-sm" id="next-btn" onclick="Pages.Wallet.nextPage()">
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            ${Components.tabBar('wallet')}
        `;

        Components.setupTabBar();
        await this.loadData();
    },

    async loadData() {
        try {
            // Load wallet
            const walletResponse = await Api.getWallet();
            if (walletResponse.success) {
                this.walletData = walletResponse.data.wallet;
                const summary = walletResponse.data.summary;

                document.getElementById('wallet-balance').innerHTML =
                    Components.balanceCard(this.walletData.balance, false);

                document.getElementById('wallet-summary').innerHTML = `
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="text-muted" style="font-size: 12px;">Total Masuk</div>
                            <div class="text-success" style="font-weight: 600; font-size: 18px;">
                                +${Utils.formatCurrency(summary?.total_credit || 0)}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-muted" style="font-size: 12px;">Total Keluar</div>
                            <div class="text-danger" style="font-weight: 600; font-size: 18px;">
                                -${Utils.formatCurrency(summary?.total_debit || 0)}
                            </div>
                        </div>
                    </div>
                    <div class="text-center text-muted mt-md" style="font-size: 12px;">
                        ${summary?.transaction_count || 0} transaksi
                    </div>
                `;
            }

            await this.loadTransactions();
        } catch (error) {
            Utils.toast('Gagal memuat data wallet', 'error');
        }
    },

    async loadTransactions() {
        try {
            const response = await Api.getTransactions(this.currentPage, 10);
            if (response.success) {
                this.transactions = response.data.transactions;
                this.totalPages = response.meta.total_pages || 1;
                this.renderTransactions();
                this.updatePagination();
            }
        } catch (error) {
            Utils.toast('Gagal memuat transaksi', 'error');
        }
    },

    renderTransactions() {
        const container = document.getElementById('transaction-list');

        if (this.transactions.length === 0) {
            container.innerHTML = Components.emptyState('📋', 'Belum ada transaksi', 'Transaksi akan muncul di sini');
            return;
        }

        container.innerHTML = this.transactions.map(tx => Components.transactionItem(tx)).join('');
    },

    updatePagination() {
        const pagination = document.getElementById('pagination');
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        if (this.totalPages > 1) {
            pagination.style.display = 'flex';
            pageInfo.textContent = `${this.currentPage} / ${this.totalPages}`;
            prevBtn.disabled = this.currentPage <= 1;
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }
    },

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadTransactions();
        }
    },

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadTransactions();
        }
    }
};
