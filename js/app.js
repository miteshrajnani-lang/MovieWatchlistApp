// ==========================================================================
// APPLICATION ENTRY POINT & NAMESPACE MODULE
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadApiKey();
    loadUserSession();
    setupNavigation();
    setupEventListeners();
    setupStarPicker();

    loadInitialDiscoverMovies();
    renderWatchlist();
    renderStats();

    if (typeof enrichWatchlistRuntimes === 'function') {
        enrichWatchlistRuntimes();
    }
}

// Unified Namespace for clean modular access
window.App = {
    config: window.CONFIG,
    storageKeys: window.STORAGE_KEYS,
    genres: window.TMDB_GENRES,
    state: window.state,
    storage: window.StorageService,
    api: window.ApiService,
    modals: window.ModalManager,
    init: initApp
};

window.initApp = initApp;
