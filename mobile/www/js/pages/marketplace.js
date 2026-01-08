/**
 * WalletPoint - Marketplace Page
 */
const MarketplacePage = {
    products: [],
    currentPage: 1,

    render(container) {
        container.innerHTML = `
            ${Components.pageHeader('Marketplace', true)}
            
            <div class="p-md">
                <div class="form-group">
                    <input type="text" class="form-input" placeholder="🔍 Cari produk..." id="search-input">
                </div>
            </div>
            
            <div id="products-grid" class="product-grid">
                ${this.renderSkeletonProducts()}
            </div>
        `;

        this.loadProducts();
        this.bindEvents();
    },

    bindEvents() {
        const searchInput = document.getElementById('search-input');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterProducts(e.target.value);
            }, 300);
        });
    },

    renderSkeletonProducts() {
        return Array(4).fill(`
            <div class="product-card" style="opacity: 0.5;">
                <div class="skeleton" style="aspect-ratio: 1;"></div>
                <div class="product-info">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text" style="width: 60%;"></div>
                </div>
            </div>
        `).join('');
    },

    async loadProducts() {
        try {
            const result = await API.getProducts(1, 20);
            if (result.success) {
                this.products = result.data || [];
                this.renderProducts();
            }
        } catch (e) {
            console.error('Failed to load products:', e);
            this.showError();
        }
    },

    renderProducts() {
        const grid = document.getElementById('products-grid');

        if (this.products.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1;">
                    ${Components.emptyState('🛒', 'Belum ada produk', 'Dosen belum menambahkan produk')}
                </div>
            `;
            return;
        }

        grid.innerHTML = this.products.map(product => this.renderProductCard(product)).join('');
    },

    renderProductCard(product) {
        const icon = this.getProductIcon(product.product_type);

        return `
            <div class="product-card" onclick="MarketplacePage.viewDetail(${product.id})">
                <div class="product-image">
                    ${product.thumbnail_url
                ? `<img src="${product.thumbnail_url}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;">`
                : icon
            }
                </div>
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-seller">${product.seller_name || 'Dosen'}</div>
                    <div class="product-price">${Components.formatPoints(product.price)} pts</div>
                </div>
            </div>
        `;
    },

    getProductIcon(type) {
        const icons = {
            'EBOOK': '📚',
            'ECOURSE': '🎓',
            'MATERIAL': '📄',
            'OTHER': '📦'
        };
        return icons[type] || '📦';
    },

    filterProducts(query) {
        const grid = document.getElementById('products-grid');

        if (!query) {
            this.renderProducts();
            return;
        }

        const filtered = this.products.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
        );

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1;">
                    ${Components.emptyState('🔍', 'Tidak ditemukan', `Tidak ada produk dengan kata kunci "${query}"`)}
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(product => this.renderProductCard(product)).join('');
    },

    async viewDetail(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        const icon = this.getProductIcon(product.product_type);

        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${product.name}</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            
            <div class="text-center mb-lg">
                <div style="font-size: 64px;">${icon}</div>
            </div>
            
            ${product.description ? `<p class="mb-md">${product.description}</p>` : ''}
            
            <div class="flex-between mb-sm">
                <span class="text-muted">Penjual:</span>
                <span>${product.seller_name || 'Dosen'}</span>
            </div>
            <div class="flex-between mb-sm">
                <span class="text-muted">Tipe:</span>
                <span>${this.getProductTypeLabel(product.product_type)}</span>
            </div>
            <div class="flex-between mb-sm">
                <span class="text-muted">Terjual:</span>
                <span>${product.sold_count || 0}x</span>
            </div>
            ${product.stock !== null ? `
                <div class="flex-between mb-sm">
                    <span class="text-muted">Stok:</span>
                    <span>${product.stock}</span>
                </div>
            ` : ''}
            
            <div class="card mt-lg" style="background: var(--gradient-primary);">
                <div class="flex-between" style="color: white;">
                    <span>Harga</span>
                    <span style="font-size: 24px; font-weight: 700;">
                        ${Components.formatPoints(product.price)} pts
                    </span>
                </div>
            </div>
            
            <button class="btn btn-primary btn-block mt-lg" onclick="MarketplacePage.buyProduct(${product.id})">
                🛒 Beli Sekarang
            </button>
        `;

        modal.classList.remove('hidden');
    },

    getProductTypeLabel(type) {
        const labels = {
            'EBOOK': 'E-Book',
            'ECOURSE': 'E-Course',
            'MATERIAL': 'Materi Kuliah',
            'OTHER': 'Lainnya'
        };
        return labels[type] || type;
    },

    async buyProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Confirm purchase
        const confirmed = confirm(`Beli "${product.name}" seharga ${Components.formatPoints(product.price)} poin?`);
        if (!confirmed) return;

        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="text-center p-lg">
                <div class="loading-spinner mb-md" style="margin: 0 auto;"></div>
                <p>Memproses pembelian...</p>
            </div>
        `;

        try {
            const result = await API.createOrder(productId);

            if (result.success) {
                this.showPurchaseSuccess(product, result.data);
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            App.showToast(e.response?.message || 'Pembelian gagal', 'error');
            App.closeModal();
        }
    },

    showPurchaseSuccess(product, orderData) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="text-center p-lg">
                <div class="mb-md" style="font-size: 64px;">🎉</div>
                <h3 class="mb-md">Pembelian Berhasil!</h3>
                
                <div class="card mb-lg">
                    <strong>${product.name}</strong>
                    <div class="text-muted mt-sm">Kode Order: ${orderData.order_code || '-'}</div>
                </div>
                
                <p class="text-muted text-sm mb-lg">
                    Produk digital dapat diakses di halaman "Pesanan Saya"
                </p>
                
                <button class="btn btn-primary btn-block" onclick="App.closeModal(); Router.navigate('dashboard');">
                    Selesai
                </button>
            </div>
        `;
    },

    showError() {
        const grid = document.getElementById('products-grid');
        grid.innerHTML = `
            <div style="grid-column: 1 / -1;">
                ${Components.emptyState('❌', 'Gagal Memuat', 'Tidak dapat memuat daftar produk')}
            </div>
        `;
    }
};
