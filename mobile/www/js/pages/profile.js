/**
 * WalletPoint - Profile Page
 */
const ProfilePage = {
    render(container) {
        const user = Storage.getUser();

        container.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar">
                    ${user?.full_name?.charAt(0) || '?'}
                </div>
                <div class="profile-name">${user?.full_name || 'User'}</div>
                <div class="profile-role">${this.getRoleLabel(user?.role)}</div>
            </div>
            
            <div class="profile-menu">
                <div class="menu-item" onclick="ProfilePage.showAccountInfo()">
                    <div class="menu-icon">👤</div>
                    <div class="menu-label">Informasi Akun</div>
                    <div class="menu-arrow">›</div>
                </div>
                
                <div class="menu-item" onclick="ProfilePage.showChangePassword()">
                    <div class="menu-icon">🔒</div>
                    <div class="menu-label">Ubah Password</div>
                    <div class="menu-arrow">›</div>
                </div>
                
                <div class="menu-item" onclick="Router.navigate('wallet')">
                    <div class="menu-icon">📋</div>
                    <div class="menu-label">Riwayat Transaksi</div>
                    <div class="menu-arrow">›</div>
                </div>
                
                ${user?.role === Config.ROLES.DOSEN ? `
                    <div class="menu-item" onclick="ProfilePage.showMyProducts()">
                        <div class="menu-icon">📦</div>
                        <div class="menu-label">Produk Saya</div>
                        <div class="menu-arrow">›</div>
                    </div>
                    
                    <div class="menu-item" onclick="ProfilePage.showMyQRs()">
                        <div class="menu-icon">📱</div>
                        <div class="menu-label">QR Code Saya</div>
                        <div class="menu-arrow">›</div>
                    </div>
                ` : ''}
                
                <div class="menu-item" onclick="ProfilePage.showAbout()">
                    <div class="menu-icon">ℹ️</div>
                    <div class="menu-label">Tentang Aplikasi</div>
                    <div class="menu-arrow">›</div>
                </div>
                
                <div class="menu-item" onclick="ProfilePage.confirmLogout()" style="border-color: var(--danger);">
                    <div class="menu-icon">🚪</div>
                    <div class="menu-label" style="color: var(--danger);">Keluar</div>
                    <div class="menu-arrow" style="color: var(--danger);">›</div>
                </div>
            </div>
            
            <div class="text-center text-muted mt-lg mb-lg">
                <small>WalletPoint v${Config.VERSION}</small>
            </div>
        `;
    },

    getRoleLabel(role) {
        const labels = {
            'admin': 'Administrator',
            'dosen': 'Dosen',
            'mahasiswa': 'Mahasiswa'
        };
        return labels[role] || role;
    },

    showAccountInfo() {
        const user = Storage.getUser();
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Informasi Akun</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <div class="list">
                <div class="flex-between mb-md">
                    <span class="text-muted">Username</span>
                    <span>${user?.username || '-'}</span>
                </div>
                <div class="flex-between mb-md">
                    <span class="text-muted">Email</span>
                    <span>${user?.email || '-'}</span>
                </div>
                <div class="flex-between mb-md">
                    <span class="text-muted">Nama Lengkap</span>
                    <span>${user?.full_name || '-'}</span>
                </div>
                <div class="flex-between mb-md">
                    <span class="text-muted">NIM/NIP</span>
                    <span>${user?.nim_nip || '-'}</span>
                </div>
                <div class="flex-between mb-md">
                    <span class="text-muted">Role</span>
                    <span>${this.getRoleLabel(user?.role)}</span>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    },

    showChangePassword() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Ubah Password</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <form id="change-password-form">
                ${Components.formInput('current_password', 'Password Saat Ini', 'password', 'Masukkan password saat ini')}
                ${Components.formInput('new_password', 'Password Baru', 'password', 'Masukkan password baru')}
                ${Components.formInput('confirm_password', 'Konfirmasi Password', 'password', 'Ulangi password baru')}
                
                <div id="password-error" class="form-error mb-md hidden"></div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    Simpan
                </button>
            </form>
        `;

        modal.classList.remove('hidden');

        document.getElementById('change-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.changePassword();
        });
    },

    async changePassword() {
        const currentPassword = document.getElementById('current_password').value;
        const newPassword = document.getElementById('new_password').value;
        const confirmPassword = document.getElementById('confirm_password').value;
        const errorDiv = document.getElementById('password-error');

        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'Password baru tidak cocok';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (newPassword.length < 8) {
            errorDiv.textContent = 'Password minimal 8 karakter';
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            const result = await API.changePassword(currentPassword, newPassword);
            if (result.success) {
                App.closeModal();
                App.showToast('Password berhasil diubah', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            errorDiv.textContent = e.response?.message || 'Gagal mengubah password';
            errorDiv.classList.remove('hidden');
        }
    },

    async showMyQRs() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">QR Code Saya</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="text-center p-md">
                <div class="loading-spinner" style="margin: 0 auto;"></div>
            </div>
        `;

        modal.classList.remove('hidden');

        try {
            const result = await API.getMyQRs(1, 20);

            if (result.success && result.data?.length > 0) {
                content.innerHTML = `
                    <div class="modal-header">
                        <h3 class="modal-title">QR Code Saya</h3>
                        <button class="modal-close" onclick="App.closeModal()">×</button>
                    </div>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${result.data.map(qr => `
                            <div class="card mb-sm">
                                <div class="flex-between">
                                    <div>
                                        <strong>${Components.formatPoints(qr.amount)} pts</strong>
                                        ${qr.description ? `<div class="text-muted text-sm">${qr.description}</div>` : ''}
                                    </div>
                                    ${Components.badge(this.getQRStatusLabel(qr.status), this.getQRStatusType(qr.status))}
                                </div>
                                <div class="text-muted text-sm mt-sm">
                                    Dibuat: ${Components.formatRelativeTime(qr.created_at)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <div class="modal-header">
                        <h3 class="modal-title">QR Code Saya</h3>
                        <button class="modal-close" onclick="App.closeModal()">×</button>
                    </div>
                    ${Components.emptyState('📱', 'Belum ada QR', 'Buat QR code di halaman Wallet')}
                `;
            }
        } catch (e) {
            content.innerHTML = `
                <div class="modal-header">
                    <h3 class="modal-title">QR Code Saya</h3>
                    <button class="modal-close" onclick="App.closeModal()">×</button>
                </div>
                ${Components.emptyState('❌', 'Gagal Memuat', 'Tidak dapat memuat daftar QR')}
            `;
        }
    },

    getQRStatusLabel(status) {
        const labels = {
            'ACTIVE': 'Aktif',
            'USED': 'Terpakai',
            'EXPIRED': 'Kadaluarsa',
            'CANCELLED': 'Dibatalkan'
        };
        return labels[status] || status;
    },

    getQRStatusType(status) {
        const types = {
            'ACTIVE': 'success',
            'USED': 'primary',
            'EXPIRED': 'warning',
            'CANCELLED': 'danger'
        };
        return types[status] || 'primary';
    },

    showMyProducts() {
        App.showToast('Fitur akan segera tersedia', 'info');
    },

    showAbout() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Tentang Aplikasi</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <div class="text-center mb-lg">
                <div style="font-size: 64px;">💰</div>
                <h2 class="mt-md">WalletPoint</h2>
                <p class="text-muted">v${Config.VERSION}</p>
            </div>
            
            <p class="mb-md">
                WalletPoint adalah platform poin berbasis gamifikasi untuk pembelajaran di kampus. 
                Kumpulkan poin dengan menyelesaikan misi dan tukar dengan produk digital.
            </p>
            
            <div class="card">
                <h4 class="mb-sm">Fitur Utama:</h4>
                <ul style="list-style: none;">
                    <li>🎯 Ikuti misi dan kuis</li>
                    <li>💰 Kumpulkan poin reward</li>
                    <li>📱 Pembayaran via QR Code</li>
                    <li>🛒 Belanja di marketplace digital</li>
                </ul>
            </div>
        `;

        modal.classList.remove('hidden');
    },

    confirmLogout() {
        if (confirm('Yakin ingin keluar dari akun?')) {
            this.logout();
        }
    },

    async logout() {
        try {
            await API.logout();
        } catch (e) {
            // Ignore errors
        }

        Storage.clearAuth();
        App.showToast('Berhasil keluar', 'success');
        Router.navigate('login');
    }
};
