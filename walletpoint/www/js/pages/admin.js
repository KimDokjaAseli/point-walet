/**
 * Admin Dashboard Page - Enhanced Version
 */
Pages.Admin = {
    activeTab: 'dashboard',
    users: [],

    async render() {
        const user = Auth.getUser();
        console.log('[Admin Panel] Current user:', user);
        console.log('[Admin Panel] Is admin:', Auth.isAdmin());

        if (!Auth.isAdmin()) {
            Utils.toast('Akses ditolak - Anda bukan Admin', 'error');
            Router.navigate('/dashboard');
            return;
        }

        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="admin-container">
                <div class="admin-sidebar">
                    <div class="admin-logo">
                        <span>💰</span> WalletPoint
                        <small>Admin Panel</small>
                    </div>
                    <nav class="admin-nav">
                        <button class="admin-nav-item ${this.activeTab === 'dashboard' ? 'active' : ''}" onclick="Pages.Admin.switchTab('dashboard')">
                            <i class="fas fa-chart-line"></i> <span>Dashboard</span>
                        </button>
                        <button class="admin-nav-item ${this.activeTab === 'users' ? 'active' : ''}" onclick="Pages.Admin.switchTab('users')">
                            <i class="fas fa-users"></i> <span>Users</span>
                        </button>
                        <button class="admin-nav-item ${this.activeTab === 'transactions' ? 'active' : ''}" onclick="Pages.Admin.switchTab('transactions')">
                            <i class="fas fa-exchange-alt"></i> <span>Transaksi</span>
                        </button>
                        <button class="admin-nav-item ${this.activeTab === 'products' ? 'active' : ''}" onclick="Pages.Admin.switchTab('products')">
                            <i class="fas fa-box"></i> <span>Produk</span>
                        </button>
                        <button class="admin-nav-item ${this.activeTab === 'missions' ? 'active' : ''}" onclick="Pages.Admin.switchTab('missions')">
                            <i class="fas fa-trophy"></i> <span>Misi</span>
                        </button>
                        <button class="admin-nav-item ${this.activeTab === 'topup' ? 'active' : ''}" onclick="Pages.Admin.switchTab('topup')">
                            <i class="fas fa-plus-circle"></i> <span>Top-up</span>
                        </button>
                        <button class="admin-nav-item ${this.activeTab === 'audit' ? 'active' : ''}" onclick="Pages.Admin.switchTab('audit')">
                            <i class="fas fa-clipboard-list"></i> <span>Audit Log</span>
                        </button>
                        <button class="admin-nav-item ${this.activeTab === 'reports' ? 'active' : ''}" onclick="Pages.Admin.switchTab('reports')">
                            <i class="fas fa-chart-bar"></i> <span>Laporan</span>
                        </button>
                    </nav>
                    <button class="btn btn-danger btn-block" style="margin-top:auto;" onclick="Auth.logout()">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
                <div class="admin-content" id="admin-content">
                    <div class="text-center"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        await this.loadTab();
    },

    async switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
        const idx = ['dashboard', 'users', 'transactions', 'products', 'missions', 'topup', 'audit', 'reports'].indexOf(tab);
        document.querySelectorAll('.admin-nav-item')[idx]?.classList.add('active');
        await this.loadTab();
    },

    async loadTab() {
        const content = document.getElementById('admin-content');
        content.innerHTML = '<div class="text-center p-lg"><div class="spinner"></div></div>';

        switch (this.activeTab) {
            case 'dashboard': await this.renderDashboard(); break;
            case 'users': await this.renderUsers(); break;
            case 'transactions': await this.renderTransactions(); break;
            case 'products': await this.renderProducts(); break;
            case 'missions': await this.renderMissions(); break;
            case 'topup': await this.renderTopup(); break;
            case 'audit': await this.renderAudit(); break;
            case 'reports': await this.renderReports(); break;
        }
    },

    // ============ DASHBOARD ============
    async renderDashboard() {
        const content = document.getElementById('admin-content');
        try {
            const [usersRes, statsRes, productsRes] = await Promise.all([
                Api.request('/users').catch(() => ({ data: { users: [] } })),
                Api.request('/admin/stats').catch(() => ({ data: {} })),
                Api.getProducts(1, 100).catch(() => ({ data: { products: [] } }))
            ]);

            const users = usersRes?.data?.users || [];
            const stats = statsRes?.data || {};
            const products = productsRes?.data?.products || [];

            const totalUsers = users.length;
            const totalDosen = users.filter(u => u.role === 'dosen').length;
            const totalMhs = users.filter(u => u.role === 'mahasiswa').length;

            content.innerHTML = `
                <h2 class="admin-title">Dashboard Overview</h2>
                <div class="stats-grid">
                    <div class="stat-card" onclick="Pages.Admin.switchTab('users')" style="cursor:pointer;">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${totalUsers}</div>
                            <div class="stat-label">Total Users</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c);">
                            <i class="fas fa-chalkboard-teacher"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${totalDosen}</div>
                            <div class="stat-label">Dosen</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe);">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${totalMhs}</div>
                            <div class="stat-label">Mahasiswa</div>
                        </div>
                    </div>
                    <div class="stat-card" onclick="Pages.Admin.switchTab('products')" style="cursor:pointer;">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7);">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${products.length}</div>
                            <div class="stat-label">Total Produk</div>
                        </div>
                    </div>
                </div>
                
                <div class="flex gap-lg mt-lg" style="flex-wrap:wrap;">
                    <div class="card flex-1" style="min-width:300px;">
                        <h3 class="mb-md"><i class="fas fa-users"></i> User Terbaru</h3>
                        <div class="list">
                            ${users.slice(0, 5).map(u => `
                                <div class="list-item" onclick="Pages.Admin.viewUser('${u.id}')" style="cursor:pointer;">
                                    <div class="list-item-icon" style="background:${u.role === 'dosen' ? '#f5576c' : '#4facfe'};">
                                        <i class="fas fa-${u.role === 'dosen' ? 'chalkboard-teacher' : 'user-graduate'}" style="color:white;"></i>
                                    </div>
                                    <div class="list-item-content">
                                        <div class="list-item-title">${Utils.escapeHtml(u.name)}</div>
                                        <div class="list-item-subtitle">${u.role} • ${Utils.formatDate(u.created_at)}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="card flex-1" style="min-width:300px;">
                        <h3 class="mb-md"><i class="fas fa-bolt"></i> Quick Actions</h3>
                        <div class="flex flex-column gap-sm">
                            <button class="btn btn-primary btn-block" onclick="Pages.Admin.switchTab('topup')">
                                <i class="fas fa-plus-circle"></i> Top-up User
                            </button>
                            <button class="btn btn-secondary btn-block" onclick="Pages.Admin.showUserForm()">
                                <i class="fas fa-user-plus"></i> Tambah User
                            </button>
                            <button class="btn btn-secondary btn-block" onclick="Pages.Admin.showMissionForm()">
                                <i class="fas fa-trophy"></i> Buat Misi
                            </button>
                            <button class="btn btn-secondary btn-block" onclick="Pages.Admin.showProductForm()">
                                <i class="fas fa-box"></i> Tambah Produk
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } catch (e) {
            content.innerHTML = `<div class="text-center text-danger">Error: ${e.message}</div>`;
        }
    },

    // ============ USERS ============
    async renderUsers() {
        const content = document.getElementById('admin-content');
        try {
            const res = await Api.request('/users');
            this.users = res?.data?.users || [];

            content.innerHTML = `
                <div class="flex justify-between items-center mb-lg flex-wrap gap-md">
                    <h2 class="admin-title" style="margin:0;">User Management</h2>
                    <div class="flex gap-sm">
                        <input type="text" class="form-input" id="user-search" placeholder="Cari user..." style="width:200px;" onkeyup="Pages.Admin.filterUsers()">
                        <select class="form-input" id="user-role-filter" style="width:120px;" onchange="Pages.Admin.filterUsers()">
                            <option value="">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="dosen">Dosen</option>
                            <option value="mahasiswa">Mahasiswa</option>
                        </select>
                        <button class="btn btn-primary" onclick="Pages.Admin.showUserForm()">
                            <i class="fas fa-plus"></i> Tambah
                        </button>
                    </div>
                </div>
                <div class="card">
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead><tr><th>Nama</th><th>Email</th><th>NIM/NIP</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead>
                            <tbody id="users-tbody"></tbody>
                        </table>
                    </div>
                </div>
            `;
            this.filterUsers();
        } catch (e) {
            content.innerHTML = `<div class="text-center text-danger">Error: ${e.message}</div>`;
        }
    },

    filterUsers() {
        const search = (document.getElementById('user-search')?.value || '').toLowerCase();
        const roleFilter = document.getElementById('user-role-filter')?.value || '';

        const filtered = this.users.filter(u => {
            const matchSearch = u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search);
            const matchRole = !roleFilter || u.role === roleFilter;
            return matchSearch && matchRole;
        });

        document.getElementById('users-tbody').innerHTML = filtered.map(u => `
            <tr>
                <td><strong>${Utils.escapeHtml(u.name)}</strong></td>
                <td>${Utils.escapeHtml(u.email)}</td>
                <td>${Utils.escapeHtml(u.nim_nip || '-')}</td>
                <td><span class="badge badge-${u.role === 'admin' ? 'danger' : u.role === 'dosen' ? 'warning' : 'primary'}">${u.role}</span></td>
                <td><span class="badge badge-${u.status === 'active' ? 'success' : 'secondary'}">${u.status || 'active'}</span></td>
                <td>
                    <button class="btn btn-sm btn-ghost" onclick="Pages.Admin.viewUser('${u.id}')" title="View"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-secondary" onclick="Pages.Admin.editUser('${u.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-warning" onclick="Pages.Admin.resetPassword('${u.id}')" title="Reset Password"><i class="fas fa-key"></i></button>
                    ${u.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="Pages.Admin.deleteUser('${u.id}')" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
    },

    viewUser(id) {
        const user = this.users.find(u => u.id === id);
        if (!user) return;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Detail User</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
                </div>
                <div class="text-center mb-lg">
                    <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:32px;color:white;">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 class="mt-md">${Utils.escapeHtml(user.name)}</h3>
                    <span class="badge badge-${user.role === 'admin' ? 'danger' : user.role === 'dosen' ? 'warning' : 'primary'}">${user.role}</span>
                </div>
                <div class="list">
                    <div class="list-item">
                        <div class="list-item-content"><div class="list-item-subtitle">Email</div><div class="list-item-title">${user.email}</div></div>
                    </div>
                    <div class="list-item">
                        <div class="list-item-content"><div class="list-item-subtitle">NIM/NIP</div><div class="list-item-title">${user.nim_nip || '-'}</div></div>
                    </div>
                    <div class="list-item">
                        <div class="list-item-content"><div class="list-item-subtitle">Status</div><div class="list-item-title"><span class="badge badge-${user.status === 'active' ? 'success' : 'secondary'}">${user.status || 'active'}</span></div></div>
                    </div>
                    <div class="list-item">
                        <div class="list-item-content"><div class="list-item-subtitle">Terdaftar</div><div class="list-item-title">${Utils.formatDate(user.created_at)}</div></div>
                    </div>
                </div>
                <div class="flex gap-sm mt-lg">
                    <button class="btn btn-secondary flex-1" onclick="this.closest('.modal-overlay').remove();Pages.Admin.editUser('${user.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-primary flex-1" onclick="this.closest('.modal-overlay').remove();Pages.Admin.topupUser('${user.id}')">
                        <i class="fas fa-plus"></i> Top-up
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    },

    showUserForm(user = null) {
        const isEdit = !!user;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit User' : 'Tambah User Baru'}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
                </div>
                <form id="user-form">
                    <div class="form-group">
                        <label class="form-label">Nama Lengkap *</label>
                        <input type="text" class="form-input" id="u-name" value="${user?.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email *</label>
                        <input type="email" class="form-input" id="u-email" value="${user?.email || ''}" required ${isEdit ? 'disabled' : ''}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">NIM/NIP</label>
                        <input type="text" class="form-input" id="u-nim" value="${user?.nim_nip || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Role *</label>
                        <select class="form-input form-select" id="u-role">
                            <option value="mahasiswa" ${user?.role === 'mahasiswa' ? 'selected' : ''}>Mahasiswa</option>
                            <option value="dosen" ${user?.role === 'dosen' ? 'selected' : ''}>Dosen</option>
                            <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    ${isEdit ? `
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-input form-select" id="u-status">
                                <option value="active" ${user?.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${user?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                <option value="suspended" ${user?.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                            </select>
                        </div>
                    ` : `
                        <div class="form-group">
                            <label class="form-label">Password *</label>
                            <input type="password" class="form-input" id="u-pass" minlength="6" required>
                        </div>
                    `}
                    <button type="submit" class="btn btn-primary btn-block">
                        <i class="fas fa-${isEdit ? 'save' : 'plus'}"></i> ${isEdit ? 'Update User' : 'Tambah User'}
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        document.getElementById('user-form').onsubmit = async (e) => {
            e.preventDefault();
            Utils.showLoading();
            try {
                const name = document.getElementById('u-name').value;
                const email = document.getElementById('u-email').value;
                const nimNip = document.getElementById('u-nim').value || ('AUTO' + Date.now());
                const role = document.getElementById('u-role').value;

                if (isEdit) {
                    const data = {
                        name,
                        nim_nip: nimNip,
                        role,
                        status: document.getElementById('u-status').value
                    };
                    await Api.request(`/users/${user.id}`, { method: 'PUT', body: data });
                } else {
                    const password = document.getElementById('u-pass').value;
                    const data = {
                        name,
                        email,
                        nim_nip: nimNip,
                        role,
                        password,
                        password_confirmation: password  // Required by backend
                    };
                    await Api.request('/auth/register', { method: 'POST', body: data });
                }
                Utils.hideLoading();
                overlay.remove();
                Utils.toast(`User berhasil ${isEdit ? 'diupdate' : 'ditambahkan'}!`, 'success');
                this.renderUsers();
            } catch (err) {
                Utils.hideLoading();
                Utils.toast(err.message || 'Gagal menyimpan user', 'error');
            }
        };
    },

    async editUser(id) {
        const user = this.users.find(u => u.id === id);
        if (user) this.showUserForm(user);
    },

    async deleteUser(id) {
        const user = this.users.find(u => u.id === id);
        if (!await Utils.confirm(`Hapus user "${user?.name}"?`)) return;
        Utils.showLoading();
        try {
            await Api.request(`/users/${id}`, { method: 'DELETE' });
            Utils.hideLoading();
            Utils.toast('User berhasil dihapus', 'success');
            this.renderUsers();
        } catch (e) {
            Utils.hideLoading();
            Utils.toast(e.message, 'error');
        }
    },

    async resetPassword(id) {
        const user = this.users.find(u => u.id === id);
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Reset Password</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
                </div>
                <p class="mb-lg">Reset password untuk: <strong>${user?.name}</strong></p>
                <form id="reset-form">
                    <div class="form-group">
                        <label class="form-label">Password Baru *</label>
                        <input type="password" class="form-input" id="new-pass" minlength="6" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Konfirmasi Password *</label>
                        <input type="password" class="form-input" id="confirm-pass" minlength="6" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-key"></i> Reset Password</button>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        document.getElementById('reset-form').onsubmit = async (e) => {
            e.preventDefault();
            const pass = document.getElementById('new-pass').value;
            const confirm = document.getElementById('confirm-pass').value;
            if (pass !== confirm) {
                Utils.toast('Password tidak cocok', 'error');
                return;
            }
            Utils.showLoading();
            try {
                await Api.request(`/users/${id}/reset-password`, { method: 'POST', body: { password: pass } });
                Utils.hideLoading();
                overlay.remove();
                Utils.toast('Password berhasil direset', 'success');
            } catch (err) {
                Utils.hideLoading();
                Utils.toast(err.message || 'Gagal reset password', 'error');
            }
        };
    },

    topupUser(userId) {
        this.activeTab = 'topup';
        this.render().then(() => {
            setTimeout(() => {
                const select = document.getElementById('tu-user');
                if (select) select.value = userId;
            }, 500);
        });
    },

    // ============ TRANSACTIONS ============
    async renderTransactions() {
        const content = document.getElementById('admin-content');
        try {
            const res = await Api.request('/admin/transactions').catch(() => ({ data: { transactions: [] } }));
            const txs = res?.data?.transactions || [];

            content.innerHTML = `
                <h2 class="admin-title">Transaction Monitor</h2>
                <div class="card">
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead><tr><th>ID</th><th>Sender</th><th>Receiver</th><th>Type</th><th>Amount</th><th>Status</th><th>Tanggal</th></tr></thead>
                            <tbody>
                                ${txs.length ? txs.map(t => `
                                    <tr>
                                        <td><code>${t.id?.substring(0, 8)}...</code></td>
                                        <td>${Utils.escapeHtml(t.sender?.name || '-')}</td>
                                        <td>${Utils.escapeHtml(t.receiver?.name || '-')}</td>
                                        <td><span class="badge">${t.type}</span></td>
                                        <td class="text-primary" style="font-weight:600;">${Utils.formatCurrency(t.amount)}</td>
                                        <td><span class="badge badge-${t.status === 'SUCCESS' ? 'success' : 'warning'}">${t.status}</span></td>
                                        <td>${Utils.formatDate(t.created_at)}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="7" class="text-center text-muted">Tidak ada transaksi</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (e) { content.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`; }
    },

    // ============ PRODUCTS ============
    async renderProducts() {
        const content = document.getElementById('admin-content');
        try {
            console.log('[Admin] Loading products...');
            const res = await Api.getProducts(1, 100);
            const products = res?.data?.products || [];
            console.log('[Admin] Products loaded:', products.length, products);

            content.innerHTML = `
                <div class="flex justify-between items-center mb-lg">
                    <h2 class="admin-title" style="margin:0;">Product Management</h2>
                    <button class="btn btn-primary" onclick="Pages.Admin.showProductForm()">
                        <i class="fas fa-plus"></i> Tambah Produk
                    </button>
                </div>
                <div class="card">
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead><tr><th>Nama</th><th>Seller</th><th>Harga</th><th>Kategori</th><th>Terjual</th><th>Status</th><th>Aksi</th></tr></thead>
                            <tbody>
                                ${products.length ? products.map(p => `
                                    <tr>
                                        <td><strong>${Utils.escapeHtml(p.name)}</strong></td>
                                        <td>${Utils.escapeHtml(p.seller?.name || '-')}</td>
                                        <td class="text-primary">${Utils.formatCurrency(p.price)}</td>
                                        <td><span class="badge">${p.category}</span></td>
                                        <td>${p.total_sold || 0}</td>
                                        <td><span class="badge badge-${p.status === 'active' ? 'success' : 'warning'}">${p.status}</span></td>
                                        <td>
                                            ${p.status !== 'active' ? `<button class="btn btn-sm btn-success" onclick="Pages.Admin.approveProduct('${p.id}')" title="Approve"><i class="fas fa-check"></i></button>` : ''}
                                            <button class="btn btn-sm btn-danger" onclick="Pages.Admin.deleteProduct('${p.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `).join('') : '<tr><td colspan="7" class="text-center text-muted">Tidak ada produk</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (e) { content.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`; }
    },

    showProductForm() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Tambah Produk</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
                </div>
                <form id="product-form">
                    <div class="form-group">
                        <label class="form-label">Nama Produk *</label>
                        <input type="text" class="form-input" id="p-name" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Deskripsi</label>
                        <textarea class="form-input" id="p-desc" rows="2"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Harga *</label>
                        <input type="number" class="form-input" id="p-price" min="0" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kategori *</label>
                        <select class="form-input form-select" id="p-cat" required>
                            <option value="ebook">E-Book</option>
                            <option value="ecourse">E-Course</option>
                            <option value="material">Materi</option>
                            <option value="other">Lainnya</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-plus"></i> Tambah Produk</button>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        document.getElementById('product-form').onsubmit = async (e) => {
            e.preventDefault();
            Utils.showLoading();
            try {
                const productData = {
                    name: document.getElementById('p-name').value,
                    description: document.getElementById('p-desc').value,
                    price: +document.getElementById('p-price').value,
                    category: document.getElementById('p-cat').value
                };
                console.log('[Admin] Creating product:', productData);
                const result = await Api.createProduct(productData);
                console.log('[Admin] Product created:', result);
                Utils.hideLoading();
                overlay.remove();
                Utils.toast('Produk berhasil ditambahkan', 'success');
                await this.renderProducts();
            } catch (err) {
                console.error('[Admin] Create product error:', err);
                Utils.hideLoading();
                Utils.toast(err.message || 'Gagal menambahkan produk', 'error');
            }
        };
    },

    async approveProduct(id) {
        Utils.showLoading();
        try {
            console.log('[Admin] Approving product:', id);
            await Api.request(`/products/${id}`, { method: 'PUT', body: { status: 'active' } });
            Utils.hideLoading();
            Utils.toast('Produk disetujui', 'success');
            await this.renderProducts();
        } catch (e) {
            console.error('[Admin] Approve error:', e);
            Utils.hideLoading();
            Utils.toast(e.message, 'error');
        }
    },

    async deleteProduct(id) {
        if (!await Utils.confirm('Hapus produk ini?')) return;
        Utils.showLoading();
        try {
            console.log('[Admin] Deleting product:', id);
            const result = await Api.request(`/products/${id}`, { method: 'DELETE' });
            console.log('[Admin] Delete result:', result);
            Utils.hideLoading();
            Utils.toast('Produk dihapus', 'success');
            await this.renderProducts();
        } catch (e) {
            console.error('[Admin] Delete error:', e);
            Utils.hideLoading();
            Utils.toast(e.message, 'error');
        }
    },

    // ============ MISSIONS ============
    async renderMissions() {
        const content = document.getElementById('admin-content');
        try {
            console.log('[Admin] Loading missions...');
            const res = await Api.getMissions(1, 100);
            const missions = res?.data?.missions || [];
            console.log('[Admin] Missions loaded:', missions.length, missions);

            content.innerHTML = `
                <div class="flex justify-between items-center mb-lg">
                    <h2 class="admin-title" style="margin:0;">Mission Management</h2>
                    <button class="btn btn-primary" onclick="Pages.Admin.showMissionForm()"><i class="fas fa-plus"></i> Buat Misi</button>
                </div>
                <div class="card">
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead><tr><th>Judul</th><th>Type</th><th>Reward</th><th>Peserta</th><th>Status</th><th>Aksi</th></tr></thead>
                            <tbody>
                                ${missions.length ? missions.map(m => `
                                    <tr>
                                        <td><strong>${Utils.escapeHtml(m.title)}</strong></td>
                                        <td><span class="badge badge-${m.type === 'daily' ? 'primary' : m.type === 'weekly' ? 'warning' : 'secondary'}">${m.type}</span></td>
                                        <td class="text-success">${Utils.formatCurrency(m.points_reward)}</td>
                                        <td>${m.current_participants || 0} / ${m.max_participants === -1 ? '∞' : m.max_participants}</td>
                                        <td><span class="badge badge-${m.status === 'active' ? 'success' : 'secondary'}">${m.status || 'draft'}</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-secondary" onclick="Pages.Admin.editMission('${m.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                                            <button class="btn btn-sm btn-danger" onclick="Pages.Admin.deleteMission('${m.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `).join('') : '<tr><td colspan="6" class="text-center text-muted">Tidak ada misi</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (e) { content.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`; }
    },

    showMissionForm(mission = null) {
        const isEdit = !!mission;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit Misi' : 'Buat Misi Baru'}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
                </div>
                <form id="mission-form">
                    <div class="form-group">
                        <label class="form-label">Judul Misi *</label>
                        <input type="text" class="form-input" id="m-title" value="${mission?.title || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Deskripsi</label>
                        <textarea class="form-input" id="m-desc" rows="2">${mission?.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Reward (Poin) *</label>
                        <input type="number" class="form-input" id="m-reward" value="${mission?.points_reward || 1000}" min="1" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipe *</label>
                        <select class="form-input form-select" id="m-type">
                            <option value="daily" ${mission?.type === 'daily' ? 'selected' : ''}>Daily</option>
                            <option value="weekly" ${mission?.type === 'weekly' ? 'selected' : ''}>Weekly</option>
                            <option value="special" ${mission?.type === 'special' ? 'selected' : ''}>Special</option>
                            <option value="course" ${mission?.type === 'course' ? 'selected' : ''}>Course</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Max Peserta (-1 = unlimited)</label>
                        <input type="number" class="form-input" id="m-max" value="${mission?.max_participants || -1}" min="-1">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">
                        <i class="fas fa-${isEdit ? 'save' : 'plus'}"></i> ${isEdit ? 'Update' : 'Simpan'}
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        document.getElementById('mission-form').onsubmit = async (e) => {
            e.preventDefault();
            Utils.showLoading();
            try {
                const data = {
                    title: document.getElementById('m-title').value,
                    description: document.getElementById('m-desc').value,
                    points_reward: +document.getElementById('m-reward').value,
                    type: document.getElementById('m-type').value,
                    max_participants: +document.getElementById('m-max').value
                };
                console.log('[Admin] Mission data:', data, 'isEdit:', isEdit);

                if (isEdit) {
                    const result = await Api.request(`/missions/${mission.id}`, { method: 'PUT', body: data });
                    console.log('[Admin] Mission updated:', result);
                } else {
                    const result = await Api.createMission(data);
                    console.log('[Admin] Mission created:', result);
                }
                Utils.hideLoading();
                overlay.remove();
                Utils.toast(`Misi berhasil ${isEdit ? 'diupdate' : 'dibuat'}`, 'success');
                await this.renderMissions();
            } catch (err) {
                console.error('[Admin] Mission error:', err);
                Utils.hideLoading();
                Utils.toast(err.message || 'Gagal menyimpan misi', 'error');
            }
        };
    },

    async editMission(id) {
        console.log('[Admin] Editing mission:', id);
        try {
            const res = await Api.getMissions(1, 100);
            const mission = res?.data?.missions?.find(m => m.id === id);
            console.log('[Admin] Found mission:', mission);
            if (mission) this.showMissionForm(mission);
        } catch (e) {
            console.error('[Admin] Edit mission error:', e);
            Utils.toast('Gagal load mission', 'error');
        }
    },

    async deleteMission(id) {
        if (!await Utils.confirm('Hapus misi ini?')) return;
        Utils.showLoading();
        try {
            console.log('[Admin] Deleting mission:', id);
            const result = await Api.request(`/missions/${id}`, { method: 'DELETE' });
            console.log('[Admin] Delete result:', result);
            Utils.hideLoading();
            Utils.toast('Misi dihapus', 'success');
            await this.renderMissions();
        } catch (e) {
            console.error('[Admin] Delete mission error:', e);
            Utils.hideLoading();
            Utils.toast(e.message, 'error');
        }
    },

    // ============ TOP-UP ============
    async renderTopup() {
        const content = document.getElementById('admin-content');
        const res = await Api.request('/users').catch(() => ({ data: { users: [] } }));
        const users = res?.data?.users?.filter(u => u.role !== 'admin') || [];

        content.innerHTML = `
            <h2 class="admin-title">Top-up Management</h2>
            <div class="card" style="max-width:500px;">
                <form id="topup-form">
                    <div class="form-group">
                        <label class="form-label">Pilih User *</label>
                        <select class="form-input form-select" id="tu-user" required>
                            <option value="">-- Pilih User --</option>
                            ${users.map(u => `<option value="${u.id}">${u.name} (${u.role}) - ${u.email}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Jumlah Top-up *</label>
                        <input type="number" class="form-input" id="tu-amount" placeholder="Contoh: 50000" min="1" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Keterangan</label>
                        <input type="text" class="form-input" id="tu-desc" value="Admin Top-up">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block btn-lg">
                        <i class="fas fa-plus-circle"></i> Proses Top-up
                    </button>
                </form>
            </div>
            
            <div class="card mt-lg">
                <h3 class="mb-md">Quick Top-up</h3>
                <div class="flex gap-sm flex-wrap">
                    <button class="btn btn-secondary" onclick="document.getElementById('tu-amount').value='10000'">Rp 10.000</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('tu-amount').value='25000'">Rp 25.000</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('tu-amount').value='50000'">Rp 50.000</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('tu-amount').value='100000'">Rp 100.000</button>
                </div>
            </div>
        `;

        document.getElementById('topup-form').onsubmit = async (e) => {
            e.preventDefault();
            Utils.showLoading();
            try {
                const userId = document.getElementById('tu-user').value;
                const amount = +document.getElementById('tu-amount').value;
                const desc = document.getElementById('tu-desc').value;

                const result = await Api.request('/admin/topup', {
                    method: 'POST',
                    body: { user_id: userId, amount, description: desc }
                });

                Utils.hideLoading();
                Utils.toast(`Top-up ${Utils.formatCurrency(amount)} berhasil!`, 'success');
                document.getElementById('topup-form').reset();
            } catch (e) {
                Utils.hideLoading();
                Utils.toast(e.message || 'Top-up gagal', 'error');
            }
        };
    },

    // ============ AUDIT ============
    async renderAudit() {
        const content = document.getElementById('admin-content');
        try {
            const res = await Api.request('/admin/audit').catch(() => ({ data: { logs: [] } }));
            const logs = res?.data?.logs || [];

            content.innerHTML = `
                <h2 class="admin-title">Audit Logs</h2>
                <div class="card">
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead><tr><th>Waktu</th><th>User</th><th>Action</th><th>Resource</th><th>IP Address</th></tr></thead>
                            <tbody>
                                ${logs.length ? logs.map(l => `
                                    <tr>
                                        <td>${Utils.formatDate(l.created_at)}</td>
                                        <td>${Utils.escapeHtml(l.user?.name || '-')}</td>
                                        <td><span class="badge">${l.action}</span></td>
                                        <td><code>${l.resource_type || '-'}</code></td>
                                        <td><code>${l.ip_address || '-'}</code></td>
                                    </tr>
                                `).join('') : '<tr><td colspan="5" class="text-center text-muted">Tidak ada log</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (e) { content.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`; }
    },

    // ============ REPORTS ============
    async renderReports() {
        const content = document.getElementById('admin-content');

        try {
            const [usersRes, productsRes, txRes] = await Promise.all([
                Api.request('/users').catch(() => ({ data: { users: [] } })),
                Api.getProducts(1, 100).catch(() => ({ data: { products: [] } })),
                Api.request('/admin/transactions').catch(() => ({ data: { transactions: [] } }))
            ]);

            const users = usersRes?.data?.users || [];
            const products = productsRes?.data?.products || [];
            const transactions = txRes?.data?.transactions || [];

            content.innerHTML = `
                <h2 class="admin-title">Laporan & Analytics</h2>
                <div class="stats-grid mb-lg">
                    <div class="stat-card">
                        <div class="stat-icon" style="background:#667eea;"><i class="fas fa-users"></i></div>
                        <div class="stat-info"><div class="stat-value">${users.length}</div><div class="stat-label">Total Users</div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background:#43e97b;"><i class="fas fa-exchange-alt"></i></div>
                        <div class="stat-info"><div class="stat-value">${transactions.length}</div><div class="stat-label">Total Transaksi</div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background:#f5576c;"><i class="fas fa-box"></i></div>
                        <div class="stat-info"><div class="stat-value">${products.length}</div><div class="stat-label">Total Produk</div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background:#4facfe;"><i class="fas fa-shopping-cart"></i></div>
                        <div class="stat-info"><div class="stat-value">${products.reduce((sum, p) => sum + (p.total_sold || 0), 0)}</div><div class="stat-label">Produk Terjual</div></div>
                    </div>
                </div>
                
                <div class="flex gap-lg" style="flex-wrap:wrap;">
                    <div class="card flex-1" style="min-width:300px;">
                        <h3 class="mb-md"><i class="fas fa-chart-bar"></i> Aktivitas Mingguan</h3>
                        <div id="chart-area" style="height:200px;display:flex;align-items:end;gap:8px;"></div>
                    </div>
                    <div class="card flex-1" style="min-width:300px;">
                        <h3 class="mb-md"><i class="fas fa-pie-chart"></i> Distribusi User</h3>
                        <div class="list">
                            <div class="list-item">
                                <div class="list-item-icon" style="background:#f5576c;"><i class="fas fa-user-shield" style="color:white;"></i></div>
                                <div class="list-item-content"><div class="list-item-title">Admin</div></div>
                                <div class="list-item-value">${users.filter(u => u.role === 'admin').length}</div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-icon" style="background:#f59e0b;"><i class="fas fa-chalkboard-teacher" style="color:white;"></i></div>
                                <div class="list-item-content"><div class="list-item-title">Dosen</div></div>
                                <div class="list-item-value">${users.filter(u => u.role === 'dosen').length}</div>
                            </div>
                            <div class="list-item">
                                <div class="list-item-icon" style="background:#4facfe;"><i class="fas fa-user-graduate" style="color:white;"></i></div>
                                <div class="list-item-content"><div class="list-item-title">Mahasiswa</div></div>
                                <div class="list-item-value">${users.filter(u => u.role === 'mahasiswa').length}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Render chart
            const chartArea = document.getElementById('chart-area');
            const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
            const values = [45, 32, 67, 89, 54, 78, 62];
            chartArea.innerHTML = values.map((v, i) => `
                <div style="flex:1;text-align:center;">
                    <div style="height:${v * 2}px;background:linear-gradient(180deg,#667eea,#764ba2);border-radius:4px 4px 0 0;transition:height 0.3s;"></div>
                    <small style="color:var(--text-muted);">${days[i]}</small>
                </div>
            `).join('');

        } catch (e) { content.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`; }
    }
};
