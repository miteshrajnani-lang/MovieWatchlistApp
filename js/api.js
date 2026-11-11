// ==========================================================================
// TMDB API SERVICE & FETCH ENGINE
// ==========================================================================

const ApiService = {
    async fetchPopular(apiKey) {
        const baseUrl = (window.CONFIG && window.CONFIG.TMDB_BASE_URL) || 'https://api.themoviedb.org/3';
        const url = `${baseUrl}/movie/popular?api_key=${apiKey}&language=en-US&page=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('API Request Failed');
        const data = await response.json();
        return this.formatResults(data.results || []);
    },

    async search(apiKey, query) {
        const baseUrl = (window.CONFIG && window.CONFIG.TMDB_BASE_URL) || 'https://api.themoviedb.org/3';
        const url = `${baseUrl}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US&page=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Search Request Failed');
        const data = await response.json();
        return this.formatResults(data.results || []);
    },

    formatResults(results) {
        const w500Base = (window.CONFIG && window.CONFIG.IMAGE_BASE_W500) || 'https://image.tmdb.org/t/p/w500';
        const w1280Base = (window.CONFIG && window.CONFIG.IMAGE_BASE_W1280) || 'https://image.tmdb.org/t/p/w1280';
        const fallbackPoster = (window.CONFIG && window.CONFIG.FALLBACK_POSTER) ||
            'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80';
        const genresMap = window.TMDB_GENRES || {};

        return results.map(item => {
            const genreNames = (item.genre_ids || []).map(id => genresMap[id] || 'Movie');
            return {
                id: item.id,
                title: item.title || 'Untitled Movie',
                release_date: item.release_date || 'N/A',
                vote_average: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0,
                overview: item.overview || 'No overview available.',
                poster_path: item.poster_path ? `${w500Base}${item.poster_path}` : fallbackPoster,
                backdrop_path: item.backdrop_path ? `${w1280Base}${item.backdrop_path}` : null,
                genres: genreNames.length > 0 ? genreNames : ['Cinema']
            };
        });
    }
};

async function loadInitialDiscoverMovies() {
    const discoverTitle = document.getElementById('discoverResultsTitle');
    if (discoverTitle) {
        discoverTitle.textContent = (window.CONFIG && window.CONFIG.DEFAULT_DISCOVER_TITLE) || 'Popular & Trending Selection';
    }

    if (state.apiKey) {
        try {
            state.discoverMovies = await ApiService.fetchPopular(state.apiKey);
        } catch (err) {
            console.warn('TMDB API call failed:', err);
            showToast('Could not reach TMDB. Check your API key.', 'info');
            state.discoverMovies = [];
        }
    } else {
        state.discoverMovies = [];
    }
    renderDiscoverGrid();
    renderAdvancedFilters();
}

async function searchMovies(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) {
        loadInitialDiscoverMovies();
        return;
    }

    const discoverTitle = document.getElementById('discoverResultsTitle');
    if (discoverTitle) discoverTitle.textContent = `Search Results for "${trimmed}"`;

    if (state.apiKey) {
        try {
            state.discoverMovies = await ApiService.search(state.apiKey, trimmed);
            if (state.discoverMovies.length === 0) {
                showToast(`No movies found matching "${trimmed}"`, 'info');
            }
        } catch (err) {
            console.error('TMDB Search Error:', err);
            showToast('Search failed. Check your connection.', 'info');
        }
    }
    renderDiscoverGrid();
}

function formatTmdbResults(results) {
    return ApiService.formatResults(results);
}

// Global Exposure
window.ApiService = ApiService;
window.loadInitialDiscoverMovies = loadInitialDiscoverMovies;
window.searchMovies = searchMovies;
window.formatTmdbResults = formatTmdbResults;
