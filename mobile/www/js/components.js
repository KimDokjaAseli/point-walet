/**
 * WalletPoint - Components Module
 * Reusable UI components
 */
const Components = {
    // Format number as currency
    formatPoints(amount) {
        return new Intl.NumberFormat('id-ID').format(amount);
    },

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },

    // Format datetime
    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format relative time
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Baru saja';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} hari lalu`;
        return this.formatDate(dateString);
    },

    // Balance Card Component
    balanceCard(balance, lifetimeEarned, lifetimeSpent) {
        return `
            <div class="balance-card">
                <div class="balance-label">Saldo Poin</div>
                <div class="balance-amount">${this.formatPoints(balance)} pts</div>
                <div class="balance-stats">
                    <div class="balance-stat">
                        <div class="balance-stat-label">Total Diterima</div>
                        <div class="balance-stat-value">+${this.formatPoints(lifetimeEarned)}</div>
                    </div>
                    <div class="balance-stat">
                        <div class="balance-stat-label">Total Digunakan</div>
                        <div class="balance-stat-value">-${this.formatPoints(lifetimeSpent)}</div>
                    </div>
                </div>
            </div>
        `;
    },

    // Transaction Item Component
    transactionItem(transaction) {
        const typeConfig = Config.TRANSACTION_TYPES[transaction.transaction_type] || {
            icon: '💰',
            label: transaction.transaction_type
        };

        const isCredit = transaction.direction === 'CREDIT';
        const amountClass = isCredit ? 'credit' : 'debit';
        const amountPrefix = isCredit ? '+' : '-';

        return `
            <div class="transaction-item">
                <div class="transaction-icon ${amountClass}">
                    ${typeConfig.icon}
                </div>
                <div class="transaction-info">
                    <div class="transaction-title">${transaction.description || typeConfig.label}</div>
                    <div class="transaction-date">${this.formatRelativeTime(transaction.created_at)}</div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${amountPrefix}${this.formatPoints(transaction.amount)}
                </div>
            </div>
        `;
    },

    // Mission Card Component
    missionCard(mission, onClick) {
        const typeConfig = Config.MISSION_TYPES[mission.mission_type] || {
            icon: '📋',
            label: mission.mission_type
        };

        const difficultyDots = ['easy', 'medium', 'hard'].map((level, index) => {
            const isActive = this.getDifficultyLevel(mission.difficulty) >= index + 1;
            return `<span class="difficulty-dot ${isActive ? 'active ' + mission.difficulty.toLowerCase() : ''}"></span>`;
        }).join('');

        return `
            <div class="mission-card" onclick="${onClick}">
                <div class="mission-header">
                    <div class="mission-icon">${typeConfig.icon}</div>
                    <div class="mission-info">
                        <div class="mission-title">${mission.title}</div>
                        <div class="mission-creator">${mission.creator_name || 'Dosen'}</div>
                    </div>
                    <div class="mission-reward">
                        <div class="reward-amount">+${this.formatPoints(mission.reward_points)}</div>
                        <div class="reward-label">poin</div>
                    </div>
                </div>
                <div class="mission-footer">
                    <span class="badge badge-${mission.difficulty.toLowerCase()}">${mission.difficulty}</span>
                    <div class="mission-difficulty">
                        ${difficultyDots}
                    </div>
                    <span class="text-muted" style="margin-left: auto;">
                        ${mission.current_participants}${mission.max_participants ? '/' + mission.max_participants : ''} peserta
                    </span>
                </div>
            </div>
        `;
    },

    getDifficultyLevel(difficulty) {
        switch (difficulty.toUpperCase()) {
            case 'EASY': return 1;
            case 'MEDIUM': return 2;
            case 'HARD': return 3;
            default: return 1;
        }
    },

    // Product Card Component
    productCard(product, onClick) {
        return `
            <div class="product-card" onclick="${onClick}">
                <div class="product-image">
                    ${product.thumbnail_url
                ? `<img src="${product.thumbnail_url}" alt="${product.name}">`
                : '📚'}
                </div>
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-seller">${product.seller_name || 'Dosen'}</div>
                    <div class="product-price">${this.formatPoints(product.price)} pts</div>
                </div>
            </div>
        `;
    },

    // Empty State Component
    emptyState(icon, title, description) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <div class="empty-state-title">${title}</div>
                <div class="empty-state-desc">${description}</div>
            </div>
        `;
    },

    // Skeleton Loading Components
    skeletonCard() {
        return `<div class="skeleton skeleton-card"></div>`;
    },

    skeletonList(count = 3) {
        return Array(count).fill(`
            <div class="list-item" style="opacity: 0.5;">
                <div class="skeleton" style="width: 48px; height: 48px; border-radius: 12px;"></div>
                <div style="flex: 1;">
                    <div class="skeleton skeleton-text" style="width: 60%;"></div>
                    <div class="skeleton skeleton-text" style="width: 40%;"></div>
                </div>
            </div>
        `).join('');
    },

    // Page Header Component
    pageHeader(title, showBack = false) {
        if (showBack) {
            return `
                <div class="page-header page-header-with-back">
                    <button class="back-button" onclick="Router.back()">←</button>
                    <h1>${title}</h1>
                </div>
            `;
        }
        return `
            <div class="page-header">
                <h1>${title}</h1>
            </div>
        `;
    },

    // Section Header Component
    sectionHeader(title, linkText = null, onClick = null) {
        return `
            <div class="section-header">
                <h2 class="section-title">${title}</h2>
                ${linkText ? `<span class="section-link" onclick="${onClick}">${linkText}</span>` : ''}
            </div>
        `;
    },

    // Button Component
    button(text, type = 'primary', size = '', block = false, disabled = false, onClick = '') {
        const classes = [
            'btn',
            `btn-${type}`,
            size ? `btn-${size}` : '',
            block ? 'btn-block' : ''
        ].filter(Boolean).join(' ');

        return `
            <button class="${classes}" ${disabled ? 'disabled' : ''} onclick="${onClick}">
                ${text}
            </button>
        `;
    },

    // Form Input Component
    formInput(name, label, type = 'text', placeholder = '', value = '', required = true) {
        return `
            <div class="form-group">
                <label class="form-label" for="${name}">${label}</label>
                <input 
                    type="${type}" 
                    id="${name}" 
                    name="${name}" 
                    class="form-input" 
                    placeholder="${placeholder}"
                    value="${value}"
                    ${required ? 'required' : ''}
                >
            </div>
        `;
    },

    // Badge Component
    badge(text, type = 'primary') {
        return `<span class="badge badge-${type}">${text}</span>`;
    }
};
