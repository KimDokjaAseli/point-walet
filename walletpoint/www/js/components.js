/**
 * WalletPoint Reusable Components
 */
const Components = {
    /**
     * Render navigation tab bar
     */
    tabBar(activeTab = 'dashboard') {
        const role = Auth.getRole();

        const tabs = [
            { id: 'dashboard', icon: 'fa-home', label: 'Home', path: '/dashboard' },
            { id: 'wallet', icon: 'fa-wallet', label: 'Wallet', path: '/wallet' },
            { id: 'scan', icon: 'fa-qrcode', label: 'Scan', path: '/scan', isScan: true },
            { id: 'marketplace', icon: 'fa-store', label: 'Market', path: '/marketplace' },
            { id: 'missions', icon: 'fa-trophy', label: 'Misi', path: '/missions' }
        ];

        // Filter scan for admin
        const filteredTabs = role === Config.ROLES.ADMIN
            ? tabs.filter(t => !t.isScan)
            : tabs;

        return `
            <nav class="tab-bar">
                ${filteredTabs.map(tab => tab.isScan ? `
                    <button class="tab-item scan-btn" data-path="${tab.path}">
                        <div class="btn-scan">
                            <i class="fas ${tab.icon}"></i>
                        </div>
                    </button>
                ` : `
                    <button class="tab-item ${activeTab === tab.id ? 'active' : ''}" data-path="${tab.path}">
                        <i class="fas ${tab.icon}"></i>
                        <span>${tab.label}</span>
                    </button>
                `).join('')}
            </nav>
        `;
    },

    /**
     * Setup tab bar click handlers
     */
    setupTabBar() {
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const path = tab.dataset.path;
                if (path) Router.navigate(path);
            });
        });
    },

    /**
     * Balance card component
     */
    balanceCard(balance, showActions = true) {
        return `
            <div class="card balance-card">
                <div class="balance-label">Total Saldo</div>
                <div class="balance-amount">${Utils.formatCurrency(balance)}</div>
                ${showActions ? `
                    <div class="balance-actions">
                        <button class="btn btn-sm btn-secondary" onclick="Router.navigate('/wallet')">
                            <i class="fas fa-history"></i> Riwayat
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Transaction list item
     */
    transactionItem(tx) {
        const isCredit = tx.direction === 'CREDIT';
        const icon = isCredit ? 'fa-arrow-down' : 'fa-arrow-up';
        const typeClass = isCredit ? 'credit' : 'debit';
        const sign = isCredit ? '+' : '-';

        return `
            <div class="list-item">
                <div class="list-item-icon ${typeClass}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="list-item-content">
                    <div class="list-item-title">${Utils.escapeHtml(tx.description || tx.type)}</div>
                    <div class="list-item-subtitle">${Utils.formatRelativeTime(tx.created_at)}</div>
                </div>
                <div class="list-item-value ${typeClass}">
                    ${sign}${Utils.formatCurrency(tx.amount)}
                </div>
            </div>
        `;
    },

    /**
     * Product card - Modern Design
     */
    productCard(product) {
        const iconMap = {
            'ebook': 'fa-book',
            'ecourse': 'fa-play-circle',
            'material': 'fa-file-alt',
            'other': 'fa-box'
        };
        const icon = iconMap[product.category] || 'fa-box';

        const categoryLabels = {
            'ebook': 'E-Book',
            'ecourse': 'E-Course',
            'material': 'Materi',
            'other': 'Lainnya'
        };

        // Get category label - hide if no category
        const categoryLabel = categoryLabels[product.category] || (product.category ? product.category : '');

        // Check if product has thumbnail - must be string with reasonable length (base64 or URL)
        const hasThumbnail = product.thumbnail_url && typeof product.thumbnail_url === 'string' && product.thumbnail_url.length > 10;

        // Stock display - handle undefined/null
        let stockBadge = '';
        let stockClass = '';
        const stock = product.stock;
        if (stock === undefined || stock === null) {
            stockBadge = '∞';
            stockClass = 'stock-unlimited';
        } else if (stock === -1) {
            stockBadge = '∞';
            stockClass = 'stock-unlimited';
        } else if (stock === 0) {
            stockBadge = 'Habis';
            stockClass = 'stock-empty';
        } else if (stock <= 5) {
            stockBadge = `${stock}`;
            stockClass = 'stock-low';
        } else {
            stockBadge = `${stock}`;
            stockClass = 'stock-ok';
        }

        return `
            <div class="product-card-new" onclick="Pages.Marketplace.showProduct('${product.id}')">
                <div class="product-card-image ${hasThumbnail ? 'has-image' : ''}">
                    ${hasThumbnail ?
                `<img src="${product.thumbnail_url}" alt="${Utils.escapeHtml(product.name)}" 
                             onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'product-card-icon\\'><i class=\\'fas ${icon}\\'></i></div>';">` :
                `<div class="product-card-icon"><i class="fas ${icon}"></i></div>`
            }
                    ${categoryLabel ? `<div class="product-card-category">${categoryLabel}</div>` : ''}
                    <div class="product-card-stock ${stockClass}">${stockBadge}</div>
                </div>
                <div class="product-card-body">
                    <h4 class="product-card-title">${Utils.escapeHtml(product.name)}</h4>
                    <div class="product-card-price">${Utils.formatCurrency(product.price)}</div>
                    <div class="product-card-seller">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(product.seller?.name || 'U')}&size=24&background=667eea&color=fff" alt="" class="seller-avatar">
                        <span>${Utils.escapeHtml(product.seller?.name || 'Unknown')}</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Mission card
     */
    missionCard(mission, progress = null) {
        const statusBadges = {
            'IN_PROGRESS': '<span class="badge badge-warning">Dalam Progress</span>',
            'COMPLETED': '<span class="badge badge-success">Selesai</span>',
            'CLAIMED': '<span class="badge badge-primary">Diklaim</span>'
        };

        const statusBadge = progress ? (statusBadges[progress.status] || '') : '<span class="badge">Belum Ikut</span>';

        let actionBtn = '';
        if (!progress) {
            actionBtn = `<button class="btn btn-sm btn-primary" onclick="Pages.Missions.joinMission('${mission.id}')">Ikut Misi</button>`;
        } else if (progress.status === 'COMPLETED') {
            actionBtn = `<button class="btn btn-sm btn-success" onclick="Pages.Missions.claimReward('${mission.id}')">Klaim Hadiah</button>`;
        } else if (progress.status === 'IN_PROGRESS') {
            actionBtn = `<button class="btn btn-sm btn-secondary" onclick="Pages.Missions.completeMission('${mission.id}')">Selesaikan</button>`;
        }

        return `
            <div class="mission-card">
                <div class="mission-header">
                    <div>
                        <div class="mission-title">${Utils.escapeHtml(mission.title)}</div>
                        ${statusBadge}
                    </div>
                    <div class="mission-reward">
                        <i class="fas fa-coins"></i> ${Utils.formatCurrency(mission.points_reward)}
                    </div>
                </div>
                <div class="mission-description">
                    ${Utils.escapeHtml(Utils.truncate(mission.description || '', 100))}
                </div>
                <div class="flex items-center justify-between">
                    <div class="text-muted" style="font-size: 12px;">
                        <i class="fas fa-users"></i> ${mission.current_participants || 0}/${mission.max_participants === -1 ? '∞' : mission.max_participants}
                    </div>
                    ${actionBtn}
                </div>
            </div>
        `;
    },

    /**
     * Empty state
     */
    emptyState(icon, title, description) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <div class="empty-state-title">${Utils.escapeHtml(title)}</div>
                <div class="empty-state-description">${Utils.escapeHtml(description)}</div>
            </div>
        `;
    },

    /**
     * Page header with back button
     */
    pageHeader(title, showBack = false, rightContent = '') {
        return `
            <div class="page-header">
                <div class="flex items-center gap-md">
                    ${showBack ? `
                        <button class="btn btn-ghost btn-icon" onclick="history.back()">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                    ` : ''}
                    <h1 class="page-title">${Utils.escapeHtml(title)}</h1>
                </div>
                <div>${rightContent}</div>
            </div>
        `;
    },

    /**
     * Section header
     */
    sectionHeader(title, linkText = '', linkAction = '') {
        return `
            <div class="section-header">
                <h3 class="section-title">${Utils.escapeHtml(title)}</h3>
                ${linkText ? `<a href="#" class="section-link" onclick="${linkAction}; return false;">${linkText}</a>` : ''}
            </div>
        `;
    },

    /**
     * Quick actions grid
     */
    quickActions() {
        const role = Auth.getRole();

        const actions = [
            { icon: 'wallet', label: 'Wallet', path: '/wallet', color: 'wallet' },
            { icon: 'qrcode', label: 'Scan QR', path: '/scan', color: 'qr', roles: ['dosen', 'mahasiswa'] },
            { icon: 'store', label: 'Marketplace', path: '/marketplace', color: 'shop' },
            { icon: 'trophy', label: 'Misi', path: '/missions', color: 'mission' }
        ];

        const filtered = actions.filter(a => !a.roles || a.roles.includes(role));

        return `
            <div class="quick-actions">
                ${filtered.map(action => `
                    <button class="quick-action" onclick="Router.navigate('${action.path}')">
                        <div class="quick-action-icon ${action.color}">
                            <i class="fas fa-${action.icon}"></i>
                        </div>
                        <span class="quick-action-label">${action.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
    },

    /**
     * Loading skeleton
     */
    skeleton(width = '100%', height = '20px') {
        return `<div class="skeleton" style="width: ${width}; height: ${height};"></div>`;
    }
};
