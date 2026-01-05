/**
 * WalletPoint Router
 * SPA routing with navigation guards
 */
const Router = {
    routes: {},
    currentPath: null,

    /**
     * Register a route
     */
    register(path, handler, options = {}) {
        this.routes[path] = {
            handler,
            ...options
        };
    },

    /**
     * Navigate to a path
     */
    navigate(path) {
        const route = this.routes[path];

        if (!route) {
            console.error('Route not found:', path);
            return;
        }

        // Check authentication
        if (route.requiresAuth && !Auth.isLoggedIn()) {
            this.navigate('/login');
            return;
        }

        // Check roles
        if (route.roles && route.roles.length > 0) {
            const userRole = Auth.getRole();
            if (!route.roles.includes(userRole)) {
                Utils.toast('Anda tidak memiliki akses ke halaman ini', 'error');
                return;
            }
        }

        // Update URL
        history.pushState({ path }, '', '#' + path);

        // Update current path
        this.currentPath = path;

        // Render page
        route.handler();
    },

    /**
     * Get current path
     */
    getCurrentPath() {
        return this.currentPath;
    },

    /**
     * Initialize router
     */
    init() {
        // Register routes
        this.register('/login', () => Pages.Login.render(), {
            requiresAuth: false
        });

        this.register('/register', () => Pages.Register.render(), {
            requiresAuth: false
        });

        this.register('/dashboard', () => Pages.Dashboard.render(), {
            requiresAuth: true,
            roles: ['admin', 'dosen', 'mahasiswa']
        });

        this.register('/wallet', () => Pages.Wallet.render(), {
            requiresAuth: true,
            roles: ['admin', 'dosen', 'mahasiswa']
        });

        this.register('/scan', () => Pages.Scan.render(), {
            requiresAuth: true,
            roles: ['dosen', 'mahasiswa']
        });

        this.register('/marketplace', () => Pages.Marketplace.render(), {
            requiresAuth: true,
            roles: ['admin', 'dosen', 'mahasiswa']
        });

        this.register('/missions', () => Pages.Missions.render(), {
            requiresAuth: true,
            roles: ['admin', 'dosen', 'mahasiswa']
        });

        this.register('/admin', () => Pages.Admin.render(), {
            requiresAuth: true,
            roles: ['admin']
        });

        this.register('/notifications', () => Pages.Notifications.render(), {
            requiresAuth: true
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.path) {
                const route = this.routes[event.state.path];
                if (route) {
                    this.currentPath = event.state.path;
                    route.handler();
                }
            }
        });

        // Handle hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1) || '/login';
            if (hash !== this.currentPath) {
                this.navigate(hash);
            }
        });
    },

    /**
     * Start router - determine initial route
     */
    start() {
        this.init();

        // Get initial path from hash or default
        const hash = window.location.hash.slice(1);

        if (hash && this.routes[hash]) {
            this.navigate(hash);
        } else if (Auth.isLoggedIn()) {
            // Redirect admin to admin panel
            if (Auth.isAdmin()) {
                this.navigate('/admin');
            } else {
                this.navigate('/dashboard');
            }
        } else {
            this.navigate('/login');
        }
    }
};
