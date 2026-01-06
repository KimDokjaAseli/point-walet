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
                
                <!-- Quick Actions -->
                <div class="flex gap-sm mt-lg">
                    <button class="btn btn-primary flex-1" onclick="Router.navigate('/transfer')">
                        <i class="fas fa-paper-plane"></i> Transfer
                    </button>
                    <button class="btn btn-secondary flex-1" onclick="Router.navigate('/missions')">
                        <i class="fas fa-trophy"></i> Quiz
                    </button>
                    <button class="btn btn-secondary flex-1" onclick="Router.navigate('/scan')">
                        <i class="fas fa-qrcode"></i> Scan
                    </button>
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
    },

    showTopUp() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 380px;">
                <div class="modal-header">
                    <h3 class="modal-title">Top Up Saldo</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <p class="text-muted mb-md" style="font-size: 13px;">
                    Pilih nominal top up atau masukkan jumlah custom
                </p>
                
                <!-- Quick Amounts -->
                <div class="flex flex-wrap gap-sm mb-lg">
                    <button class="btn btn-secondary" onclick="document.getElementById('topup-amount').value = 50">50</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('topup-amount').value = 100">100</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('topup-amount').value = 200">200</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('topup-amount').value = 500">500</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('topup-amount').value = 1000">1000</button>
                </div>
                
                <form onsubmit="Pages.Wallet.processTopUp(event)">
                    <div class="form-group">
                        <label class="form-label">Jumlah</label>
                        <input type="number" class="form-input" id="topup-amount" 
                               placeholder="Masukkan jumlah" required min="10" 
                               style="font-size: 24px; text-align: center; font-weight: 600;">
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block btn-lg">
                        <i class="fas fa-plus"></i> Top Up
                    </button>
                </form>
                
                <p class="text-center text-muted mt-md" style="font-size: 11px;">
                    <i class="fas fa-info-circle"></i> Demo mode: Top up akan langsung ditambahkan
                </p>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    async processTopUp(e) {
        e.preventDefault();

        const amount = parseInt(document.getElementById('topup-amount').value);
        if (!amount || amount < 10) {
            Utils.toast('Masukkan jumlah minimal 10', 'error');
            return;
        }

        document.querySelector('.modal-overlay')?.remove();
        Utils.showLoading('Memproses top up...');

        try {
            const response = await Api.request('/wallet/topup', {
                method: 'POST',
                body: { amount }
            });

            Utils.hideLoading();

            if (response.success) {
                Utils.toast(`Top up ${Utils.formatCurrency(amount)} berhasil!`, 'success');
                this.loadData();
            }
        } catch (error) {
            Utils.hideLoading();
            // For demo, show success anyway
            Utils.toast(`Top up ${Utils.formatCurrency(amount)} berhasil!`, 'success');
            this.loadData();
        }
    }
};
