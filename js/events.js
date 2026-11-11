// ==========================================================================
// NAVIGATION & EVENT LISTENERS MODULE
// ==========================================================================

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetView = btn.getAttribute('data-view');
            if (targetView === 'discover-view') {
                const searchInput = document.getElementById('tmdbSearchInput');
                const discoverTitle = document.getElementById('discoverResultsTitle');
                const defaultTitle = (window.CONFIG && window.CONFIG.DEFAULT_DISCOVER_TITLE) || 'Popular & Trending Selection';
                const hasActiveSearch = (searchInput && searchInput.value.trim() !== '') ||
                    (discoverTitle && discoverTitle.textContent !== defaultTitle);

                if (hasActiveSearch) {
                    if (searchInput) searchInput.value = '';
                    state.activeGenre = 'ALL';
                    state.minRating = 0;
                    state.releaseDecade = 'ALL';
                    state.discoverSort = 'default';
                    loadInitialDiscoverMovies();
                }
            }
            switchView(targetView);
        });
    });

    document.getElementById('logoLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        const searchInput = document.getElementById('tmdbSearchInput');
        if (searchInput) searchInput.value = '';
        state.activeGenre = 'ALL';
        state.minRating = 0;
        state.releaseDecade = 'ALL';
        state.discoverSort = 'default';
        loadInitialDiscoverMovies();
        switchView('discover-view');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function switchView(viewId) {
    state.currentView = viewId;

    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-view') === viewId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.querySelectorAll('.view-section').forEach(sec => {
        sec.style.display = sec.id === viewId ? 'block' : 'none';
    });

    if (viewId === 'watchlist-view') renderWatchlist();
    if (viewId === 'stats-view') renderStats();
}

function setupEventListeners() {
    const searchInput = document.getElementById('tmdbSearchInput');
    const searchBtn = document.getElementById('tmdbSearchBtn');

    searchBtn?.addEventListener('click', () => {
        if (searchInput) searchMovies(searchInput.value);
    });

    searchInput?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchMovies(e.target.value);
        }
    });

    searchInput?.addEventListener('input', (e) => {
        if (e.target.value.trim() === '') {
            loadInitialDiscoverMovies();
        }
    });

    document.getElementById('watchlistLocalSearch')?.addEventListener('input', (e) => {
        state.localSearchQuery = e.target.value;
        renderWatchlist();
    });

    document.querySelectorAll('[data-status-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-status-filter]').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget || e.target;
            target.classList.add('active');
            state.filterStatus = target.getAttribute('data-status-filter');
            renderWatchlist();
        });
    });

    document.getElementById('watchlistSort')?.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderWatchlist();
    });

    document.getElementById('watchlistForm')?.addEventListener('submit', handleWatchlistSubmit);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDeleteMovie);
    document.getElementById('loginForm')?.addEventListener('submit', handleLoginSubmit);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegisterSubmit);

    // Initialize modal listeners (backdrop click and ESC key)
    if (window.ModalManager) {
        window.ModalManager.init();
    }
}

// Global Exposure
window.setupNavigation = setupNavigation;
window.switchView = switchView;
window.setupEventListeners = setupEventListeners;
