/**
 * Marketplace Page - With CRUD for Dosen
 */
Pages.Marketplace = {
    products: [],
    myProducts: [],
    cart: [],
    activeTab: 'browse', // 'browse' or 'my-products' (dosen only)

    // Cart storage key prefix
    CART_STORAGE_PREFIX: 'wp_marketplace_cart_',

    // Get cart storage key for current user
    getCartStorageKey() {
        const user = Auth.getUser();
        const userId = user?.id || 'guest';
        return this.CART_STORAGE_PREFIX + userId;
    },

    // Initialize cart from localStorage
    initCart() {
        try {
            const storageKey = this.getCartStorageKey();
            const savedCart = localStorage.getItem(storageKey);
            if (savedCart) {
                this.cart = JSON.parse(savedCart);
            } else {
                this.cart = [];
            }
        } catch (e) {
            console.log('Failed to load cart from storage:', e);
            this.cart = [];
        }
    },

    // Save cart to localStorage
    saveCart() {
        try {
            const storageKey = this.getCartStorageKey();
            localStorage.setItem(storageKey, JSON.stringify(this.cart));
        } catch (e) {
            console.log('Failed to save cart:', e);
        }
    },

    // Clear cart from memory and storage
    clearCart() {
        this.cart = [];
        const storageKey = this.getCartStorageKey();
        localStorage.removeItem(storageKey);
    },

    async render() {
        // Load cart from storage on render
        this.initCart();

        const app = document.getElementById('app');
        const isDosen = Auth.isDosen();
        const isAdmin = Auth.isAdmin();

        app.innerHTML = `
            <div class="page" style="padding-bottom: 100px;">
                ${Components.pageHeader('Marketplace', false, `
                    <button class="btn btn-ghost btn-icon" style="position: relative;" onclick="Pages.Marketplace.showCart()">
                        <i class="fas fa-shopping-cart"></i>
                        <span id="cart-badge" class="badge badge-danger" style="position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; font-size: 10px; display: ${this.cart.length > 0 ? 'flex' : 'none'}; align-items: center; justify-content: center; padding: 0;">${this.cart.length}</span>
                    </button>
                `)}
                
                <div class="flex gap-sm mb-lg" style="overflow-x: auto;">
                    <button class="btn btn-sm flex-1 ${this.activeTab === 'browse' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="Pages.Marketplace.switchTab('browse')">
                        <i class="fas fa-store"></i> Browse
                    </button>
                    <button class="btn btn-sm flex-1 ${this.activeTab === 'my-orders' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="Pages.Marketplace.switchTab('my-orders')">
                        <i class="fas fa-receipt"></i> Pesanan
                    </button>
                    ${isDosen || isAdmin ? `
                        <button class="btn btn-sm flex-1 ${this.activeTab === 'my-products' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="Pages.Marketplace.switchTab('my-products')">
                            <i class="fas fa-box"></i> Produk
                        </button>
                    ` : ''}
                </div>
                
                <div id="marketplace-content">
                    <!-- Content will be rendered here -->
                </div>
            </div>
            ${Components.tabBar('marketplace')}
        `;

        Components.setupTabBar();

        if (this.activeTab === 'my-orders') {
            await this.renderMyOrdersTab();
        } else if (this.activeTab === 'my-products' && (isDosen || isAdmin)) {
            await this.renderMyProductsTab();
        } else {
            await this.renderBrowseTab();
        }
    },

    switchTab(tab) {
        this.activeTab = tab;
        this.render();
    },

    async renderBrowseTab() {
        const content = document.getElementById('marketplace-content');

        content.innerHTML = `
            <div class="flex gap-sm mb-lg">
                <input type="text" id="search-input" class="form-input flex-1" placeholder="Cari produk...">
                <select id="category-filter" class="form-input" style="width: auto; min-width: 100px;">
                    <option value="">Semua</option>
                    <option value="ebook">E-Book</option>
                    <option value="ecourse">E-Course</option>
                    <option value="material">Materi</option>
                </select>
            </div>
            
            <div id="products-grid" class="product-grid">
                ${[1, 2, 3, 4].map(() => `
                    <div class="product-card">
                        <div class="skeleton" style="height: 100px;"></div>
                        <div style="padding: 12px;">
                            <div class="skeleton" style="height: 16px; margin-bottom: 8px;"></div>
                            <div class="skeleton" style="height: 20px; width: 60%;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        this.setupSearchListeners();
        await this.loadProducts();
    },

    async renderMyOrdersTab() {
        const content = document.getElementById('marketplace-content');

        content.innerHTML = `
            <h4 class="mb-md"><i class="fas fa-receipt"></i> Pesanan Saya</h4>
            <div id="my-orders-list">
                <div class="text-center text-muted">
                    <div class="spinner" style="margin: 20px auto;"></div>
                    <p>Memuat pesanan...</p>
                </div>
            </div>
        `;

        await this.loadMyOrders();
    },

    async loadMyOrders() {
        const container = document.getElementById('my-orders-list');

        try {
            const response = await Api.getMyOrders();

            if (response.success) {
                this.myOrders = response.data.orders || [];
                this.renderMyOrdersList();
            }
        } catch (error) {
            console.log('Error loading orders:', error);
            // Use localStorage orders
            this.myOrders = Utils.storage.get('wp_my_orders') || [];
            this.renderMyOrdersList();
        }
    },

    getMockMyOrders() {
        return [
            {
                id: 'order-1',
                total_amount: 250,
                status: 'READY',
                fulfillment_status: 'ready',
                created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                items: [
                    { product: { name: 'E-Book Praktikum IoT' }, quantity: 1, price: 150 },
                    { product: { name: 'Modul Database' }, quantity: 1, price: 100 }
                ]
            },
            {
                id: 'order-2',
                total_amount: 120,
                status: 'PAID',
                fulfillment_status: 'processing',
                created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                items: [
                    { product: { name: 'Template CV LaTeX' }, quantity: 1, price: 120 }
                ]
            }
        ];
    },

    renderMyOrdersList() {
        const container = document.getElementById('my-orders-list');

        if (!this.myOrders || this.myOrders.length === 0) {
            container.innerHTML = Components.emptyState('📦', 'Belum ada pesanan', 'Pesanan Anda akan muncul di sini');
            return;
        }

        container.innerHTML = `
            <div class="list">
                ${this.myOrders.map(order => {
            const fulfillmentStatus = order.fulfillment_status || 'processing';
            const statusConfig = this.getOrderStatusConfig(order.status, fulfillmentStatus);

            return `
                        <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 12px;" onclick="Pages.Marketplace.showMyOrderDetail('${order.id}')">
                            <div class="flex items-center gap-md">
                                <div class="list-item-icon" style="background: ${statusConfig.bgColor};">
                                    <i class="fas ${statusConfig.icon}" style="color: ${statusConfig.color};"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="list-item-title">${order.items?.length || 0} Produk</div>
                                    <div class="list-item-subtitle">${Utils.formatDateTime(order.created_at)}</div>
                                </div>
                                <div class="text-right">
                                    <div class="text-primary" style="font-weight: 600;">${Utils.formatCurrency(order.total_amount)}</div>
                                    <span class="badge" style="background: ${statusConfig.bgColor}; color: ${statusConfig.color}; font-size: 10px;">
                                        ${statusConfig.label}
                                    </span>
                                </div>
                            </div>
                            
                            <!-- Order Progress -->
                            <div class="order-progress" style="display: flex; gap: 4px; padding: 0 8px;">
                                ${this.renderOrderProgress(order.status, fulfillmentStatus)}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    getOrderStatusConfig(status, fulfillmentStatus) {
        if (status === 'PAID' && fulfillmentStatus === 'ready') {
            return { label: 'Siap Diambil', icon: 'fa-check-circle', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' };
        } else if (status === 'PAID' && fulfillmentStatus === 'processing') {
            return { label: 'Dikemas', icon: 'fa-box', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' };
        } else if (status === 'READY') {
            return { label: 'Siap Diambil', icon: 'fa-check-circle', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' };
        } else if (status === 'COMPLETED') {
            return { label: 'Selesai', icon: 'fa-check-double', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' };
        } else if (status === 'PENDING') {
            return { label: 'Menunggu', icon: 'fa-clock', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' };
        }
        return { label: status, icon: 'fa-circle', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' };
    },

    renderOrderProgress(status, fulfillmentStatus) {
        const steps = [
            { key: 'paid', label: 'Dibayar', icon: 'fa-credit-card' },
            { key: 'processing', label: 'Dikemas', icon: 'fa-box' },
            { key: 'ready', label: 'Siap Ambil', icon: 'fa-check' }
        ];

        let currentStep = 0;
        if (status === 'PAID' || status === 'READY' || status === 'COMPLETED') currentStep = 1;
        if (fulfillmentStatus === 'processing') currentStep = 2;
        if (fulfillmentStatus === 'ready' || status === 'READY') currentStep = 3;
        if (status === 'COMPLETED') currentStep = 3;

        return steps.map((step, index) => {
            const isActive = index < currentStep;
            const isCurrent = index === currentStep - 1;

            return `
                <div style="flex: 1; text-align: center;">
                    <div style="height: 4px; background: ${isActive ? 'var(--primary)' : 'var(--card)'}; border-radius: 2px; margin-bottom: 4px;"></div>
                    <span style="font-size: 9px; color: ${isActive ? 'var(--primary)' : 'var(--text-muted)'};">
                        ${step.label}
                    </span>
                </div>
            `;
        }).join('');
    },

    showMyOrderDetail(orderId) {
        const order = this.myOrders?.find(o => o.id === orderId);
        if (!order) return;

        const fulfillmentStatus = order.fulfillment_status || 'processing';
        const statusConfig = this.getOrderStatusConfig(order.status, fulfillmentStatus);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Detail Pesanan</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- Status Badge -->
                <div class="text-center mb-lg">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: ${statusConfig.bgColor}; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <i class="fas ${statusConfig.icon}" style="font-size: 36px; color: ${statusConfig.color};"></i>
                    </div>
                    <h3 style="color: ${statusConfig.color};">${statusConfig.label}</h3>
                    <p class="text-muted" style="font-size: 13px;">
                        ${fulfillmentStatus === 'ready' || order.status === 'READY'
                ? 'Pesanan sudah siap! Silakan ambil di tempat penjual.'
                : 'Pesanan sedang dikemas oleh penjual.'}
                    </p>
                </div>
                
                <!-- Progress Steps -->
                <div class="card mb-md" style="padding: 16px;">
                    <div class="flex justify-between">
                        ${this.renderDetailProgress(order.status, fulfillmentStatus)}
                    </div>
                </div>
                
                <!-- Order Items -->
                <h4 class="mb-sm">Barang</h4>
                <div class="list mb-md">
                    ${order.items?.map(item => `
                        <div class="list-item" style="padding: 12px;">
                            <div class="list-item-content">
                                <div class="list-item-title">${Utils.escapeHtml(item.product?.name || 'Produk')}</div>
                                <div class="list-item-subtitle">${item.quantity}x @ ${Utils.formatCurrency(item.price)}</div>
                            </div>
                            <div class="text-primary" style="font-weight: 600;">${Utils.formatCurrency(item.price * item.quantity)}</div>
                        </div>
                    `).join('') || ''}
                </div>
                
                <!-- Total -->
                <div class="flex justify-between items-center p-md" style="background: var(--card); border-radius: 12px;">
                    <span style="font-weight: 600;">Total</span>
                    <span style="font-size: 20px; font-weight: 700; color: var(--primary);">${Utils.formatCurrency(order.total_amount)}</span>
                </div>
                
                <button class="btn btn-secondary btn-block mt-md" onclick="this.closest('.modal-overlay').remove()">
                    Tutup
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    renderDetailProgress(status, fulfillmentStatus) {
        const steps = [
            { key: 'paid', label: 'Dibayar', icon: 'fa-credit-card' },
            { key: 'processing', label: 'Dikemas', icon: 'fa-box' },
            { key: 'ready', label: 'Siap', icon: 'fa-check' }
        ];

        let currentStep = 0;
        if (status === 'PAID' || status === 'READY' || status === 'COMPLETED') currentStep = 1;
        if (fulfillmentStatus === 'processing') currentStep = 2;
        if (fulfillmentStatus === 'ready' || status === 'READY') currentStep = 3;

        return steps.map((step, index) => {
            const isActive = index < currentStep;

            return `
                <div style="text-align: center; flex: 1;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: ${isActive ? 'var(--primary)' : 'var(--card)'}; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; border: 2px solid ${isActive ? 'var(--primary)' : 'var(--text-muted)'};">
                        <i class="fas ${step.icon}" style="color: ${isActive ? 'white' : 'var(--text-muted)'}; font-size: 14px;"></i>
                    </div>
                    <span style="font-size: 11px; color: ${isActive ? 'var(--text)' : 'var(--text-muted)'};">${step.label}</span>
                </div>
            `;
        }).join('');
    },

    async renderMyProductsTab() {
        const content = document.getElementById('marketplace-content');

        content.innerHTML = `
            <!-- Sub tabs for My Products -->
            <div class="tabs-secondary mb-md">
                <button class="tab-btn-sec active" data-tab="products" onclick="Pages.Marketplace.switchMyTab('products')">
                    <i class="fas fa-box"></i> Produk Saya
                </button>
                <button class="tab-btn-sec" data-tab="orders" onclick="Pages.Marketplace.switchMyTab('orders')">
                    <i class="fas fa-shopping-bag"></i> Pesanan Masuk
                </button>
            </div>
            
            <div id="my-products-tab-content">
                <button class="btn btn-primary btn-block mb-lg" onclick="Pages.Marketplace.showCreateProductForm()">
                    <i class="fas fa-plus"></i> Tambah Produk Baru
                </button>
                
                <div id="my-products-list">
                    <div class="text-center text-muted">
                        <div class="spinner" style="margin: 20px auto;"></div>
                        <p>Memuat produk...</p>
                    </div>
                </div>
            </div>
            
            <div id="seller-orders-tab-content" style="display: none;">
                <div id="seller-orders-list">
                    <div class="text-center text-muted">
                        <div class="spinner" style="margin: 20px auto;"></div>
                        <p>Memuat pesanan...</p>
                    </div>
                </div>
            </div>
        `;

        await this.loadMyProducts();
    },

    switchMyTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tabs-secondary .tab-btn-sec').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Show/hide content
        document.getElementById('my-products-tab-content').style.display = tab === 'products' ? 'block' : 'none';
        document.getElementById('seller-orders-tab-content').style.display = tab === 'orders' ? 'block' : 'none';

        // Load data if needed
        if (tab === 'orders') {
            this.loadSellerOrders();
        }
    },

    async loadSellerOrders() {
        const container = document.getElementById('seller-orders-list');

        try {
            const response = await Api.getSellerOrders();

            if (response.success) {
                this.sellerOrders = response.data.orders || [];
                this.renderSellerOrders();
            }
        } catch (error) {
            console.log('Error loading seller orders:', error);
            container.innerHTML = Components.emptyState('📦', 'Tidak ada pesanan', 'Belum ada pesanan masuk untuk produk Anda');
        }
    },

    renderSellerOrders() {
        const container = document.getElementById('seller-orders-list');

        if (!this.sellerOrders || this.sellerOrders.length === 0) {
            container.innerHTML = Components.emptyState('📦', 'Tidak ada pesanan', 'Belum ada pesanan masuk untuk produk Anda');
            return;
        }

        container.innerHTML = `
            <div class="list">
                ${this.sellerOrders.map(order => {
            const statusClass = order.status === 'PAID' ? 'badge-success' :
                order.status === 'PENDING' ? 'badge-warning' : 'badge-secondary';
            const statusLabel = order.status === 'PAID' ? 'Dibayar' :
                order.status === 'PENDING' ? 'Menunggu' : order.status;

            return `
                        <div class="list-item" onclick="Pages.Marketplace.showOrderDetail('${order.order_id}')">
                            <div class="list-item-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                                <i class="fas fa-shopping-bag" style="color: white;"></i>
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">${Utils.escapeHtml(order.buyer_name || 'Pembeli')}</div>
                                <div class="list-item-subtitle">
                                    ${order.items?.length || 0} produk • ${Utils.formatDateTime(order.created_at)}
                                </div>
                                <div class="list-item-subtitle text-muted" style="font-size: 11px;">
                                    ${order.buyer_email || ''}
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-primary" style="font-weight: 600;">${Utils.formatCurrency(order.total_amount)}</div>
                                <span class="badge ${statusClass}" style="font-size: 10px;">${statusLabel}</span>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    showOrderDetail(orderId) {
        const order = this.sellerOrders?.find(o => o.order_id === orderId);
        if (!order) return;

        const fulfillmentStatus = order.fulfillment_status || 'processing';
        const isReady = fulfillmentStatus === 'ready' || order.status === 'READY';

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.id = 'seller-order-detail-modal';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Detail Pesanan</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- Buyer Info -->
                <div class="card mb-md" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));">
                    <div class="flex items-center gap-md mb-sm">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-user" style="color: white; font-size: 20px;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; font-size: 16px;">${Utils.escapeHtml(order.buyer_name || 'Pembeli')}</div>
                            <div class="text-muted" style="font-size: 13px;">${Utils.escapeHtml(order.buyer_email || '')}</div>
                        </div>
                    </div>
                    <div class="text-muted" style="font-size: 12px;">
                        <i class="fas fa-clock"></i> ${Utils.formatDateTime(order.created_at)}
                    </div>
                </div>
                
                <!-- Order Status -->
                <div class="card mb-md" style="background: ${isReady ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; text-align: center; padding: 16px;">
                    <div style="font-size: 32px; margin-bottom: 8px;">${isReady ? '✅' : '📦'}</div>
                    <div style="font-weight: 600; color: ${isReady ? '#10b981' : '#f59e0b'};">
                        ${isReady ? 'Siap Diambil' : 'Sedang Dikemas'}
                    </div>
                </div>
                
                <!-- Order Items -->
                <h4 class="mb-sm">Barang yang Dibeli</h4>
                <div class="list mb-md">
                    ${order.items?.map(item => `
                        <div class="list-item" style="padding: 12px;">
                            <div class="list-item-content">
                                <div class="list-item-title">${Utils.escapeHtml(item.product_name)}</div>
                                <div class="list-item-subtitle">${item.quantity}x @ ${Utils.formatCurrency(item.price)}</div>
                            </div>
                            <div class="text-primary" style="font-weight: 600;">${Utils.formatCurrency(item.subtotal)}</div>
                        </div>
                    `).join('') || ''}
                </div>
                
                <!-- Total -->
                <div class="flex justify-between items-center p-md" style="background: var(--card); border-radius: 12px;">
                    <span style="font-weight: 600;">Total</span>
                    <span style="font-size: 20px; font-weight: 700; color: var(--primary);">${Utils.formatCurrency(order.total_amount)}</span>
                </div>
                
                ${order.status === 'PAID' && !isReady ? `
                    <button class="btn btn-primary btn-block mt-md" onclick="Pages.Marketplace.markOrderReady('${orderId}')">
                        <i class="fas fa-check"></i> Tandai Siap Diambil
                    </button>
                ` : ''}
                
                ${isReady ? `
                    <div class="alert alert-success mt-md">
                        <i class="fas fa-check-circle"></i> Pesanan siap! Tunggu pembeli datang mengambil.
                    </div>
                ` : ''}
                
                <button class="btn btn-secondary btn-block mt-sm" onclick="this.closest('.modal-overlay').remove()">
                    Tutup
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    async markOrderReady(orderId) {
        // Update local state
        const order = this.sellerOrders?.find(o => o.order_id === orderId);
        if (order) {
            order.fulfillment_status = 'ready';
            order.status = 'READY';
        }

        // Try to update via API
        try {
            await Api.request(`/orders/${orderId}/status`, {
                method: 'PUT',
                body: { status: 'READY', fulfillment_status: 'ready' }
            });
        } catch (error) {
            console.log('API not available, updating locally');
        }

        // Close modal and refresh
        document.getElementById('seller-order-detail-modal')?.remove();
        Utils.toast('Pesanan ditandai siap diambil!', 'success');

        // Re-render the order detail
        this.showOrderDetail(orderId);
    },

    setupSearchListeners() {
        const searchInput = document.getElementById('search-input');
        const categoryFilter = document.getElementById('category-filter');

        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => {
                this.loadProducts();
            }, 300));
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.loadProducts();
            });
        }
    },

    async loadProducts() {
        const search = document.getElementById('search-input')?.value || '';
        const category = document.getElementById('category-filter')?.value || '';

        try {
            const response = await Api.getProducts(1, 20, category, search);
            if (response.success) {
                // Filter out products with 0 stock (unless stock is -1 which means unlimited)
                this.products = (response.data.products || []).filter(p => {
                    // Show if stock is unlimited (-1) or has stock > 0
                    return p.stock === -1 || p.stock > 0;
                });
                this.renderProducts();
            }
        } catch (error) {
            Utils.toast('Gagal memuat produk', 'error');
        }
    },

    renderProducts() {
        const grid = document.getElementById('products-grid');

        if (this.products.length === 0) {
            grid.innerHTML = Components.emptyState('🛍️', 'Tidak ada produk', 'Belum ada produk yang tersedia');
            return;
        }

        grid.innerHTML = this.products.map(p => Components.productCard(p)).join('');
    },

    async loadMyProducts() {
        try {
            // Get products filtered by current user (seller)
            const response = await Api.getProducts(1, 50);
            if (response.success) {
                const userId = Auth.getUser()?.id;
                this.myProducts = response.data.products.filter(p => p.seller_id === userId || p.seller?.id === userId);
                this.renderMyProducts();
            }
        } catch (error) {
            Utils.toast('Gagal memuat produk', 'error');
        }
    },

    renderMyProducts() {
        const container = document.getElementById('my-products-list');

        if (this.myProducts.length === 0) {
            container.innerHTML = Components.emptyState('📦', 'Belum ada produk', 'Klik tombol di atas untuk menambah produk');
            return;
        }

        container.innerHTML = `
            <div class="list">
                ${this.myProducts.map(p => {
            // Stock badge for dosen view - handle undefined/null
            let stockBadge = '';
            const stock = p.stock;
            if (stock === undefined || stock === null) {
                stockBadge = '<span class="badge">-</span>';
            } else if (stock === -1) {
                stockBadge = '<span class="badge badge-success">∞</span>';
            } else if (stock === 0) {
                stockBadge = '<span class="badge badge-danger">Habis</span>';
            } else if (stock <= 5) {
                stockBadge = `<span class="badge badge-warning">Sisa ${stock}</span>`;
            } else {
                stockBadge = `<span class="badge">Stok ${stock}</span>`;
            }

            // Check thumbnail - handle null, undefined, empty string
            const hasThumbnail = p.thumbnail_url && typeof p.thumbnail_url === 'string' && p.thumbnail_url.length > 10;
            const iconClass = p.category === 'ebook' ? 'book' : p.category === 'ecourse' ? 'play' : 'file';

            return `
                    <div class="list-item ${p.stock === 0 ? 'opacity-60' : ''}">
                        <div class="list-item-icon ${hasThumbnail ? 'has-thumbnail' : ''}" style="${!hasThumbnail ? 'background: linear-gradient(135deg, #667eea, #764ba2);' : ''}">
                            ${hasThumbnail ?
                    `<img src="${p.thumbnail_url}" alt="${Utils.escapeHtml(p.name)}" 
                                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"
                                     onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-${iconClass}\\' style=\\'color: white;\\'></i>'; this.parentElement.style.background='linear-gradient(135deg, #667eea, #764ba2)';">` :
                    `<i class="fas fa-${iconClass}" style="color: white;"></i>`
                }
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${Utils.escapeHtml(p.name)}</div>
                            <div class="list-item-subtitle">
                                ${p.category || 'Produk'} • Terjual ${p.total_sold || 0} • ${stockBadge}
                            </div>
                        </div>
                        <div class="list-item-value text-primary">${Utils.formatCurrency(p.price)}</div>
                        <div class="flex gap-xs">
                            <button class="btn btn-ghost btn-sm" onclick="Pages.Marketplace.editProduct('${p.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-ghost btn-sm" onclick="Pages.Marketplace.deleteProduct('${p.id}')">
                                <i class="fas fa-trash text-danger"></i>
                            </button>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    },

    showCreateProductForm() {
        this.showProductForm();
    },

    editProduct(productId) {
        const product = this.myProducts.find(p => p.id === productId);
        if (product) {
            this.showProductForm(product);
        }
    },

    // Store selected image as base64
    selectedProductImage: null,

    showProductForm(product = null) {
        const isEdit = !!product;
        this.selectedProductImage = isEdit ? (product.thumbnail_url || null) : null;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal" style="max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3 class="modal-title">${isEdit ? 'Edit Produk' : 'Tambah Produk'}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="product-form">
                    <!-- Image Upload -->
                    <div class="form-group">
                        <label class="form-label">Foto Produk</label>
                        <div class="image-upload-container" onclick="document.getElementById('product-image').click()">
                            <input type="file" id="product-image" accept="image/*" style="display: none;">
                            <div id="image-preview" class="image-preview ${this.selectedProductImage ? 'has-image' : ''}">
                                ${this.selectedProductImage ?
                `<img src="${this.selectedProductImage}" alt="Preview">
                                     <button type="button" class="remove-image-btn" onclick="event.stopPropagation(); Pages.Marketplace.removeProductImage()">
                                         <i class="fas fa-times"></i>
                                     </button>` :
                `<div class="upload-placeholder">
                                        <i class="fas fa-camera"></i>
                                        <span>Klik untuk upload foto</span>
                                    </div>`
            }
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Nama Produk *</label>
                        <input type="text" class="form-input" id="product-name" 
                               value="${isEdit ? Utils.escapeHtml(product.name) : ''}" 
                               placeholder="Contoh: Modul Pemrograman Java" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Deskripsi</label>
                        <textarea class="form-input" id="product-description" rows="3" 
                                  placeholder="Jelaskan produk Anda...">${isEdit ? Utils.escapeHtml(product.description || '') : ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Harga (Rp) *</label>
                        <input type="number" class="form-input" id="product-price" 
                               value="${isEdit ? product.price : ''}" 
                               placeholder="25000" min="100" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Kategori *</label>
                        <select class="form-input form-select" id="product-category" required>
                            <option value="">Pilih kategori</option>
                            <option value="ebook" ${isEdit && product.category === 'ebook' ? 'selected' : ''}>E-Book</option>
                            <option value="ecourse" ${isEdit && product.category === 'ecourse' ? 'selected' : ''}>E-Course</option>
                            <option value="material" ${isEdit && product.category === 'material' ? 'selected' : ''}>Materi</option>
                            <option value="other" ${isEdit && product.category === 'other' ? 'selected' : ''}>Lainnya</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Stok * <small class="text-muted">(-1 = unlimited)</small></label>
                        <input type="number" class="form-input" id="product-stock" 
                               value="${isEdit ? (product.stock !== undefined && product.stock !== null ? product.stock : 10) : 10}" min="-1" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block">
                        <i class="fas fa-${isEdit ? 'save' : 'plus'}"></i> 
                        ${isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);

        // Setup image upload handler
        document.getElementById('product-image').addEventListener('change', (e) => {
            this.handleProductImageUpload(e);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.getElementById('product-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                name: document.getElementById('product-name').value.trim(),
                description: document.getElementById('product-description').value.trim(),
                price: parseFloat(document.getElementById('product-price').value),
                category: document.getElementById('product-category').value,
                stock: parseInt(document.getElementById('product-stock').value),
                thumbnail_url: this.selectedProductImage || ''
            };

            Utils.showLoading(isEdit ? 'Menyimpan...' : 'Menambahkan...');

            try {
                let response;
                if (isEdit) {
                    response = await Api.request(`/products/${product.id}`, {
                        method: 'PUT',
                        body: data
                    });
                } else {
                    response = await Api.createProduct(data);
                }

                Utils.hideLoading();

                if (response.success) {
                    overlay.remove();
                    this.selectedProductImage = null;
                    Utils.toast(isEdit ? 'Produk berhasil diupdate!' : 'Produk berhasil ditambahkan!', 'success');
                    await this.loadMyProducts();
                }
            } catch (error) {
                Utils.hideLoading();
                Utils.toast(error.message || 'Gagal menyimpan produk', 'error');
            }
        });
    },

    handleProductImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            Utils.toast('File harus berupa gambar', 'error');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            Utils.toast('Ukuran gambar maksimal 2MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            this.selectedProductImage = event.target.result;
            this.updateImagePreview();
        };
        reader.readAsDataURL(file);
    },

    updateImagePreview() {
        const preview = document.getElementById('image-preview');
        if (preview) {
            if (this.selectedProductImage) {
                preview.className = 'image-preview has-image';
                preview.innerHTML = `
                    <img src="${this.selectedProductImage}" alt="Preview">
                    <button type="button" class="remove-image-btn" onclick="event.stopPropagation(); Pages.Marketplace.removeProductImage()">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            } else {
                preview.className = 'image-preview';
                preview.innerHTML = `
                    <div class="upload-placeholder">
                        <i class="fas fa-camera"></i>
                        <span>Klik untuk upload foto</span>
                    </div>
                `;
            }
        }
    },

    removeProductImage() {
        this.selectedProductImage = null;
        document.getElementById('product-image').value = '';
        this.updateImagePreview();
    },

    async deleteProduct(productId) {
        const confirmed = await Utils.confirm('Hapus produk ini?', 'Konfirmasi Hapus');
        if (!confirmed) return;

        Utils.showLoading('Menghapus...');

        try {
            const response = await Api.request(`/products/${productId}`, {
                method: 'DELETE'
            });

            Utils.hideLoading();

            if (response.success) {
                Utils.toast('Produk berhasil dihapus', 'success');
                await this.loadMyProducts();
            }
        } catch (error) {
            Utils.hideLoading();
            Utils.toast(error.message || 'Gagal menghapus produk', 'error');
        }
    },

    showProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const iconMap = { 'ebook': 'fa-book', 'ecourse': 'fa-play-circle', 'material': 'fa-file-alt', 'other': 'fa-box' };
        const icon = iconMap[product.category] || 'fa-box';

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Detail Produk</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 120px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                    <i class="fas ${icon}" style="font-size: 40px; color: rgba(255,255,255,0.5);"></i>
                </div>
                
                <h3 class="mb-sm">${Utils.escapeHtml(product.name)}</h3>
                <p class="text-muted mb-md" style="font-size: 14px;">${Utils.escapeHtml(product.description || 'Tidak ada deskripsi')}</p>
                
                <div class="flex justify-between items-center mb-md">
                    <span class="text-muted">Kategori</span>
                    <span class="badge">${product.category}</span>
                </div>
                
                <div class="flex justify-between items-center mb-md">
                    <span class="text-muted">Penjual</span>
                    <span>${Utils.escapeHtml(product.seller?.name || 'Unknown')}</span>
                </div>
                
                <div class="flex justify-between items-center mb-lg">
                    <span class="text-muted">Terjual</span>
                    <span>${product.total_sold || 0} item</span>
                </div>
                
                <div style="font-size: 24px; font-weight: 700; color: var(--primary); margin-bottom: 16px;">
                    ${Utils.formatCurrency(product.price)}
                </div>
                
                <button class="btn btn-primary btn-block" onclick="Pages.Marketplace.addToCart('${product.id}')">
                    <i class="fas fa-cart-plus"></i> Tambah ke Keranjang
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    },

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const existing = this.cart.find(item => item.product_id === productId);
        if (existing) {
            existing.quantity++;
        } else {
            this.cart.push({ product_id: productId, quantity: 1, product });
        }

        this.saveCart(); // Persist to localStorage
        this.updateCartBadge();
        document.querySelector('.modal-overlay')?.remove();
        Utils.toast('Ditambahkan ke keranjang', 'success');
    },

    updateCartBadge() {
        const badge = document.getElementById('cart-badge');
        if (badge) {
            badge.textContent = this.cart.length;
            badge.style.display = this.cart.length > 0 ? 'flex' : 'none';
        }
    },

    async showCart() {
        if (this.cart.length === 0) {
            Utils.toast('Keranjang kosong', 'info');
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

        // Get user wallet balance
        let balance = 0;
        try {
            const walletRes = await Api.getWallet();
            balance = walletRes?.data?.wallet?.balance || 0;
        } catch (e) {
            console.log('Could not fetch wallet balance');
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Keranjang (${this.cart.length})</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="list mb-lg">
                    ${this.cart.map((item, index) => `
                        <div class="list-item">
                            <div class="list-item-content">
                                <div class="list-item-title">${Utils.escapeHtml(item.product.name)}</div>
                                <div class="list-item-subtitle">x${item.quantity}</div>
                            </div>
                            <div class="list-item-value">${Utils.formatCurrency(item.product.price * item.quantity)}</div>
                            <button class="btn btn-ghost btn-sm" onclick="Pages.Marketplace.removeFromCart(${index})">
                                <i class="fas fa-trash text-danger"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <div class="flex justify-between items-center mb-md">
                    <span class="text-muted">Total</span>
                    <span style="font-size: 24px; font-weight: 700; color: var(--primary);">${Utils.formatCurrency(total)}</span>
                </div>
                
                <div class="flex justify-between items-center mb-lg" style="font-size: 14px;">
                    <span class="text-muted">Saldo Anda</span>
                    <span class="${balance >= total ? 'text-success' : 'text-danger'}" style="font-weight: 600;">${Utils.formatCurrency(balance)}</span>
                </div>
                
                <button class="btn btn-primary btn-block mb-sm" onclick="Pages.Marketplace.showPaymentMethod(${total}, ${balance})">
                    <i class="fas fa-credit-card"></i> Checkout
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    },

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.saveCart(); // Persist to localStorage
        this.updateCartBadge();
        document.querySelector('.modal-overlay')?.remove();
        if (this.cart.length > 0) this.showCart();
    },

    showPaymentMethod(total, balance) {
        document.querySelector('.modal-overlay')?.remove();

        const canPayWithBalance = balance >= total;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Konfirmasi Pembayaran</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="mb-lg text-center">
                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">Total Pembayaran</div>
                    <div style="font-size: 32px; font-weight: 700; color: var(--primary);">${Utils.formatCurrency(total)}</div>
                </div>
                
                <!-- Balance Info -->
                <div class="card mb-lg" style="background: ${canPayWithBalance ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};">
                    <div class="flex items-center gap-md">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: ${canPayWithBalance ? '#10b981' : '#ef4444'}; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-wallet" style="color: white; font-size: 20px;"></i>
                        </div>
                        <div class="flex-1">
                            <div class="text-muted" style="font-size: 12px;">Saldo Poin Anda</div>
                            <div style="font-weight: 700; font-size: 20px; color: ${canPayWithBalance ? '#10b981' : '#ef4444'};">
                                ${Utils.formatCurrency(balance)}
                            </div>
                        </div>
                        ${canPayWithBalance ? `
                            <i class="fas fa-check-circle" style="color: #10b981; font-size: 24px;"></i>
                        ` : `
                            <span class="badge badge-danger">Kurang</span>
                        `}
                    </div>
                </div>
                
                ${!canPayWithBalance ? `
                    <div class="alert alert-danger mb-lg" style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; border-radius: 12px; padding: 12px;">
                        <div class="flex items-center gap-sm">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>
                                <strong>Saldo Tidak Cukup</strong>
                                <div style="font-size: 12px; margin-top: 4px;">
                                    Anda membutuhkan ${Utils.formatCurrency(total - balance)} poin lagi. 
                                    Selesaikan quiz untuk mendapatkan poin!
                                </div>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="mb-lg">
                        <div class="flex justify-between text-muted" style="font-size: 13px; margin-bottom: 8px;">
                            <span>Saldo saat ini</span>
                            <span>${Utils.formatCurrency(balance)}</span>
                        </div>
                        <div class="flex justify-between text-muted" style="font-size: 13px; margin-bottom: 8px;">
                            <span>Total belanja</span>
                            <span style="color: #ef4444;">-${Utils.formatCurrency(total)}</span>
                        </div>
                        <hr style="border: none; border-top: 1px dashed var(--border); margin: 12px 0;">
                        <div class="flex justify-between" style="font-weight: 600;">
                            <span>Sisa saldo</span>
                            <span style="color: var(--accent);">${Utils.formatCurrency(balance - total)}</span>
                        </div>
                    </div>
                `}
                
                <div class="flex gap-sm">
                    <button class="btn btn-secondary flex-1" onclick="this.closest('.modal-overlay').remove(); Pages.Marketplace.showCart()">
                        <i class="fas fa-arrow-left"></i> Kembali
                    </button>
                    ${canPayWithBalance ? `
                        <button class="btn btn-primary flex-1" onclick="Pages.Marketplace.payWithBalance(${total})">
                            <i class="fas fa-check"></i> Bayar
                        </button>
                    ` : `
                        <button class="btn btn-primary flex-1" onclick="this.closest('.modal-overlay').remove(); Router.navigate('/missions')">
                            <i class="fas fa-trophy"></i> Ke Quiz
                        </button>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    },

    async payWithBalance(total) {
        document.querySelector('.modal-overlay')?.remove();

        const items = this.cart.map(item => ({
            product_id: item.product_id,
            product_name: item.product.name,
            quantity: item.quantity,
            price: item.product.price
        }));

        Utils.showLoading('Memproses pembayaran...');

        try {
            // Create order with balance payment
            const response = await Api.createOrder(items, 'balance');
            Utils.hideLoading();

            if (response.success) {
                this.saveOrderToLocal(total, items);
                this.clearCart(); // Clear cart and localStorage
                this.updateCartBadge();
                this.showPaymentSuccess(response.data, 'balance', total);
            }
        } catch (error) {
            Utils.hideLoading();
            Utils.toast(error.message || 'Pembayaran gagal', 'error');
        }
    },

    saveOrderToLocal(total, items) {
        const orders = Utils.storage.get('wp_my_orders') || [];

        const newOrder = {
            id: 'order-' + Date.now(),
            total_amount: total,
            status: 'PAID',
            fulfillment_status: 'processing',
            created_at: new Date().toISOString(),
            items: items.map(item => ({
                product: { name: item.product_name },
                quantity: item.quantity,
                price: item.price
            }))
        };

        orders.unshift(newOrder);
        Utils.storage.set('wp_my_orders', orders);
    },

    async payWithQRIS(total) {
        document.querySelector('.modal-overlay')?.remove();

        const items = this.cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        }));

        Utils.showLoading('Membuat QR Code...');

        try {
            // Create order with QRIS payment
            const response = await Api.createOrder(items, 'qris');
            Utils.hideLoading();

            if (response.success) {
                this.showQRISPayment(response.data, total);
            }
        } catch (error) {
            Utils.hideLoading();
            Utils.toast(error.message || 'Gagal membuat QRIS', 'error');
        }
    },

    // QRIS Payment state
    qrisState: {
        orderId: null,
        total: 0,
        items: [],
        expiresAt: null,
        pollInterval: null,
        countdownInterval: null
    },

    showQRISPayment(data, total) {
        const orderId = data.order?.id || 'TEST-' + Date.now();
        const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes from now
        const qrData = `WALLETPOINT-ORDER-${orderId}-${Date.now()}`;

        // Store state
        this.qrisState = {
            orderId,
            total,
            qrData,
            items: this.cart.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
            expiresAt,
            pollInterval: null,
            countdownInterval: null
        };

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.id = 'qris-payment-modal';
        overlay.innerHTML = `
            <div class="modal text-center" style="max-width: 350px;">
                <div class="modal-header">
                    <h3 class="modal-title">Pembayaran QRIS</h3>
                    <button class="modal-close" onclick="Pages.Marketplace.closeQRISModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div id="qris-qr-container" style="background: white; padding: 24px; border-radius: 16px; margin-bottom: 16px;">
                    <canvas id="qris-qr-canvas" style="max-width: 100%;"></canvas>
                </div>
                
                <div style="font-size: 28px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">
                    ${Utils.formatCurrency(total)}
                </div>
                
                <div id="qris-timer" class="badge badge-warning mb-md" style="font-size: 14px; padding: 8px 16px;">
                    <i class="fas fa-clock"></i> <span id="qris-countdown">10:00</span>
                </div>
                
                <div id="qris-status" class="mb-md">
                    <div class="flex items-center justify-center gap-sm text-muted" style="font-size: 13px;">
                        <div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
                        <span>Menunggu pembayaran...</span>
                    </div>
                </div>
                
                <p class="text-muted mb-md" style="font-size: 13px;">
                    Scan QR code di atas menggunakan aplikasi<br>e-wallet atau mobile banking Anda
                </p>
                
                <div class="flex flex-col gap-sm">
                    <button class="btn btn-primary btn-block" onclick="Pages.Marketplace.downloadQRISCode()">
                        <i class="fas fa-download"></i> Download QR Code
                    </button>
                    <button class="btn btn-secondary btn-block" onclick="Pages.Marketplace.closeQRISModal()">
                        Batal
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Generate QR Code
        this.generateQRISCode(qrData, total);

        // Start countdown timer
        this.startQRISCountdown();

        // Start polling for payment status
        this.startPaymentStatusPolling();
    },

    generateQRISCode(qrData, amount) {
        const canvas = document.getElementById('qris-qr-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const size = 200;
        canvas.width = size;
        canvas.height = size;

        // Fill white background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Generate QR using qrcode-generator if available
        if (typeof qrcode !== 'undefined') {
            try {
                const qr = qrcode(0, 'M');
                qr.addData(qrData);
                qr.make();

                const moduleCount = qr.getModuleCount();
                const cellSize = Math.floor(size / moduleCount);
                const offset = Math.floor((size - moduleCount * cellSize) / 2);

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
            } catch (e) {
                console.error('QR generation error:', e);
                this.drawFallbackQRIS(ctx, qrData, size);
            }
        } else {
            this.drawFallbackQRIS(ctx, qrData, size);
        }
    },

    drawFallbackQRIS(ctx, code, size) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QRIS', size / 2, size / 2 - 10);

        ctx.font = '10px monospace';
        ctx.fillText(code.substring(0, 25), size / 2, size / 2 + 15);

        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, size - 20, size - 20);
    },

    downloadQRISCode() {
        const canvas = document.getElementById('qris-qr-canvas');
        if (!canvas) {
            Utils.toast('QR Code tidak tersedia', 'error');
            return;
        }

        // Create a new canvas with amount text
        const downloadCanvas = document.createElement('canvas');
        const ctx = downloadCanvas.getContext('2d');
        downloadCanvas.width = 250;
        downloadCanvas.height = 300;

        // White background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);

        // Draw QR code
        ctx.drawImage(canvas, 25, 20, 200, 200);

        // Add amount
        ctx.fillStyle = '#333';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(Utils.formatCurrency(this.qrisState.total), 125, 250);

        // Add text
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('WalletPoint Payment', 125, 275);

        // Download
        const link = document.createElement('a');
        link.download = 'walletpoint-qris-' + Date.now() + '.png';
        link.href = downloadCanvas.toDataURL('image/png');
        link.click();

        Utils.toast('QR Code berhasil didownload!', 'success');
    },

    startQRISCountdown() {
        const updateCountdown = () => {
            const now = Date.now();
            const remaining = Math.max(0, this.qrisState.expiresAt - now);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            const countdownEl = document.getElementById('qris-countdown');
            const timerEl = document.getElementById('qris-timer');

            if (countdownEl) {
                countdownEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }

            // Change color when less than 2 minutes
            if (timerEl && remaining < 120000) {
                timerEl.className = 'badge badge-danger mb-md';
                timerEl.style.animation = 'pulse 1s infinite';
            }

            // If expired, refresh QR
            if (remaining <= 0) {
                this.refreshQRCode();
            }
        };

        // Update immediately
        updateCountdown();

        // Update every second
        this.qrisState.countdownInterval = setInterval(updateCountdown, 1000);
    },

    refreshQRCode() {
        // Clear old intervals
        if (this.qrisState.countdownInterval) {
            clearInterval(this.qrisState.countdownInterval);
        }

        // Set new expiry time
        this.qrisState.expiresAt = Date.now() + (10 * 60 * 1000);

        // Update QR code with new timestamp
        const qrImage = document.getElementById('qris-qr-image');
        if (qrImage) {
            qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=WALLETPOINT-ORDER-${this.qrisState.orderId}-${Date.now()}`;
        }

        // Reset timer badge color
        const timerEl = document.getElementById('qris-timer');
        if (timerEl) {
            timerEl.className = 'badge badge-warning mb-md';
            timerEl.style.animation = '';
        }

        // Show refresh notification
        Utils.toast('QR Code diperbarui', 'info');

        // Restart countdown
        this.startQRISCountdown();
    },

    startPaymentStatusPolling() {
        // Store pending transaction in localStorage for persistence
        this.pendingQRISTransaction = {
            orderId: this.qrisState.orderId,
            total: this.qrisState.total,
            items: this.qrisState.items,
            qrData: this.qrisState.qrData,
            createdAt: Date.now(),
            expiresAt: this.qrisState.expiresAt
        };
        localStorage.setItem('walletpoint_pending_qris', JSON.stringify(this.pendingQRISTransaction));

        // Poll every 3 seconds
        this.qrisState.pollInterval = setInterval(async () => {
            try {
                // Check order status from backend
                const response = await Api.getOrderById(this.qrisState.orderId);

                if (response.success && response.data.order) {
                    const order = response.data.order;

                    // If order is paid, show success
                    if (order.status === 'PAID' || order.status === 'SUCCESS' || order.status === 'COMPLETED') {
                        this.onQRISPaymentSuccess();
                    }
                }
            } catch (e) {
                // Silently ignore polling errors
                console.log('Payment status check:', e.message);
            }
        }, 3000);

        // NO AUTO-COMPLETE - Payment only completes when QR is scanned
        // The scan is done via the Scan page when user selects the downloaded QR image
    },

    // Called when QR code is scanned (from Pages.Scan)
    processScannedQRPayment(qrData) {
        // Check if this matches our pending QRIS transaction
        const pending = JSON.parse(localStorage.getItem('walletpoint_pending_qris') || 'null');

        if (!pending) {
            return { success: false, message: 'Tidak ada transaksi pending' };
        }

        // Check if QR matches
        if (!qrData.includes('WALLETPOINT-ORDER')) {
            return { success: false, message: 'QR code tidak valid' };
        }

        // Check if expired
        if (Date.now() > pending.expiresAt) {
            localStorage.removeItem('walletpoint_pending_qris');
            return { success: false, message: 'Transaksi sudah kadaluarsa' };
        }

        // Process payment
        this.qrisState = {
            orderId: pending.orderId,
            total: pending.total,
            items: pending.items
        };

        // Clear pending
        localStorage.removeItem('walletpoint_pending_qris');

        return { success: true, pending };
    },

    // Manual trigger for payment (for testing)
    manualConfirmPayment() {
        const statusEl = document.getElementById('qris-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="flex items-center justify-center gap-sm text-success" style="font-size: 14px;">
                    <i class="fas fa-check-circle"></i>
                    <span>Pembayaran diterima!</span>
                </div>
            `;
        }

        setTimeout(() => {
            this.onQRISPaymentSuccess();
        }, 1500);
    },

    onQRISPaymentSuccess() {
        // Clear intervals
        this.stopQRISPolling();

        // Clear pending transaction
        localStorage.removeItem('walletpoint_pending_qris');

        // Clear cart and localStorage
        this.clearCart();
        this.updateCartBadge();

        // Close modal and show success
        document.getElementById('qris-payment-modal')?.remove();
        this.showPaymentSuccess({
            order: { id: this.qrisState.orderId, total_amount: this.qrisState.total }
        }, 'qris', this.qrisState.total);
    },

    stopQRISPolling() {
        if (this.qrisState?.pollInterval) {
            clearInterval(this.qrisState.pollInterval);
            this.qrisState.pollInterval = null;
        }
        if (this.qrisState?.countdownInterval) {
            clearInterval(this.qrisState.countdownInterval);
            this.qrisState.countdownInterval = null;
        }
    },

    closeQRISModal() {
        // Only stop visual countdown, NOT the polling
        if (this.qrisState?.countdownInterval) {
            clearInterval(this.qrisState.countdownInterval);
            this.qrisState.countdownInterval = null;
        }

        document.getElementById('qris-payment-modal')?.remove();

        // Show notification that transaction is still pending
        Utils.toast('Transaksi masih berjalan di background. Scan QR untuk menyelesaikan.', 'info');
    },

    // Check for pending QRIS transaction
    checkPendingQRISTransaction() {
        const pending = JSON.parse(localStorage.getItem('walletpoint_pending_qris') || 'null');
        if (pending && Date.now() < pending.expiresAt) {
            return pending;
        } else if (pending) {
            // Expired, clear it
            localStorage.removeItem('walletpoint_pending_qris');
        }
        return null;
    },

    showPaymentSuccess(data, method, total) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal text-center">
                <div style="font-size: 80px; margin-bottom: 16px;">🎉</div>
                <h2 class="mb-sm">Pembayaran Berhasil!</h2>
                <p class="text-muted mb-lg">Terima kasih atas pembelian Anda</p>
                
                <div class="card mb-lg" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));">
                    <div style="font-size: 32px; font-weight: 700; color: var(--success);">
                        ${Utils.formatCurrency(total)}
                    </div>
                    <div class="text-muted" style="font-size: 13px; margin-top: 8px;">
                        <i class="fas fa-${method === 'balance' ? 'wallet' : 'qrcode'}"></i>
                        Dibayar dengan ${method === 'balance' ? 'Poin/Saldo' : 'QRIS'}
                    </div>
                </div>
                
                <div class="text-muted mb-lg" style="font-size: 13px;">
                    Order ID: ${data.order?.id || 'ORD-' + Date.now()}
                </div>
                
                <button class="btn btn-primary btn-block" onclick="this.closest('.modal-overlay').remove(); Router.navigate('/dashboard')">
                    <i class="fas fa-home"></i> Kembali ke Dashboard
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
    }
};
