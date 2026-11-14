// ==========================================================================
// APPLICATION ENTRY POINT & NAMESPACE MODULE
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    loadApiKey();
    setupNavigation();
    setupEventListeners();
    setupStarPicker();

    // Attach reactive auth change listener immediately before awaiting restoration
    // to ensure no auth transitions during startup are missed, while avoiding deadlocks.
    if (window.supabaseClient && window.supabaseClient.auth) {
        window.supabaseClient.auth.onAuthStateChange((event, session) => {
            // Avoid executing blocking database queries directly inside the auth callback.
            // When user signs out in another tab or programmatically:
            if (event === 'SIGNED_OUT') {
                state.sessionEpoch = (state.sessionEpoch || 0) + 1;
                state.currentUser = null;
                state.supabaseUserId = null;
                state.watchlistLoadingStatus = 'loaded';
                state.watchlist = StorageService.getLegacyWatchlist();
                updateUserHeaderUI();
                renderWatchlist();
                renderDiscoverGrid();
                renderStats();
            }
        });
    }

    // Await Supabase session restoration before rendering views
    await loadUserSession();

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
