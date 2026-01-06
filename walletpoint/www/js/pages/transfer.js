/**
 * Transfer Page - P2P Point Transfer
 */
Pages.Transfer = {
    myQrCode: null,
    recipientInfo: null,

    async render() {
        const app = document.getElementById('app');
        const user = Auth.getUser();

        app.innerHTML = `
            <div class="page">
                ${Components.pageHeader('Transfer Poin', true)}
                
                <!-- Tab Navigation -->
                <div class="flex gap-sm mb-lg">
                    <button class="btn btn-sm flex-1 btn-primary" id="tab-send" onclick="Pages.Transfer.switchTab('send')">
                        <i class="fas fa-paper-plane"></i> Kirim
                    </button>
                    <button class="btn btn-sm flex-1 btn-secondary" id="tab-receive" onclick="Pages.Transfer.switchTab('receive')">
                        <i class="fas fa-qrcode"></i> Terima
                    </button>
                    <button class="btn btn-sm flex-1 btn-secondary" id="tab-history" onclick="Pages.Transfer.switchTab('history')">
                        <i class="fas fa-history"></i> Riwayat
                    </button>
                </div>
                
                <div id="transfer-content">
                    <!-- Content will be rendered here -->
                </div>
            </div>
            ${Components.tabBar('wallet')}
        `;

        Components.setupTabBar();
        this.renderSendTab();
    },

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('[id^="tab-"]').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        });
        document.getElementById(`tab-${tab}`)?.classList.remove('btn-secondary');
        document.getElementById(`tab-${tab}`)?.classList.add('btn-primary');

        if (tab === 'send') {
            this.renderSendTab();
        } else if (tab === 'receive') {
            this.renderReceiveTab();
        } else {
            this.renderHistoryTab();
        }
    },

    renderSendTab() {
        const content = document.getElementById('transfer-content');

        content.innerHTML = `
            <div class="card mb-lg" style="background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 150, 255, 0.1));">
                <div class="text-center mb-md">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                        <i class="fas fa-paper-plane" style="color: white; font-size: 24px;"></i>
                    </div>
                    <h3>Kirim Poin</h3>
                    <p class="text-muted" style="font-size: 13px;">Transfer poin ke pengguna lain</p>
                </div>
            </div>
            
            <!-- Transfer Method -->
            <div class="flex gap-sm mb-lg">
                <button class="btn btn-secondary flex-1" id="method-scan" onclick="Pages.Transfer.selectMethod('scan')" style="border: 2px solid var(--primary);">
                    <i class="fas fa-qrcode"></i><br>Scan QR
                </button>
                <button class="btn btn-secondary flex-1" id="method-manual" onclick="Pages.Transfer.selectMethod('manual')">
                    <i class="fas fa-keyboard"></i><br>Manual
                </button>
            </div>
            
            <div id="transfer-form-container">
                ${this.renderScanMethod()}
            </div>
        `;

        this.selectedMethod = 'scan';
    },

    selectMethod(method) {
        this.selectedMethod = method;

        // Update button styles
        document.getElementById('method-scan').style.border = method === 'scan' ? '2px solid var(--primary)' : '1px solid var(--card)';
        document.getElementById('method-manual').style.border = method === 'manual' ? '2px solid var(--primary)' : '1px solid var(--card)';

        const container = document.getElementById('transfer-form-container');
        if (method === 'scan') {
            container.innerHTML = this.renderScanMethod();
        } else {
            container.innerHTML = this.renderManualMethod();
        }
    },

    renderScanMethod() {
        return `
            <div class="card text-center" style="padding: 32px;">
                <button class="btn btn-primary btn-lg" onclick="Pages.Transfer.startScanRecipient()" style="padding: 20px 40px;">
                    <i class="fas fa-camera" style="font-size: 24px;"></i>
                    <br>
                    <span style="font-size: 16px; margin-top: 8px; display: block;">Scan QR Penerima</span>
                </button>
                <p class="text-muted mt-md" style="font-size: 12px;">
                    Arahkan kamera ke QR Code pengguna yang akan menerima poin
                </p>
            </div>
        `;
    },

    renderManualMethod() {
        return `
            <form id="manual-transfer-form" onsubmit="Pages.Transfer.findRecipient(event)">
                <div class="form-group">
                    <label class="form-label">Email atau NIM/NIP Penerima</label>
                    <input type="text" class="form-input" id="recipient-id" 
                           placeholder="Masukkan email atau NIM/NIP" required>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-search"></i> Cari Pengguna
                </button>
            </form>
            
            <div id="recipient-result" class="mt-lg"></div>
        `;
    },

    async findRecipient(e) {
        e.preventDefault();
        const recipientId = document.getElementById('recipient-id').value.trim();

        if (!recipientId) {
            Utils.toast('Masukkan email atau NIM/NIP', 'error');
            return;
        }

        Utils.showLoading('Mencari pengguna...');

        try {
            const response = await Api.request(`/users/find?q=${encodeURIComponent(recipientId)}`);

            Utils.hideLoading();

            if (response.success && response.data.user) {
                this.recipientInfo = response.data.user;
                this.showRecipientConfirm(response.data.user);
            } else {
                Utils.toast('Pengguna tidak ditemukan', 'error');
            }
        } catch (error) {
            Utils.hideLoading();
            Utils.toast('Pengguna tidak ditemukan atau server tidak tersedia', 'error');
        }
    },

    showRecipientConfirm(user) {
        const container = document.getElementById('recipient-result') || document.getElementById('transfer-form-container');

        const roleColors = { 'admin': '#ef4444', 'dosen': '#3b82f6', 'mahasiswa': '#10b981' };
        const roleLabels = { 'admin': 'Administrator', 'dosen': 'Dosen', 'mahasiswa': 'Mahasiswa' };

        container.innerHTML = `
            <div class="card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));">
                <div class="flex items-center gap-md mb-md">
                    <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, ${roleColors[user.role] || '#3b82f6'}, ${roleColors[user.role] || '#3b82f6'}99); display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-user" style="color: white; font-size: 24px;"></i>
                    </div>
                    <div class="flex-1">
                        <div style="font-weight: 600; font-size: 16px;">${Utils.escapeHtml(user.name)}</div>
                        <div class="text-muted" style="font-size: 13px;">${Utils.escapeHtml(user.email)}</div>
                        <span class="badge" style="background: ${roleColors[user.role]}; color: white; font-size: 10px; margin-top: 4px;">
                            ${roleLabels[user.role] || user.role}
                        </span>
                    </div>
                    <button class="btn btn-ghost btn-icon" onclick="Pages.Transfer.clearRecipient()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <form id="amount-form" class="mt-lg" onsubmit="Pages.Transfer.confirmTransfer(event)">
                <div class="form-group">
                    <label class="form-label">Jumlah Poin</label>
                    <input type="number" class="form-input" id="transfer-amount" 
                           placeholder="Masukkan jumlah poin" required min="1" style="font-size: 24px; text-align: center; font-weight: 600;">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Catatan (opsional)</label>
                    <input type="text" class="form-input" id="transfer-note" placeholder="Contoh: Bayar makan siang">
                </div>
                
                <button type="submit" class="btn btn-primary btn-block btn-lg mt-lg">
                    <i class="fas fa-paper-plane"></i> Kirim Poin
                </button>
            </form>
        `;
    },

    clearRecipient() {
        this.recipientInfo = null;
        this.selectMethod(this.selectedMethod);
    },

    async startScanRecipient() {
        // Use scan page functionality
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.id = 'qr-scanner-modal';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 class="modal-title">Scan QR Penerima</h3>
                    <button class="modal-close" onclick="Pages.Transfer.closeScanModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div id="scanner-container" style="position: relative; background: #000; border-radius: 12px; overflow: hidden; min-height: 300px;">
                    <video id="qr-video" style="width: 100%; height: auto;"></video>
                    <div class="scan-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 200px; height: 200px; border: 3px solid var(--primary); border-radius: 12px; position: relative;">
                            <div style="position: absolute; top: -3px; left: -3px; width: 20px; height: 20px; border-top: 4px solid var(--accent); border-left: 4px solid var(--accent); border-radius: 4px 0 0 0;"></div>
                            <div style="position: absolute; top: -3px; right: -3px; width: 20px; height: 20px; border-top: 4px solid var(--accent); border-right: 4px solid var(--accent); border-radius: 0 4px 0 0;"></div>
                            <div style="position: absolute; bottom: -3px; left: -3px; width: 20px; height: 20px; border-bottom: 4px solid var(--accent); border-left: 4px solid var(--accent); border-radius: 0 0 0 4px;"></div>
                            <div style="position: absolute; bottom: -3px; right: -3px; width: 20px; height: 20px; border-bottom: 4px solid var(--accent); border-right: 4px solid var(--accent); border-radius: 0 0 4px 0;"></div>
                        </div>
                    </div>
                </div>
                
                <p class="text-center text-muted mt-md" style="font-size: 12px;">
                    Arahkan kamera ke QR Code pengguna
                </p>
                
                <button class="btn btn-secondary btn-block mt-md" onclick="Pages.Transfer.closeScanModal()">
                    Batal
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Start camera (simplified for demo)
        this.startCamera();
    },

    async startCamera() {
        try {
            const video = document.getElementById('qr-video');
            if (!video) return;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            video.srcObject = stream;
            video.play();

            this.cameraStream = stream;

            // Simulate QR scan for demo after 3 seconds
            setTimeout(() => {
                if (document.getElementById('qr-scanner-modal')) {
                    this.handleScannedQR('WPUSER:user-demo:Demo User:demo@test.ac.id:mahasiswa');
                }
            }, 3000);

        } catch (error) {
            console.error('Camera error:', error);
            Utils.toast('Tidak dapat mengakses kamera', 'error');
        }
    },

    closeScanModal() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        document.getElementById('qr-scanner-modal')?.remove();
    },

    handleScannedQR(data) {
        this.closeScanModal();

        // Parse QR data format: WPUSER:id:name:email:role
        const parts = data.split(':');
        if (parts[0] === 'WPUSER' && parts.length >= 5) {
            const user = {
                id: parts[1],
                name: parts[2],
                email: parts[3],
                role: parts[4]
            };

            this.recipientInfo = user;

            // Update UI
            const container = document.getElementById('transfer-form-container');
            this.showRecipientConfirm(user);

            Utils.toast(`Penerima: ${user.name}`, 'success');
        } else {
            Utils.toast('QR Code tidak valid', 'error');
        }
    },

    async confirmTransfer(e) {
        e.preventDefault();

        const amount = parseInt(document.getElementById('transfer-amount').value);
        const note = document.getElementById('transfer-note')?.value || '';

        if (!this.recipientInfo) {
            Utils.toast('Pilih penerima terlebih dahulu', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            Utils.toast('Masukkan jumlah yang valid', 'error');
            return;
        }

        // Show confirmation modal
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 360px;">
                <div class="modal-header">
                    <h3 class="modal-title">Konfirmasi Transfer</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="text-center mb-lg">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <i class="fas fa-paper-plane" style="color: white; font-size: 32px;"></i>
                    </div>
                    
                    <div style="font-size: 32px; font-weight: 700; color: var(--primary);">
                        ${Utils.formatCurrency(amount)}
                    </div>
                    <p class="text-muted">Poin akan dikirim ke</p>
                    
                    <div class="card mt-md" style="text-align: left;">
                        <div style="font-weight: 600;">${Utils.escapeHtml(this.recipientInfo.name)}</div>
                        <div class="text-muted" style="font-size: 13px;">${Utils.escapeHtml(this.recipientInfo.email)}</div>
                        ${note ? `<div class="text-muted" style="font-size: 12px; margin-top: 8px;"><i class="fas fa-sticky-note"></i> ${Utils.escapeHtml(note)}</div>` : ''}
                    </div>
                </div>
                
                <div class="flex gap-sm">
                    <button class="btn btn-secondary flex-1" onclick="this.closest('.modal-overlay').remove()">
                        Batal
                    </button>
                    <button class="btn btn-primary flex-1" onclick="Pages.Transfer.executeTransfer(${amount}, '${Utils.escapeHtml(note)}')">
                        <i class="fas fa-check"></i> Kirim
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    async executeTransfer(amount, note) {
        // Close confirmation modal
        document.querySelector('.modal-overlay')?.remove();

        Utils.showLoading('Mengirim poin...');

        try {
            const response = await Api.request('/wallet/transfer', {
                method: 'POST',
                body: {
                    recipient_id: this.recipientInfo.id,
                    amount: amount,
                    note: note
                }
            });

            Utils.hideLoading();

            if (response.success) {
                this.saveTransferToHistory(amount, note, 'sent');
                this.showTransferSuccess(amount);
            } else {
                Utils.toast(response.message || 'Transfer gagal', 'error');
            }
        } catch (error) {
            Utils.hideLoading();
            Utils.toast('Gagal menghubungi server', 'error');
        }
    },

    saveTransferToHistory(amount, note, type) {
        const user = Auth.getUser();
        const history = Utils.storage.get('wp_transfer_history') || [];

        const transfer = {
            id: 'tf-' + Date.now(),
            type: type,
            amount: amount,
            recipient_name: type === 'sent' ? this.recipientInfo?.name : null,
            sender_name: type === 'received' ? this.recipientInfo?.name : null,
            created_at: new Date().toISOString(),
            note: note
        };

        history.unshift(transfer);

        // Keep only last 100 transfers
        if (history.length > 100) {
            history.splice(100);
        }

        Utils.storage.set('wp_transfer_history', history);
    },

    showTransferSuccess(amount) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 360px; text-align: center;">
                <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                    <i class="fas fa-check" style="color: white; font-size: 48px;"></i>
                </div>
                
                <h2 style="color: #10b981; margin-bottom: 8px;">Transfer Berhasil!</h2>
                
                <div style="font-size: 36px; font-weight: 700; color: var(--text); margin: 16px 0;">
                    ${Utils.formatCurrency(amount)}
                </div>
                
                <p class="text-muted">
                    Poin berhasil dikirim ke<br>
                    <strong>${Utils.escapeHtml(this.recipientInfo?.name || 'Penerima')}</strong>
                </p>
                
                <button class="btn btn-primary btn-block mt-lg" onclick="this.closest('.modal-overlay').remove(); Pages.Transfer.render();">
                    Selesai
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Clear recipient
        this.recipientInfo = null;
    },

    async renderReceiveTab() {
        const content = document.getElementById('transfer-content');
        const user = Auth.getUser();

        content.innerHTML = `
            <div class="card text-center" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));">
                <div style="margin-bottom: 16px;">
                    <i class="fas fa-qrcode" style="font-size: 24px; color: var(--accent);"></i>
                </div>
                <h3 class="mb-sm">QR Code Saya</h3>
                <p class="text-muted" style="font-size: 13px;">Tunjukkan QR ini untuk menerima poin</p>
            </div>
            
            <div class="card mt-lg text-center" style="padding: 24px;">
                <div id="my-qr-code" style="background: white; padding: 16px; border-radius: 12px; display: inline-block;">
                    ${this.generateQRCodeSVG(user)}
                </div>
                
                <div class="mt-md">
                    <p style="font-weight: 600; font-size: 18px;">${Utils.escapeHtml(user?.name || 'User')}</p>
                    <p class="text-muted" style="font-size: 13px;">${Utils.escapeHtml(user?.email || '')}</p>
                </div>
            </div>
            
            <button class="btn btn-secondary btn-block mt-lg" onclick="Pages.Transfer.shareQR()">
                <i class="fas fa-share-alt"></i> Bagikan QR Code
            </button>
        `;
    },

    generateQRCodeSVG(user) {
        // Generate a simple visual QR code representation
        // In production, use a proper QR library like qrcode.js
        const data = `WPUSER:${user?.id || 'unknown'}:${user?.name || 'User'}:${user?.email || ''}:${user?.role || 'mahasiswa'}`;

        // Create a simple pattern based on data hash
        const hash = this.simpleHash(data);
        const size = 200;
        const moduleCount = 21;
        const moduleSize = size / moduleCount;

        let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
        svg += `<rect width="${size}" height="${size}" fill="white"/>`;

        // Generate pattern
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                // Create finder patterns in corners
                const isFinderPattern =
                    (row < 7 && col < 7) ||
                    (row < 7 && col >= moduleCount - 7) ||
                    (row >= moduleCount - 7 && col < 7);

                const isFinderInner =
                    (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
                    (row >= 2 && row <= 4 && col >= moduleCount - 5 && col <= moduleCount - 3) ||
                    (row >= moduleCount - 5 && row <= moduleCount - 3 && col >= 2 && col <= 4);

                const isFinderBorder = isFinderPattern && (
                    row === 0 || row === 6 || col === 0 || col === 6 ||
                    (row < 7 && col >= moduleCount - 7 && (row === 0 || row === 6 || col === moduleCount - 7 || col === moduleCount - 1)) ||
                    (row >= moduleCount - 7 && col < 7 && (row === moduleCount - 7 || row === moduleCount - 1 || col === 0 || col === 6))
                );

                // Data pattern
                const dataPos = row * moduleCount + col;
                const isFilled = isFinderBorder || isFinderInner ||
                    (!isFinderPattern && ((hash >> (dataPos % 32)) & 1));

                if (isFilled) {
                    svg += `<rect x="${col * moduleSize}" y="${row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="#1a1a2e"/>`;
                }
            }
        }

        svg += '</svg>';
        return svg;
    },

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    },

    shareQR() {
        const user = Auth.getUser();
        const shareData = {
            title: 'QR Code WalletPoint',
            text: `Scan QR Code untuk mengirim poin ke ${user?.name}`,
        };

        if (navigator.share) {
            navigator.share(shareData);
        } else {
            Utils.toast('Fitur share tidak tersedia', 'info');
        }
    },

    async renderHistoryTab() {
        const content = document.getElementById('transfer-content');

        content.innerHTML = `
            <div class="text-center text-muted">
                <div class="spinner" style="margin: 20px auto;"></div>
                <p>Memuat riwayat transfer...</p>
            </div>
        `;

        // Load transfer history
        try {
            const response = await Api.request('/wallet/transfers');

            if (response.success) {
                this.renderTransferHistory(response.data.transfers || []);
            }
        } catch (error) {
            // Use localStorage history
            const storedHistory = Utils.storage.get('wp_transfer_history') || [];
            this.renderTransferHistory(storedHistory);
        }
    },

    renderTransferHistory(transfers) {
        const content = document.getElementById('transfer-content');

        if (!transfers || transfers.length === 0) {
            content.innerHTML = Components.emptyState('📤', 'Belum Ada Transfer', 'Riwayat transfer akan muncul di sini');
            return;
        }

        content.innerHTML = `
            <div class="list">
                ${transfers.map(tf => {
            const isSent = tf.type === 'sent';
            const icon = isSent ? 'fa-arrow-up' : 'fa-arrow-down';
            const color = isSent ? '#ef4444' : '#10b981';
            const bgColor = isSent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
            const personName = isSent ? tf.recipient_name : tf.sender_name;
            const prefix = isSent ? '-' : '+';

            return `
                        <div class="list-item">
                            <div class="list-item-icon" style="background: ${bgColor};">
                                <i class="fas ${icon}" style="color: ${color};"></i>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">${isSent ? 'Kirim ke' : 'Terima dari'} ${Utils.escapeHtml(personName || 'Unknown')}</div>
                                <div class="list-item-subtitle">${Utils.formatDateTime(tf.created_at)}</div>
                                ${tf.note ? `<div class="text-muted" style="font-size: 11px;"><i class="fas fa-sticky-note"></i> ${Utils.escapeHtml(tf.note)}</div>` : ''}
                            </div>
                            <div style="font-weight: 600; color: ${color};">
                                ${prefix}${Utils.formatCurrency(tf.amount)}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }
};
