/**
 * WalletPoint - Login Page
 */
const LoginPage = {
    selectedRole: Config.ROLES.MAHASISWA,

    render(container) {
        container.innerHTML = `
            <div class="login-page">
                <div class="login-header">
                    <div class="login-logo">💰</div>
                    <h1 class="login-title">WalletPoint</h1>
                    <p class="login-subtitle">Platform Poin Gamifikasi Pembelajaran</p>
                </div>
                
                <div class="login-form">
                    <div class="role-selector">
                        <button class="role-btn" data-role="mahasiswa">
                            👨‍🎓 Mahasiswa
                        </button>
                        <button class="role-btn" data-role="dosen">
                            👨‍🏫 Dosen
                        </button>
                        <button class="role-btn" data-role="admin">
                            👨‍💼 Admin
                        </button>
                    </div>
                    
                    <form id="login-form">
                        ${Components.formInput('username', 'Username', 'text', 'Masukkan username')}
                        ${Components.formInput('password', 'Password', 'password', 'Masukkan password')}
                        
                        <div id="login-error" class="form-error mb-md hidden"></div>
                        
                        <button type="submit" class="btn btn-primary btn-block btn-lg mt-lg">
                            Masuk
                        </button>
                    </form>
                </div>
                
                <div class="mt-lg text-center text-muted">
                    <small>v${Config.VERSION}</small>
                </div>
            </div>
        `;

        this.bindEvents(container);
        this.updateRoleSelector();
    },

    bindEvents(container) {
        // Role selector
        const roleButtons = container.querySelectorAll('.role-btn');
        roleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedRole = btn.dataset.role;
                this.updateRoleSelector();
            });
        });

        // Login form
        const form = container.querySelector('#login-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    },

    updateRoleSelector() {
        const buttons = document.querySelectorAll('.role-btn');
        buttons.forEach(btn => {
            if (btn.dataset.role === this.selectedRole) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        const submitBtn = document.querySelector('#login-form button[type="submit"]');

        // Clear previous error
        errorDiv.classList.add('hidden');

        // Disable button
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Memproses...';

        try {
            const result = await API.login(username, password, this.selectedRole);

            if (result.success) {
                App.showToast('Login berhasil!', 'success');
                Router.navigate('dashboard');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            errorDiv.textContent = error.response?.message || error.message || 'Login gagal';
            errorDiv.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Masuk';
        }
    }
};
