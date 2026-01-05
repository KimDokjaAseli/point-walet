/**
 * WalletPoint Mobile App
 * Main initialization
 */

// Wait for device ready or DOM loaded
document.addEventListener('deviceready', onDeviceReady, false);

// Fallback for browser testing
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(onDeviceReady, 500);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(onDeviceReady, 500);
    });
}

let appInitialized = false;

function onDeviceReady() {
    if (appInitialized) return;
    appInitialized = true;

    console.log('WalletPoint App initializing...');

    // Hide loading screen
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.opacity = '0';
        loading.style.transition = 'opacity 0.3s ease';
        setTimeout(() => loading.remove(), 300);
    }

    // Set status bar (Cordova)
    if (typeof StatusBar !== 'undefined') {
        StatusBar.overlaysWebView(false);
        StatusBar.backgroundColorByHexString('#1a1a2e');
        StatusBar.styleLightContent();
    }

    // Handle back button (Android)
    document.addEventListener('backbutton', onBackButton, false);

    // Handle online/offline
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Start router
    Router.start();

    console.log('WalletPoint App ready!');
}

function onBackButton(e) {
    e.preventDefault();

    // If modal is open, close it
    const modal = document.querySelector('.modal-overlay.active');
    if (modal) {
        modal.remove();
        return;
    }

    // If scanner is open, close it
    if (Pages.Scan && Pages.Scan.isScanning) {
        Pages.Scan.stopScan();
        return;
    }

    // If on dashboard, confirm exit
    if (Router.getCurrentPath() === '/dashboard') {
        Utils.confirm('Keluar dari aplikasi?', 'Konfirmasi').then(confirmed => {
            if (confirmed && navigator.app) {
                navigator.app.exitApp();
            }
        });
        return;
    }

    // Otherwise, go back
    history.back();
}

function onOnline() {
    Utils.toast('Koneksi internet tersambung', 'success');
}

function onOffline() {
    Utils.toast('Tidak ada koneksi internet', 'warning');
}

// Global error handler
window.onerror = function (message, source, lineno, colno, error) {
    console.error('Global error:', message, source, lineno, colno, error);
    return false;
};

// Unhandled promise rejection
window.onunhandledrejection = function (event) {
    console.error('Unhandled rejection:', event.reason);
};
