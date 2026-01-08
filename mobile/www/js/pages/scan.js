/**
 * WalletPoint - Scan Page
 */
const ScanPage = {
    scanning: false,

    render(container) {
        container.innerHTML = `
            <div class="scanner-page">
                <div class="scanner-header">
                    <button class="back-button" onclick="Router.navigate('dashboard')" style="position: absolute; left: 16px;">
                        ←
                    </button>
                    <h1 class="scanner-title">Scan QR Code</h1>
                </div>
                
                <div class="scanner-viewport">
                    <div class="scanner-frame"></div>
                </div>
                
                <div class="scanner-hint">
                    Arahkan kamera ke QR Code pembayaran
                </div>
                
                <div class="scanner-actions">
                    <button class="btn btn-primary btn-lg" onclick="ScanPage.startScan()">
                        📷 Mulai Scan
                    </button>
                </div>
            </div>
        `;
    },

    startScan() {
        if (this.scanning) return;
        this.scanning = true;

        // Check if barcode scanner plugin is available
        if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.barcodeScanner) {
            cordova.plugins.barcodeScanner.scan(
                (result) => {
                    this.scanning = false;
                    if (!result.cancelled && result.text) {
                        this.processScannedCode(result.text);
                    }
                },
                (error) => {
                    this.scanning = false;
                    App.showToast('Gagal membuka kamera: ' + error, 'error');
                },
                {
                    preferFrontCamera: false,
                    showFlipCameraButton: true,
                    showTorchButton: true,
                    torchOn: false,
                    prompt: "Scan QR Code Pembayaran",
                    resultDisplayDuration: 500,
                    formats: "QR_CODE",
                    orientation: "portrait",
                    disableAnimations: true,
                    disableSuccessBeep: false
                }
            );
        } else {
            // For browser testing, show input modal
            this.scanning = false;
            this.showManualInput();
        }
    },

    showManualInput() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Input Kode QR</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <p class="text-muted mb-md">
                Scanner kamera tidak tersedia. Masukkan kode QR secara manual:
            </p>
            
            <form id="manual-qr-form">
                ${Components.formInput('qr_code', 'Kode QR', 'text', 'Masukkan kode QR')}
                
                <div id="scan-error" class="form-error mb-md hidden"></div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    Proses Pembayaran
                </button>
            </form>
        `;

        modal.classList.remove('hidden');

        document.getElementById('manual-qr-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('qr_code').value;
            if (code) {
                App.closeModal();
                await this.processScannedCode(code);
            }
        });
    },

    async processScannedCode(qrCode) {
        // Show confirmation modal
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="text-center p-lg">
                <div class="loading-spinner mb-md" style="margin: 0 auto;"></div>
                <p>Memproses pembayaran...</p>
            </div>
        `;

        modal.classList.remove('hidden');

        try {
            const result = await API.processQRPayment(qrCode);

            if (result.success) {
                this.showPaymentSuccess(result.data);
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            if (e.offline) {
                // Queued for later
                content.innerHTML = `
                    <div class="text-center p-lg">
                        <div class="mb-md" style="font-size: 48px;">📶</div>
                        <h3 class="mb-md">Transaksi Disimpan</h3>
                        <p class="text-muted mb-lg">
                            Anda sedang offline. Transaksi akan diproses secara otomatis saat kembali online.
                        </p>
                        <button class="btn btn-primary btn-block" onclick="App.closeModal(); Router.navigate('dashboard');">
                            OK
                        </button>
                    </div>
                `;
            } else {
                this.showPaymentError(e.response?.message || e.message || 'Pembayaran gagal');
            }
        }
    },

    showPaymentSuccess(data) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="text-center p-lg">
                <div class="mb-md" style="font-size: 64px;">✅</div>
                <h3 class="mb-md">Pembayaran Berhasil!</h3>
                
                <div class="card mb-lg" style="background: rgba(16, 185, 129, 0.1); border-color: var(--success);">
                    <div style="font-size: 28px; font-weight: 700; color: var(--success);">
                        -${Components.formatPoints(data.amount)} pts
                    </div>
                    ${data.description ? `<div class="text-muted mt-sm">${data.description}</div>` : ''}
                </div>
                
                <div class="text-left text-sm">
                    <div class="flex-between mb-sm">
                        <span class="text-muted">Penerima:</span>
                        <span>${data.payee_name || '-'}</span>
                    </div>
                    <div class="flex-between mb-sm">
                        <span class="text-muted">Saldo Baru:</span>
                        <span>${Components.formatPoints(data.your_new_balance)} pts</span>
                    </div>
                    <div class="flex-between">
                        <span class="text-muted">Kode Transaksi:</span>
                        <span>${data.transaction_code}</span>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-block mt-lg" onclick="App.closeModal(); Router.navigate('dashboard');">
                    Selesai
                </button>
            </div>
        `;
    },

    showPaymentError(message) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="text-center p-lg">
                <div class="mb-md" style="font-size: 64px;">❌</div>
                <h3 class="mb-md">Pembayaran Gagal</h3>
                <p class="text-muted mb-lg">${message}</p>
                
                <div class="flex gap-md">
                    <button class="btn btn-secondary" style="flex:1" onclick="App.closeModal();">
                        Tutup
                    </button>
                    <button class="btn btn-primary" style="flex:1" onclick="App.closeModal(); ScanPage.startScan();">
                        Scan Ulang
                    </button>
                </div>
            </div>
        `;
    }
};
