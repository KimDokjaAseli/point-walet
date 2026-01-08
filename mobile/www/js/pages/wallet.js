/**
 * WalletPoint - Wallet Page
 */
const WalletPage = {
    balance: null,
    transactions: [],
    currentPage: 1,
    totalPages: 1,
    loading: false,

    render(container) {
        container.innerHTML = `
            ${Components.pageHeader('Wallet', true)}
            
            <div class="p-md">
                <div id="balance-section">
                    ${Components.skeletonCard()}
                </div>
                
                <div class="flex gap-md mb-lg">
                    ${this.renderActionButtons()}
                </div>
                
                ${Components.sectionHeader('Riwayat Transaksi')}
                <div id="transactions-list">
                    ${Components.skeletonList(5)}
                </div>
                
                <div id="load-more" class="text-center mt-md hidden">
                    <button class="btn btn-secondary" onclick="WalletPage.loadMore()">
                        Muat Lebih Banyak
                    </button>
                </div>
            </div>
        `;

        this.loadData();
    },

    renderActionButtons() {
        const user = Storage.getUser();

        if (user?.role === Config.ROLES.DOSEN) {
            return `
                <button class="btn btn-secondary" style="flex:1" onclick="WalletPage.showCreateQR()">
                    📱 Buat QR
                </button>
                <button class="btn btn-primary" style="flex:1" onclick="WalletPage.showTransfer()">
                    💸 Transfer
                </button>
            `;
        }

        return `
            <button class="btn btn-secondary" style="flex:1" onclick="Router.navigate('scan')">
                📷 Scan QR
            </button>
            <button class="btn btn-primary" style="flex:1" onclick="WalletPage.showTopup()">
                💳 Top Up
            </button>
        `;
    },

    async loadData() {
        try {
            const [balanceResult, txResult] = await Promise.all([
                API.getBalance(),
                API.getTransactionHistory(1, 20)
            ]);

            if (balanceResult.success) {
                this.balance = balanceResult.data;
                this.renderBalance();
            }

            if (txResult.success) {
                this.transactions = txResult.data || [];
                this.currentPage = txResult.meta?.page || 1;
                this.totalPages = txResult.meta?.total_pages || 1;
                this.renderTransactions();
            }
        } catch (e) {
            console.error('Failed to load wallet data:', e);
            App.showToast('Gagal memuat data', 'error');
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

    renderTransactions() {
        const list = document.getElementById('transactions-list');
        const loadMore = document.getElementById('load-more');
        if (!list) return;

        if (this.transactions.length === 0) {
            list.innerHTML = Components.emptyState('📋', 'Belum ada transaksi', 'Riwayat transaksi akan muncul di sini');
            return;
        }

        list.innerHTML = this.transactions.map(tx =>
            Components.transactionItem(tx)
        ).join('');

        // Show/hide load more button
        if (this.currentPage < this.totalPages) {
            loadMore.classList.remove('hidden');
        } else {
            loadMore.classList.add('hidden');
        }
    },

    async loadMore() {
        if (this.loading || this.currentPage >= this.totalPages) return;

        this.loading = true;

        try {
            const result = await API.getTransactionHistory(this.currentPage + 1, 20);
            if (result.success) {
                this.transactions = [...this.transactions, ...(result.data || [])];
                this.currentPage = result.meta?.page || this.currentPage + 1;
                this.renderTransactions();
            }
        } catch (e) {
            console.error('Failed to load more:', e);
        } finally {
            this.loading = false;
        }
    },

    showCreateQR() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Buat QR Payment</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <form id="create-qr-form">
                ${Components.formInput('qr_amount', 'Jumlah Poin', 'number', 'Masukkan jumlah')}
                ${Components.formInput('qr_description', 'Deskripsi', 'text', 'Deskripsi pembayaran', '', false)}
                
                <div id="qr-error" class="form-error mb-md hidden"></div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    Buat QR Code
                </button>
            </form>
        `;

        modal.classList.remove('hidden');

        document.getElementById('create-qr-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createQR();
        });
    },

    async createQR() {
        const amount = parseInt(document.getElementById('qr_amount').value);
        const description = document.getElementById('qr_description').value;
        const errorDiv = document.getElementById('qr-error');

        if (!amount || amount <= 0) {
            errorDiv.textContent = 'Jumlah harus lebih dari 0';
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            const result = await API.createQR(amount, description);
            if (result.success) {
                App.closeModal();
                this.showQRCode(result.data);
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            errorDiv.textContent = e.response?.message || e.message || 'Gagal membuat QR';
            errorDiv.classList.remove('hidden');
        }
    },

    showQRCode(qrData) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">QR Code Pembayaran</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <div class="qr-display">
                <div class="qr-image">
                    <img src="${qrData.qr_image_base64}" alt="QR Code">
                </div>
                <div class="qr-info">
                    <div class="qr-amount">${Components.formatPoints(qrData.amount)} pts</div>
                    <div class="qr-timer">
                        ⏱️ Berlaku: <span class="timer-value" id="qr-countdown">${qrData.remaining_time_seconds}s</span>
                    </div>
                    ${qrData.description ? `<p class="text-muted mt-md">${qrData.description}</p>` : ''}
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        // Start countdown
        let remaining = qrData.remaining_time_seconds;
        const countdown = setInterval(() => {
            remaining--;
            const el = document.getElementById('qr-countdown');
            if (el) {
                const mins = Math.floor(remaining / 60);
                const secs = remaining % 60;
                el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

                if (remaining <= 0) {
                    clearInterval(countdown);
                    el.textContent = 'Expired';
                    el.style.color = 'var(--danger)';
                }
            } else {
                clearInterval(countdown);
            }
        }, 1000);
    },

    showTransfer() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Transfer Poin</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <form id="transfer-form">
                ${Components.formInput('transfer_user_id', 'ID Mahasiswa', 'number', 'Masukkan ID user')}
                ${Components.formInput('transfer_amount', 'Jumlah Poin', 'number', 'Masukkan jumlah')}
                ${Components.formInput('transfer_description', 'Keterangan', 'text', 'Keterangan transfer', '', false)}
                
                <div id="transfer-error" class="form-error mb-md hidden"></div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    Transfer
                </button>
            </form>
        `;

        modal.classList.remove('hidden');

        document.getElementById('transfer-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.doTransfer();
        });
    },

    async doTransfer() {
        const userId = parseInt(document.getElementById('transfer_user_id').value);
        const amount = parseInt(document.getElementById('transfer_amount').value);
        const description = document.getElementById('transfer_description').value;
        const errorDiv = document.getElementById('transfer-error');

        if (!userId || !amount) {
            errorDiv.textContent = 'ID user dan jumlah harus diisi';
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            const result = await API.transfer(userId, amount, description);
            if (result.success) {
                App.closeModal();
                App.showToast('Transfer berhasil!', 'success');
                this.loadData(); // Refresh
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            errorDiv.textContent = e.response?.message || e.message || 'Gagal transfer';
            errorDiv.classList.remove('hidden');
        }
    },

    showTopup() {
        App.showToast('Fitur top-up akan segera tersedia', 'info');
    }
};
