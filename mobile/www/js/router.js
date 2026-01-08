/**
 * WalletPoint - Router Module
 * Simple client-side routing
 */
const Router = {
    currentPage: null,
    history: [],

    // Navigate to a page
    navigate(page, params = {}, addToHistory = true) {
        // Hide loading screen if visible
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }

        // Check auth for protected pages
        const publicPages = ['login'];
        if (!publicPages.includes(page) && !Storage.isLoggedIn()) {
            this.navigate('login');
            return;
        }

        // Add to history
        if (addToHistory && this.currentPage && this.currentPage !== page) {
            this.history.push(this.currentPage);
        }

        this.currentPage = page;

        // Render the page
        this.renderPage(page, params);

        // Update bottom nav
        this.updateBottomNav(page);
    },

    // Go back in history
    back() {
        if (this.history.length > 0) {
            const prevPage = this.history.pop();
            this.navigate(prevPage, {}, false);
        }
    },

    // Render page content
    renderPage(page, params) {
        const mainContent = document.getElementById('main-content');
        mainContent.classList.remove('hidden');

        // Clear current content
        mainContent.innerHTML = '';

        // Get page renderer
        const pageRenderer = this.getPageRenderer(page);
        if (pageRenderer) {
            pageRenderer.render(mainContent, params);
        } else {
            mainContent.innerHTML = `<div class="p-md text-center">Page not found</div>`;
        }
    },

    // Get page renderer based on page name
    getPageRenderer(page) {
        const pages = {
            'login': LoginPage,
            'dashboard': DashboardPage,
            'wallet': WalletPage,
            'missions': MissionsPage,
            'scan': ScanPage,
            'marketplace': MarketplacePage,
            'profile': ProfilePage
        };

        return pages[page];
    },

    // Update bottom navigation
    updateBottomNav(page) {
        const bottomNav = document.getElementById('bottom-nav');

        // Hide nav for login page
        if (page === 'login') {
            bottomNav.classList.add('hidden');
            return;
        }

        bottomNav.classList.remove('hidden');

        // Update active state
        const navItems = bottomNav.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const itemPage = item.dataset.page;
            if (itemPage === page || (page === 'wallet' && itemPage === 'dashboard')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    // Initialize router
    init() {
        // Setup bottom nav click handlers
        const bottomNav = document.getElementById('bottom-nav');
        bottomNav.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                const page = navItem.dataset.page;
                this.navigate(page);
            }
        });

        // Handle back button on Android
        document.addEventListener('backbutton', () => {
            if (this.history.length > 0) {
                this.back();
            } else if (this.currentPage !== 'dashboard') {
                this.navigate('dashboard');
            } else {
                // Exit app confirmation
                if (confirm('Keluar dari aplikasi?')) {
                    navigator.app.exitApp();
                }
            }
        }, false);
    }
};
