/**
 * Register Page
 */
Pages.Register = {
    selectedRole: 'mahasiswa',

    render() {
        const app = document.getElementById('app');

        app.innerHTML = `
            <div class="login-page" style="justify-content: flex-start; padding-top: 60px;">
                <div class="login-header" style="margin-bottom: 24px;">
                    <h1 class="login-title" style="font-size: 24px;">Buat Akun</h1>
                    <p class="login-subtitle">Daftar untuk menggunakan WalletPoint</p>
                </div>
                
                <div class="role-selector" style="margin-bottom: 20px;">
                    <button class="role-btn ${this.selectedRole === 'mahasiswa' ? 'active' : ''}" data-role="mahasiswa">
                        <i class="fas fa-user-graduate"></i>
                        Mahasiswa
                    </button>
                    <button class="role-btn ${this.selectedRole === 'dosen' ? 'active' : ''}" data-role="dosen">
                        <i class="fas fa-chalkboard-teacher"></i>
                        Dosen
                    </button>
                </div>
                
                <form id="register-form">
                    <div class="form-group">
                        <label class="form-label">Nama Lengkap</label>
                        <input type="text" class="form-input" id="name" placeholder="John Doe" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" id="email" placeholder="nama@email.com" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" id="nim-nip-label">NIM</label>
                        <input type="text" class="form-input" id="nim_nip" placeholder="202101010001" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">No. Telepon</label>
                        <input type="tel" class="form-input" id="phone" placeholder="081234567890">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-input" id="password" placeholder="Min. 6 karakter" required minlength="6">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Konfirmasi Password</label>
                        <input type="password" class="form-input" id="password_confirmation" placeholder="Ulangi password" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block btn-lg">
                        <i class="fas fa-user-plus"></i> Daftar
                    </button>
                </form>
                
                <p class="text-center mt-lg">
                    Sudah punya akun? <a href="#" onclick="Router.navigate('/login'); return false;">Masuk</a>
                </p>
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

                // Update label
                document.getElementById('nim-nip-label').textContent =
                    this.selectedRole === 'dosen' ? 'NIP' : 'NIM';
            });
        });

        // Form submission
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const nim_nip = document.getElementById('nim_nip').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const password = document.getElementById('password').value;
            const password_confirmation = document.getElementById('password_confirmation').value;

            // Validation
            if (password !== password_confirmation) {
                Utils.toast('Password tidak cocok', 'error');
                return;
            }

            if (password.length < 6) {
                Utils.toast('Password minimal 6 karakter', 'error');
                return;
            }

            Utils.showLoading('Mendaftar...');

            try {
                const response = await Auth.register({
                    name,
                    email,
                    nim_nip,
                    phone,
                    password,
                    password_confirmation,
                    role: this.selectedRole
                });

                Utils.hideLoading();

                if (response.success) {
                    Utils.toast('Registrasi berhasil! Silakan login.', 'success');
                    Router.navigate('/login');
                }
            } catch (error) {
                Utils.hideLoading();
                Utils.toast(error.message || 'Registrasi gagal', 'error');
            }
        });
    }
};
