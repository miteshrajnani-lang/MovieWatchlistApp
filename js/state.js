// ==========================================================================
// STATE MANAGEMENT MODULE
// ==========================================================================

const state = {
    currentUser: null,
    watchlist: [],
    apiKey: (window.CONFIG && window.CONFIG.DEFAULT_API_KEY) || '7f631300a2ef07bafe2c64d6214f99c2',
    currentView: 'discover-view',
    discoverMovies: [],
    filterStatus: 'ALL',
    localSearchQuery: '',
    sortBy: 'dateAdded',
    activeGenre: 'ALL',
    deletingMovieId: null,
    minRating: 0,
    releaseDecade: 'ALL',
    discoverSort: 'default'
};

// Global Exposure
window.state = state;
