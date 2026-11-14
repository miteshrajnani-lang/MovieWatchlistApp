// ==========================================================================
// TMDB API SERVICE & FETCH ENGINE
// ==========================================================================

const runtimeCache = new Map();

const ApiService = {
    runtimeCache,

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

    /**
     * Retrieve individual movie details from TMDB to obtain runtime, tagline, etc.
     * Uses memory cache to avoid unnecessary duplicate requests.
     */
    async fetchMovieDetails(apiKey, movieId) {
        if (!movieId) throw new Error('Movie ID is required');

        if (runtimeCache.has(movieId)) {
            const cached = runtimeCache.get(movieId);
            return typeof cached === 'object' ? cached : { id: movieId, runtime: cached };
        }

        const baseUrl = (window.CONFIG && window.CONFIG.TMDB_BASE_URL) || 'https://api.themoviedb.org/3';
        const url = `${baseUrl}/movie/${movieId}?api_key=${apiKey}&language=en-US`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Movie Details Request Failed (${response.status})`);
        const data = await response.json();

        const runtime = typeof data.runtime === 'number' ? data.runtime : 0;
        const details = {
            id: data.id,
            runtime,
            tagline: data.tagline || '',
            vote_count: data.vote_count || 0,
            original_language: data.original_language || '',
            release_date: data.release_date || '',
            genres: Array.isArray(data.genres) && data.genres.length > 0 ? data.genres.map(g => g.name) : undefined
        };

        runtimeCache.set(movieId, details);
        return details;
    },

    async getRuntime(apiKey, movieId) {
        if (!movieId) return 0;
        if (runtimeCache.has(movieId)) {
            const cached = runtimeCache.get(movieId);
            return typeof cached === 'object' ? cached.runtime : cached;
        }
        try {
            const details = await this.fetchMovieDetails(apiKey, movieId);
            return details.runtime || 0;
        } catch (e) {
            return 0;
        }
    },

    formatResults(results) {
        const w500Base = (window.CONFIG && window.CONFIG.IMAGE_BASE_W500) || 'https://image.tmdb.org/t/p/w500';
        const w1280Base = (window.CONFIG && window.CONFIG.IMAGE_BASE_W1280) || 'https://image.tmdb.org/t/p/w1280';
        const fallbackPoster = (window.CONFIG && window.CONFIG.FALLBACK_POSTER) ||
            'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80';
        const genresMap = window.TMDB_GENRES || {};

        return results.map(item => {
            const genreNames = (item.genre_ids || []).map(id => genresMap[id] || 'Movie');
            const cachedRuntime = runtimeCache.has(item.id)
                ? (typeof runtimeCache.get(item.id) === 'object' ? runtimeCache.get(item.id).runtime : runtimeCache.get(item.id))
                : undefined;

            return {
                id: item.id,
                title: item.title || 'Untitled Movie',
                release_date: item.release_date || 'N/A',
                vote_average: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0,
                vote_count: item.vote_count || 0,
                original_language: item.original_language || '',
                overview: item.overview || 'No overview available.',
                poster_path: item.poster_path ? `${w500Base}${item.poster_path}` : fallbackPoster,
                backdrop_path: item.backdrop_path ? `${w1280Base}${item.backdrop_path}` : null,
                genres: genreNames.length > 0 ? genreNames : ['Cinema'],
                runtime: cachedRuntime
            };
        });
    }
};

/**
 * Background enrichment for discover movie runtimes.
 * Fetches runtimes in small batches and smoothly updates the card badges on screen.
 */
async function enrichDiscoverRuntimes() {
    if (!state.apiKey || !state.discoverMovies || state.discoverMovies.length === 0) return;

    const moviesToEnrich = state.discoverMovies.filter(m => m.id && (m.runtime === undefined || m.runtime === null));
    if (moviesToEnrich.length === 0) return;

    // Process in gentle concurrent chunks of 4 to stay well within TMDB rate limits
    const chunkSize = 4;
    for (let i = 0; i < moviesToEnrich.length; i += chunkSize) {
        const chunk = moviesToEnrich.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (movie) => {
            try {
                const details = await ApiService.fetchMovieDetails(state.apiKey, movie.id);
                movie.runtime = details.runtime;
                if (details.tagline) movie.tagline = details.tagline;
                if (typeof updateMovieCardRuntime === 'function') {
                    updateMovieCardRuntime(movie.id, movie.runtime);
                }
            } catch (err) {
                movie.runtime = 0;
            }
        }));
    }
}

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
    enrichDiscoverRuntimes();
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
    enrichDiscoverRuntimes();
}

function formatTmdbResults(results) {
    return ApiService.formatResults(results);
}

// Global Exposure
window.runtimeCache = runtimeCache;
window.ApiService = ApiService;
window.enrichDiscoverRuntimes = enrichDiscoverRuntimes;
window.loadInitialDiscoverMovies = loadInitialDiscoverMovies;
window.searchMovies = searchMovies;
window.formatTmdbResults = formatTmdbResults;
