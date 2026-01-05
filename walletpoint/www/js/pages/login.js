/**
 * Login Page
 */
const Pages = window.Pages || {};

Pages.Login = {
    selectedRole: 'mahasiswa',

    render() {
        const app = document.getElementById('app');

        app.innerHTML = `
            <div class="login-page">
                <div class="login-header">
                    <div class="login-logo">💰</div>
                    <h1 class="login-title">WalletPoint</h1>
                    <p class="login-subtitle">Platform Wallet Poin Kampus</p>
                </div>
                
                <div class="role-selector">
                    <button class="role-btn ${this.selectedRole === 'mahasiswa' ? 'active' : ''}" data-role="mahasiswa">
                        <i class="fas fa-user-graduate"></i>
                        Mahasiswa
                    </button>
                    <button class="role-btn ${this.selectedRole === 'dosen' ? 'active' : ''}" data-role="dosen">
                        <i class="fas fa-chalkboard-teacher"></i>
                        Dosen
                    </button>
                    <button class="role-btn ${this.selectedRole === 'admin' ? 'active' : ''}" data-role="admin">
                        <i class="fas fa-user-shield"></i>
                        Admin
                    </button>
                </div>
                
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" id="email" placeholder="nama@email.com" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-input" id="password" placeholder="••••••••" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block btn-lg">
                        <i class="fas fa-sign-in-alt"></i> Masuk
                    </button>
                </form>
                
                <p class="text-center mt-lg">
                    Belum punya akun? <a href="#" onclick="Router.navigate('/register'); return false;">Daftar</a>
                </p>
                
                <div class="text-center mt-lg text-muted" style="font-size: 12px;">
                    <p><strong>Demo Account:</strong></p>
                    <p>👨‍🎓 mahasiswa@walletpoint.edu / mhs123</p>
                    <p>👨‍🏫 dosen@walletpoint.edu / dosen123</p>
                    <p>👔 admin@walletpoint.edu / admin123</p>
                </div>
            </div>
        `;

        this.setupListeners();
    },

    setupListeners() {
        // Role selector
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedRole = btn.dataset.role;
            });
        });

        // Form submission
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            if (!email || !password) {
                Utils.toast('Mohon isi semua field', 'warning');
                return;
            }

            Utils.showLoading('Masuk...');

            try {
                const response = await Auth.login(email, password, this.selectedRole);
                Utils.hideLoading();

                if (response.success) {
                    Utils.toast(`Selamat datang, ${response.data.user.name}!`, 'success');

                    // Redirect based on role
                    if (response.data.user.role === 'admin') {
                        Router.navigate('/admin');
                    } else {
                        Router.navigate('/dashboard');
                    }
                }
            } catch (error) {
                Utils.hideLoading();
                Utils.toast(error.message || 'Login gagal', 'error');
            }
        });
    }
};

window.Pages = Pages;
