/**
 * QR Scan Page - With Web Camera Support and File Upload
 */
Pages.Scan = {
    isScanning: false,
    videoStream: null,
    scanInterval: null,

    render() {
        const app = document.getElementById('app');

        app.innerHTML = `
            <div class="page">
                ${Components.pageHeader('Scan QR')}
                
                <div class="card text-center mb-lg">
                    <div style="font-size: 80px; margin-bottom: 16px;">📷</div>
                    <h3 class="mb-sm">Scan QR Payment</h3>
                    <p class="text-muted mb-lg">Scan QR code untuk melakukan pembayaran</p>
                    
                    <div class="flex flex-col gap-md">
                        <button class="btn btn-primary btn-lg btn-block" onclick="Pages.Scan.startScan()">
                            <i class="fas fa-camera"></i> Scan dengan Kamera
                        </button>
                        
                        <button class="btn btn-secondary btn-lg btn-block" onclick="Pages.Scan.selectFromGallery()">
                            <i class="fas fa-image"></i> Pilih dari Galeri/File
                        </button>
                    </div>
                    
                    <!-- Hidden file input for gallery selection -->
                    <input type="file" id="qr-file-input" accept="image/*" style="display: none;" 
                           onchange="Pages.Scan.handleFileSelect(event)">
                </div>
            </div>
            ${Components.tabBar('scan')}
        `;

        Components.setupTabBar();
    },

    selectFromGallery() {
        document.getElementById('qr-file-input').click();
    },

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        Utils.showLoading('Membaca QR Code...');

        try {
            const imageData = await this.readImageAsDataURL(file);
            const qrCode = await this.scanQRFromImage(imageData);

            Utils.hideLoading();

            if (qrCode) {
                this.handleScannedCode(qrCode);
            } else {
                Utils.toast('QR Code tidak ditemukan dalam gambar', 'error');
            }
        } catch (error) {
            Utils.hideLoading();
            Utils.toast('Gagal membaca gambar: ' + error.message, 'error');
        }

        // Reset input
        event.target.value = '';
    },

    readImageAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Gagal membaca file'));
            reader.readAsDataURL(file);
        });
    },

    async scanQRFromImage(imageDataURL) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    resolve(code ? code.data : null);
                } else {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = imageDataURL;
        });
    },

    startScan() {
        // Check if QRScanner plugin is available (Cordova)
        if (typeof QRScanner !== 'undefined') {
            this.startCordovaScan();
        } else if (typeof jsQR !== 'undefined') {
            // Web camera scan
            this.startWebCameraScan();
        } else {
            // No camera available
            Utils.toast('Kamera tidak tersedia di perangkat ini', 'error');
        }
    },

    async startWebCameraScan() {
        try {
            // Request camera permission
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Prefer rear camera
            });

            this.videoStream = stream;
            this.isScanning = true;

            // Show scanner UI
            const app = document.getElementById('app');
            app.innerHTML = `
                <div class="scanner-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 1000;">
                    <video id="scanner-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
                    
                    <div class="scanner-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <div class="scanner-frame" style="width: 250px; height: 250px; border: 3px solid var(--primary); border-radius: 16px; position: relative; animation: pulse 2s infinite;">
                            <div class="scanner-corner top-left" style="position: absolute; top: -3px; left: -3px; width: 30px; height: 30px; border-top: 4px solid var(--accent); border-left: 4px solid var(--accent); border-radius: 8px 0 0 0;"></div>
                            <div class="scanner-corner top-right" style="position: absolute; top: -3px; right: -3px; width: 30px; height: 30px; border-top: 4px solid var(--accent); border-right: 4px solid var(--accent); border-radius: 0 8px 0 0;"></div>
                            <div class="scanner-corner bottom-left" style="position: absolute; bottom: -3px; left: -3px; width: 30px; height: 30px; border-bottom: 4px solid var(--accent); border-left: 4px solid var(--accent); border-radius: 0 0 0 8px;"></div>
                            <div class="scanner-corner bottom-right" style="position: absolute; bottom: -3px; right: -3px; width: 30px; height: 30px; border-bottom: 4px solid var(--accent); border-right: 4px solid var(--accent); border-radius: 0 0 8px 0;"></div>
                            <div class="scanner-line" style="position: absolute; top: 0; left: 5%; width: 90%; height: 2px; background: linear-gradient(90deg, transparent, var(--accent), transparent); animation: scanLine 2s linear infinite;"></div>
                        </div>
                        
                        <p style="color: white; margin-top: 24px; font-size: 14px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
                            <i class="fas fa-qrcode"></i> Arahkan kamera ke QR Code
                        </p>
                        
                        <div id="scan-status" style="color: var(--accent); margin-top: 12px; font-size: 13px;">
                            <div class="spinner" style="width: 16px; height: 16px; border-width: 2px; display: inline-block; vertical-align: middle; margin-right: 8px;"></div>
                            Mencari QR Code...
                        </div>
                        
                        <button class="btn btn-secondary" onclick="Pages.Scan.stopScan()" style="margin-top: 32px; padding: 12px 32px;">
                            <i class="fas fa-times"></i> Batal
                        </button>
                    </div>
                    
                    <canvas id="scanner-canvas" style="display: none;"></canvas>
                </div>
                
                <style>
                    @keyframes scanLine {
                        0% { top: 0; opacity: 0; }
                        50% { opacity: 1; }
                        100% { top: 100%; opacity: 0; }
                    }
                    @keyframes pulse {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.4); }
                        50% { box-shadow: 0 0 0 10px rgba(0, 212, 255, 0); }
                    }
                </style>
            `;

            // Setup video
            const video = document.getElementById('scanner-video');
            video.srcObject = stream;

            // Wait for video to load
            video.onloadedmetadata = () => {
                video.play();
                this.startQRScanning(video);
            };

        } catch (error) {
            console.error('Camera error:', error);

            if (error.name === 'NotAllowedError') {
                Utils.toast('Izin kamera ditolak. Silakan izinkan akses kamera.', 'error');
            } else if (error.name === 'NotFoundError') {
                Utils.toast('Kamera tidak ditemukan di perangkat ini.', 'error');
            } else {
                Utils.toast('Gagal mengakses kamera: ' + error.message, 'error');
            }

            this.showScanModal();
        }
    },

    startQRScanning(video) {
        const canvas = document.getElementById('scanner-canvas');
        const ctx = canvas.getContext('2d');

        const scan = () => {
            if (!this.isScanning) return;

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert'
                });

                if (code) {
                    // QR Code found!
                    console.log('QR Code found:', code.data);

                    // Update status
                    const statusEl = document.getElementById('scan-status');
                    if (statusEl) {
                        statusEl.innerHTML = `
                            <i class="fas fa-check-circle" style="color: var(--success);"></i>
                            QR Code terdeteksi!
                        `;
                    }

                    // Stop scanning and process
                    this.stopScan();
                    this.processQRCode(code.data);
                    return;
                }
            }

            // Continue scanning
            this.scanInterval = requestAnimationFrame(scan);
        };

        scan();
    },

    startCordovaScan() {
        this.isScanning = true;

        // Show scanner UI
        document.getElementById('app').innerHTML = `
            <div class="scanner-container">
                <div class="scanner-overlay">
                    <div class="scanner-frame">
                        <div class="scanner-line"></div>
                    </div>
                    <p class="scanner-hint">Arahkan kamera ke QR Code</p>
                    <button class="btn btn-secondary scanner-cancel" onclick="Pages.Scan.stopScan()">
                        <i class="fas fa-times"></i> Batal
                    </button>
                </div>
            </div>
        `;

        QRScanner.prepare((err, status) => {
            if (err) {
                Utils.toast('Gagal menyiapkan kamera', 'error');
                this.stopScan();
                return;
            }

            if (status.authorized) {
                QRScanner.show();
                document.body.style.background = 'transparent';

                QRScanner.scan((err, text) => {
                    if (err) {
                        Utils.toast('Gagal scan: ' + err.message, 'error');
                        this.stopScan();
                        return;
                    }

                    this.stopScan();
                    this.processQRCode(text);
                });
            } else {
                Utils.toast('Izin kamera ditolak', 'error');
                this.stopScan();
            }
        });
    },

    stopScan() {
        this.isScanning = false;

        // Stop web camera
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }

        // Cancel scan interval
        if (this.scanInterval) {
            cancelAnimationFrame(this.scanInterval);
            this.scanInterval = null;
        }

        // Stop Cordova scanner
        if (typeof QRScanner !== 'undefined') {
            QRScanner.hide();
            QRScanner.destroy();
        }

        document.body.style.background = '';
        this.render();
    },

    // Called from file/gallery selection
    handleScannedCode(qrCode) {
        this.processQRCode(qrCode);
    },

    async processQRCode(qrCode) {
        if (!qrCode) {
            Utils.toast('Kode QR tidak valid', 'error');
            return;
        }

        // Check if this is a WALLETPOINT-ORDER QR (from marketplace QRIS)
        if (qrCode.includes('WALLETPOINT-ORDER')) {
            this.processMarketplaceQRIS(qrCode);
            return;
        }

        Utils.showLoading('Memproses pembayaran...');

        try {
            const response = await Api.scanQR(qrCode);
            Utils.hideLoading();

            if (response.success) {
                this.showPaymentSuccess(response.data.transaction);
            }
        } catch (error) {
            Utils.hideLoading();

            let errorMsg = error.message || 'Pembayaran gagal';

            switch (error.code) {
                case 'QR_EXPIRED':
                    errorMsg = 'QR Code sudah expired (berlaku 10 menit)';
                    break;
                case 'QR_ALREADY_USED':
                    errorMsg = 'QR Code sudah digunakan sebelumnya';
                    break;
                case 'INSUFFICIENT_BALANCE':
                    errorMsg = 'Saldo tidak mencukupi untuk pembayaran ini';
                    break;
                case 'QR_NOT_FOUND':
                    errorMsg = 'QR Code tidak ditemukan dalam sistem';
                    break;
                case 'CANNOT_PAY_SELF':
                    errorMsg = 'Tidak bisa melakukan pembayaran ke diri sendiri';
                    break;
                case 'QR_INVALID_SIGNATURE':
                    errorMsg = 'QR Code tidak valid (signature error)';
                    break;
            }

            Utils.toast(errorMsg, 'error');
        }
    },

    // Process QRIS payment from marketplace
    processMarketplaceQRIS(qrCode) {
        // Check if there's a pending QRIS transaction
        const result = Pages.Marketplace.processScannedQRPayment(qrCode);

        if (!result.success) {
            Utils.toast(result.message, 'error');
            return;
        }

        // Show confirmation modal
        const pending = result.pending;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal text-center">
                <div class="modal-header">
                    <h3 class="modal-title">Konfirmasi Pembayaran</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div style="font-size: 64px; margin-bottom: 16px;">💳</div>
                
                <p class="text-muted mb-md">Anda akan membayar pesanan marketplace</p>
                
                <div style="font-size: 32px; font-weight: 700; color: var(--primary); margin-bottom: 16px;">
                    ${Utils.formatCurrency(pending.total)}
                </div>
                
                <div class="card mb-lg" style="text-align: left;">
                    <div class="flex justify-between mb-sm">
                        <span class="text-muted">Order ID</span>
                        <span style="font-size: 11px; font-family: monospace;">${pending.orderId.substr(0, 12)}...</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-muted">Jumlah Item</span>
                        <span>${pending.items?.length || 0} produk</span>
                    </div>
                </div>
                
                <div class="flex gap-md">
                    <button class="btn btn-secondary flex-1" onclick="this.closest('.modal-overlay').remove()">
                        Batal
                    </button>
                    <button class="btn btn-primary flex-1" onclick="Pages.Scan.confirmMarketplacePayment(); this.closest('.modal-overlay').remove();">
                        <i class="fas fa-check"></i> Bayar Sekarang
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    async confirmMarketplacePayment() {
        Utils.showLoading('Memproses pembayaran...');

        try {
            // Complete the marketplace payment
            Pages.Marketplace.manualConfirmPayment();
            Utils.hideLoading();

            // Show success after a delay
            setTimeout(() => {
                Router.navigate('/marketplace');
            }, 2000);
        } catch (error) {
            Utils.hideLoading();
            Utils.toast('Gagal memproses pembayaran: ' + error.message, 'error');
        }
    },

    showPaymentSuccess(tx) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal text-center">
                <div style="font-size: 80px; margin-bottom: 16px;">✅</div>
                <h2 class="mb-sm" style="color: var(--success);">Pembayaran Berhasil!</h2>
                <p class="text-muted mb-lg">Transaksi telah diproses</p>
                
                <div class="card mb-lg" style="text-align: left;">
                    <div class="flex justify-between mb-sm">
                        <span class="text-muted">Jumlah Dibayar</span>
                        <span class="text-danger" style="font-weight: 600;">-${Utils.formatCurrency(tx.amount)}</span>
                    </div>
                    <div class="flex justify-between mb-sm">
                        <span class="text-muted">Saldo Sekarang</span>
                        <span class="text-primary" style="font-weight: 600;">${Utils.formatCurrency(tx.balance_after)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-muted">ID Transaksi</span>
                        <span style="font-size: 11px; font-family: monospace;">${tx.transaction_id?.substr(0, 12)}...</span>
                    </div>
                </div>
                
                <div class="flex gap-md">
                    <button class="btn btn-secondary flex-1" onclick="this.closest('.modal-overlay').remove(); Pages.Scan.render();">
                        Scan Lagi
                    </button>
                    <button class="btn btn-primary flex-1" onclick="this.closest('.modal-overlay').remove(); Router.navigate('/dashboard')">
                        Dashboard
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }
};
