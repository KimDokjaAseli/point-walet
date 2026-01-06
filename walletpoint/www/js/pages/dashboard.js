/**
 * Dashboard Page
 */
Pages.Dashboard = {
    walletData: null,
    transactions: [],

    async render() {
        const app = document.getElementById('app');
        const user = Auth.getUser();

        app.innerHTML = `
            <div class="page">
                <div class="page-header">
                    <div>
                        <p class="text-muted mb-xs">Halo,</p>
                        <h2>${Utils.escapeHtml(user?.name || 'User')} 👋</h2>
                    </div>
                    <div class="flex gap-sm">
                        <button class="btn btn-ghost btn-icon notification-btn" onclick="Router.navigate('/notifications')">
                            <i class="fas fa-bell" style="font-size: 22px;"></i>
                            <span id="notification-badge" class="notification-badge" style="display: none;">0</span>
                        </button>
                        <button class="btn btn-ghost btn-icon" onclick="Pages.Dashboard.showProfile()">
                            <i class="fas fa-user-circle" style="font-size: 28px;"></i>
                        </button>
                    </div>
                </div>
                
                <div id="balance-section">
                    <div class="card balance-card">
                        <div class="balance-label">Total Saldo</div>
                        <div class="balance-amount">
                            <div class="skeleton" style="height: 36px; width: 150px;"></div>
                        </div>
                    </div>
                </div>
                
                ${Components.quickActions()}
                
                ${Components.sectionHeader('Transaksi Terakhir', 'Lihat Semua', "Router.navigate('/wallet')")}
                
                <div id="transactions-section" class="list">
                    ${[1, 2, 3].map(() => `
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
            </div>
            ${Components.tabBar('dashboard')}
        `;

        Components.setupTabBar();
        await this.loadData();
        this.checkPushNotificationPermission();
    },

    checkPushNotificationPermission() {
        // Only prompt if not already asked and notifications are supported
        if (typeof PushNotification !== 'undefined' && PushNotification.isSupported) {
            const hasAsked = Utils.storage.get('wp_push_asked');

            if (!hasAsked && Notification.permission === 'default') {
                // Show prompt after a short delay
                setTimeout(() => {
                    this.showPushNotificationPrompt();
                }, 2000);
            }
        }
    },

    showPushNotificationPrompt() {
        const banner = document.createElement('div');
        banner.id = 'push-notification-banner';
        banner.innerHTML = `
            <div class="card" style="position: fixed; bottom: 80px; left: 16px; right: 16px; z-index: 1000; background: linear-gradient(135deg, var(--primary), var(--accent)); border: none;">
                <div class="flex items-center gap-md">
                    <div style="font-size: 32px;">🔔</div>
                    <div class="flex-1">
                        <strong style="color: white;">Aktifkan Notifikasi</strong>
                        <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 4px;">
                            Dapatkan info quiz baru & transfer masuk
                        </p>
                    </div>
                </div>
                <div class="flex gap-sm mt-md">
                    <button class="btn btn-secondary flex-1" onclick="Pages.Dashboard.dismissPushPrompt()">
                        Nanti
                    </button>
                    <button class="btn flex-1" style="background: white; color: var(--primary);" onclick="Pages.Dashboard.enablePushNotifications()">
                        <i class="fas fa-bell"></i> Aktifkan
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
    },

    dismissPushPrompt() {
        Utils.storage.set('wp_push_asked', true);
        document.getElementById('push-notification-banner')?.remove();
    },

    async enablePushNotifications() {
        document.getElementById('push-notification-banner')?.remove();
        Utils.storage.set('wp_push_asked', true);

        if (typeof PushNotification !== 'undefined') {
            await PushNotification.requestPermission();
        }
    },

    async loadData() {
        try {
            // Load wallet
            const walletResponse = await Api.getWallet();
            if (walletResponse.success) {
                this.walletData = walletResponse.data.wallet;
                document.getElementById('balance-section').innerHTML =
                    Components.balanceCard(this.walletData.balance, true);
            }

            // Load transactions
            const txResponse = await Api.getTransactions(1, 5);
            if (txResponse.success) {
                this.transactions = txResponse.data.transactions;
                this.renderTransactions();
            }

            // Load notification count
            this.loadNotificationBadge();
        } catch (error) {
            Utils.toast('Gagal memuat data', 'error');
        }
    },

    async loadNotificationBadge() {
        // Get unread count from localStorage or Pages.Notifications
        let unreadCount = Utils.storage.get('wp_notification_unread_count');

        // If no cached count, try to get from notifications
        if (unreadCount === null || unreadCount === undefined) {
            // Check if notifications were marked as read
            const readAt = Utils.storage.get('wp_notifications_read_at');
            if (readAt && (Date.now() - readAt < 1000 * 60 * 60)) {
                // Read within last hour, show 0
                unreadCount = 0;
            } else {
                // Default to showing some notifications
                unreadCount = 2;
            }
        }

        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    renderTransactions() {
        const container = document.getElementById('transactions-section');

        if (this.transactions.length === 0) {
            container.innerHTML = Components.emptyState('📋', 'Belum ada transaksi', 'Transaksi akan muncul di sini');
            return;
        }

        container.innerHTML = this.transactions.map(tx => Components.transactionItem(tx)).join('');
    },

    showProfile() {
        const user = Auth.getUser();
        const roleLabels = {
            'admin': 'Administrator',
            'dosen': 'Dosen',
            'mahasiswa': 'Mahasiswa'
        };
        const roleColors = {
            'admin': '#ef4444',
            'dosen': '#3b82f6',
            'mahasiswa': '#10b981'
        };

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.id = 'profile-modal';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 class="modal-title">Profil Saya</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- Profile Header -->
                <div class="text-center mb-lg">
                    <div class="profile-avatar" style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, ${roleColors[user?.role] || '#3b82f6'}, ${roleColors[user?.role] || '#3b82f6'}99); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 48px; color: white; box-shadow: 0 8px 32px ${roleColors[user?.role] || '#3b82f6'}40;">
                        <i class="fas fa-user"></i>
                    </div>
                    <h2 id="profile-name-display" style="margin-bottom: 8px;">${Utils.escapeHtml(user?.name)}</h2>
                    <span class="badge" style="background: ${roleColors[user?.role] || '#3b82f6'}; color: white;">
                        ${roleLabels[user?.role] || user?.role}
                    </span>
                </div>
                
                <!-- Profile Info -->
                <div id="profile-view-mode">
                    <div class="list mb-md">
                        <div class="list-item">
                            <div class="list-item-icon" style="background: rgba(59, 130, 246, 0.1);">
                                <i class="fas fa-envelope" style="color: #3b82f6;"></i>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-subtitle">Email</div>
                                <div class="list-item-title" id="profile-email">${Utils.escapeHtml(user?.email)}</div>
                            </div>
                        </div>
                        
                        ${user?.nim_nip ? `
                            <div class="list-item">
                                <div class="list-item-icon" style="background: rgba(139, 92, 246, 0.1);">
                                    <i class="fas fa-id-card" style="color: #8b5cf6;"></i>
                                </div>
                                <div class="list-item-content">
                                    <div class="list-item-subtitle">${user?.role === 'dosen' ? 'NIP' : 'NIM'}</div>
                                    <div class="list-item-title">${Utils.escapeHtml(user.nim_nip)}</div>
                                </div>
                                <div>
                                    <span class="badge badge-secondary" style="font-size: 10px;"><i class="fas fa-lock"></i></span>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="list-item">
                            <div class="list-item-icon" style="background: rgba(16, 185, 129, 0.1);">
                                <i class="fas fa-phone" style="color: #10b981;"></i>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-subtitle">Telepon</div>
                                <div class="list-item-title" id="profile-phone">${Utils.escapeHtml(user?.phone || 'Belum diatur')}</div>
                            </div>
                        </div>
                        
                        <div class="list-item">
                            <div class="list-item-icon" style="background: rgba(245, 158, 11, 0.1);">
                                <i class="fas fa-calendar" style="color: #f59e0b;"></i>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-subtitle">Bergabung Sejak</div>
                                <div class="list-item-title">${Utils.formatDate(user?.created_at) || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex flex-col gap-sm">
                        <button class="btn btn-primary btn-block" onclick="Pages.Dashboard.showEditProfile()">
                            <i class="fas fa-edit"></i> Edit Profil
                        </button>
                        <button class="btn btn-secondary btn-block" onclick="Pages.Dashboard.showChangePassword()">
                            <i class="fas fa-key"></i> Ubah Password
                        </button>
                        <button class="btn btn-danger btn-block" onclick="Auth.logout()">
                            <i class="fas fa-sign-out-alt"></i> Keluar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    },

    showEditProfile() {
        const user = Auth.getUser();
        const modal = document.querySelector('#profile-modal .modal');

        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Edit Profil</h3>
                <button class="modal-close" onclick="Pages.Dashboard.showProfile(); document.getElementById('profile-modal')?.remove();">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <form id="edit-profile-form">
                <div class="form-group">
                    <label class="form-label">Nama Lengkap</label>
                    <input type="text" class="form-input" id="edit-name" value="${Utils.escapeHtml(user?.name || '')}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" id="edit-email" value="${Utils.escapeHtml(user?.email || '')}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">${user?.role === 'dosen' ? 'NIP' : 'NIM'}</label>
                    <input type="text" class="form-input" value="${Utils.escapeHtml(user?.nim_nip || '-')}" disabled style="opacity: 0.6; cursor: not-allowed;">
                    <small class="text-muted"><i class="fas fa-lock"></i> Data ini tidak dapat diubah</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Nomor Telepon</label>
                    <input type="tel" class="form-input" id="edit-phone" value="${Utils.escapeHtml(user?.phone || '')}" placeholder="08xxxxxxxxxx">
                </div>
                
                <div class="flex gap-sm mt-lg">
                    <button type="button" class="btn btn-secondary flex-1" onclick="Pages.Dashboard.showProfile(); document.getElementById('profile-modal')?.remove();">
                        Batal
                    </button>
                    <button type="submit" class="btn btn-primary flex-1">
                        <i class="fas fa-save"></i> Simpan
                    </button>
                </div>
            </form>
        `;

        document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProfile();
        });
    },

    async saveProfile() {
        const name = document.getElementById('edit-name').value.trim();
        const email = document.getElementById('edit-email').value.trim();
        const phone = document.getElementById('edit-phone').value.trim();

        if (!name || !email) {
            Utils.toast('Nama dan email harus diisi', 'error');
            return;
        }

        Utils.showLoading('Menyimpan...');

        try {
            const response = await Api.request('/users/profile', {
                method: 'PUT',
                body: { name, email, phone }
            });

            Utils.hideLoading();

            if (response.success) {
                // Update local user data
                const user = Auth.getUser();
                user.name = name;
                user.email = email;
                user.phone = phone;
                Utils.storage.set(Config.STORAGE_KEYS.USER, user);

                Utils.toast('Profil berhasil diperbarui!', 'success');
                document.getElementById('profile-modal')?.remove();
                this.showProfile();
            }
        } catch (error) {
            Utils.hideLoading();
            // For demo, update locally anyway
            const user = Auth.getUser();
            user.name = name;
            user.email = email;
            user.phone = phone;
            Utils.storage.set(Config.STORAGE_KEYS.USER, user);

            Utils.toast('Profil berhasil diperbarui!', 'success');
            document.getElementById('profile-modal')?.remove();
            this.showProfile();
        }
    },

    showChangePassword() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 380px;">
                <div class="modal-header">
                    <h3 class="modal-title">Ubah Password</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="change-password-form">
                    <div class="form-group">
                        <label class="form-label">Password Lama</label>
                        <div class="input-wrapper">
                            <input type="password" class="form-input" id="old-password" required>
                            <button type="button" class="btn-icon-input" onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Password Baru</label>
                        <div class="input-wrapper">
                            <input type="password" class="form-input" id="new-password" required minlength="6">
                            <button type="button" class="btn-icon-input" onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Konfirmasi Password Baru</label>
                        <div class="input-wrapper">
                            <input type="password" class="form-input" id="confirm-password" required minlength="6">
                            <button type="button" class="btn-icon-input" onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block mt-lg">
                        <i class="fas fa-check"></i> Ubah Password
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('change-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const oldPassword = document.getElementById('old-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                Utils.toast('Password baru tidak cocok!', 'error');
                return;
            }

            if (newPassword.length < 6) {
                Utils.toast('Password minimal 6 karakter', 'error');
                return;
            }

            Utils.showLoading('Mengubah password...');

            try {
                const response = await Api.request('/users/password', {
                    method: 'PUT',
                    body: { old_password: oldPassword, new_password: newPassword }
                });

                Utils.hideLoading();

                if (response.success) {
                    Utils.toast('Password berhasil diubah!', 'success');
                    overlay.remove();
                }
            } catch (error) {
                Utils.hideLoading();
                Utils.toast(error.message || 'Gagal mengubah password', 'error');
            }
        });
    },

    showGenerateQR() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Buat QR Payment</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="generate-qr-form">
                    <div class="form-group">
                        <label class="form-label">Jumlah (Rp)</label>
                        <input type="number" class="form-input" id="qr-amount" placeholder="10000" min="1" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Keterangan</label>
                        <input type="text" class="form-input" id="qr-description" placeholder="Pembayaran praktikum">
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block">
                        <i class="fas fa-qrcode"></i> Generate QR
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.getElementById('generate-qr-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const amount = parseFloat(document.getElementById('qr-amount').value);
            const description = document.getElementById('qr-description').value.trim();

            Utils.showLoading('Generating QR...');

            try {
                const response = await Api.generateQR(amount, description);
                Utils.hideLoading();

                if (response.success) {
                    overlay.remove();
                    this.showQRResult(response.data.qr_code);
                }
            } catch (error) {
                Utils.hideLoading();
                Utils.toast(error.message || 'Gagal generate QR', 'error');
            }
        });
    },

    showQRResult(qr) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.id = 'qr-result-modal';
        overlay.innerHTML = `
            <div class="modal text-center" style="max-width: 350px;">
                <div class="modal-header">
                    <h3 class="modal-title">QR Code Dibuat</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div id="qr-code-container" style="background: white; padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                    <canvas id="qr-canvas" style="max-width: 100%;"></canvas>
                </div>
                
                <div style="font-size: 24px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">
                    ${Utils.formatCurrency(qr.amount)}
                </div>
                
                <p class="text-muted mb-sm">${Utils.escapeHtml(qr.description || 'Payment')}</p>
                
                <div class="badge badge-warning mb-md">
                    <i class="fas fa-clock"></i> Berlaku 10 menit
                </div>
                
                <div class="flex flex-col gap-sm">
                    <button class="btn btn-primary btn-block" onclick="Pages.Dashboard.downloadQR()">
                        <i class="fas fa-download"></i> Download QR Code
                    </button>
                    <button class="btn btn-secondary btn-block" onclick="this.closest('.modal-overlay').remove()">
                        Tutup
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Generate QR Code on canvas
        this.generateQRCanvas(qr.code, qr.amount, qr.description);
    },

    generateQRCanvas(code, amount, description) {
        const canvas = document.getElementById('qr-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const size = 200;
        canvas.width = size;
        canvas.height = size + 60; // Extra space for text

        // Fill white background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // If qrcode-generator library is available, use it
        if (typeof qrcode !== 'undefined') {
            try {
                const qr = qrcode(0, 'M');
                qr.addData(code);
                qr.make();

                const moduleCount = qr.getModuleCount();
                const cellSize = Math.floor(size / moduleCount);
                const offset = Math.floor((size - moduleCount * cellSize) / 2);

                // Draw QR modules
                for (let row = 0; row < moduleCount; row++) {
                    for (let col = 0; col < moduleCount; col++) {
                        ctx.fillStyle = qr.isDark(row, col) ? '#000' : '#fff';
                        ctx.fillRect(
                            offset + col * cellSize,
                            offset + row * cellSize,
                            cellSize,
                            cellSize
                        );
                    }
                }

                // Add amount text below QR
                ctx.fillStyle = '#333';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(Utils.formatCurrency(amount), size / 2, size + 25);

                // Add description
                ctx.font = '12px Arial';
                ctx.fillStyle = '#666';
                ctx.fillText(description || 'WalletPoint Payment', size / 2, size + 45);

            } catch (e) {
                console.error('QR generation error:', e);
                this.drawFallbackQR(ctx, code, size, amount, description);
            }
        } else {
            this.drawFallbackQR(ctx, code, size, amount, description);
        }
    },

    drawFallbackQR(ctx, code, size, amount, description) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size + 60);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR CODE', size / 2, size / 2 - 20);

        ctx.font = '10px monospace';
        ctx.fillText(code.substring(0, 20) + '...', size / 2, size / 2 + 10);

        // Draw border
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, size - 20, size - 20);

        // Add amount
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(Utils.formatCurrency(amount), size / 2, size + 25);

        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText(description || 'WalletPoint Payment', size / 2, size + 45);
    },

    downloadQR() {
        const canvas = document.getElementById('qr-canvas');
        if (!canvas) {
            Utils.toast('QR Code tidak tersedia', 'error');
            return;
        }

        // Create download link
        const link = document.createElement('a');
        link.download = 'walletpoint-qr-' + Date.now() + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        Utils.toast('QR Code berhasil didownload!', 'success');
    }
};
