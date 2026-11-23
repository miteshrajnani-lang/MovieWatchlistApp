// ==========================================================================
// TMDB API SERVICE & FETCH ENGINE
// ==========================================================================

const runtimeCache = new Map();

const ApiService = {
    runtimeCache,

    async fetchPopular(apiKey, page = 1) {
        const baseUrl = (window.CONFIG && window.CONFIG.TMDB_BASE_URL) || 'https://api.themoviedb.org/3';
        const url = `${baseUrl}/movie/popular?api_key=${apiKey}&language=en-US&page=${page}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('API Request Failed');
        const data = await response.json();
        return { results: this.formatResults(data.results || []), total_pages: data.total_pages || 1 };
    },

    async search(apiKey, query, page = 1) {
        const baseUrl = (window.CONFIG && window.CONFIG.TMDB_BASE_URL) || 'https://api.themoviedb.org/3';
        const url = `${baseUrl}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US&page=${page}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Search Request Failed');
        const data = await response.json();
        return {
            results: this.formatResults(data.results || []),
            total_pages: data.total_pages || 1,
            total_results: data.total_results || 0
        };
    },

    /**
     * Retrieve individual movie details from TMDB to obtain runtime, tagline, etc.
     * Uses memory cache to avoid unnecessary duplicate requests.
     */
    async fetchMovieDetails(apiKey, movieId) {
        if (!movieId) throw new Error('Movie ID is required');

        if (runtimeCache.has(movieId)) {
            const cached = runtimeCache.get(movieId);
            // Only return immediately if the cached entry is a complete details object
            // (not just a legacy number or an object missing key metadata).
            if (
                cached &&
                typeof cached === 'object' &&
                typeof cached.runtime === 'number' &&
                cached.tagline !== undefined &&
                cached.original_language !== undefined
            ) {
                return cached;
            }
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

    /**
     * Fetch movies from TMDB /discover/movie with filter parameters.
     * Maps app-level filter state to TMDB query parameters.
     */
    async discover(apiKey, filters = {}, page = 1) {
        const baseUrl = (window.CONFIG && window.CONFIG.TMDB_BASE_URL) || 'https://api.themoviedb.org/3';
        const params = new URLSearchParams({
            api_key: apiKey,
            language: 'en-US',
            page: String(page)
        });

        // --- Genre ---
        const { genre = 'ALL' } = filters;
        if (genre !== 'ALL') {
            // Build reverse map: genre name -> TMDB numeric ID
            const genresMap = window.TMDB_GENRES || {};
            const nameToId = {};
            for (const [id, name] of Object.entries(genresMap)) {
                nameToId[name] = id;
            }
            // Handle app-side alias "Sci-Fi" -> TMDB name "Science Fiction" (id 878)
            const tmdbAliases = { 'Sci-Fi': '878' };
            const genreId = tmdbAliases[genre] || nameToId[genre];
            if (genreId) params.set('with_genres', genreId);
        }

        // --- Minimum rating ---
        const minRating = filters.minRating || 0;
        if (minRating > 0) {
            params.set('vote_average.gte', minRating);
            // Require a minimum vote count so obscure 1-vote films don't dominate.
            // Use a looser threshold for very high ratings (9+) to avoid empty results.
            params.set('vote_count.gte', minRating >= 9 ? '20' : '50');
        }

        // --- Release decade / era ---
        const decade = filters.releaseDecade || 'ALL';
        if (decade === '2020s') {
            params.set('primary_release_date.gte', '2020-01-01');
        } else if (decade === '2010s') {
            params.set('primary_release_date.gte', '2010-01-01');
            params.set('primary_release_date.lte', '2019-12-31');
        } else if (decade === '2000s') {
            params.set('primary_release_date.gte', '2000-01-01');
            params.set('primary_release_date.lte', '2009-12-31');
        } else if (decade === '1990s') {
            params.set('primary_release_date.gte', '1990-01-01');
            params.set('primary_release_date.lte', '1999-12-31');
        } else if (decade === 'Older') {
            params.set('primary_release_date.lte', '1989-12-31');
        }
        // 'ALL' → no date filter

        // --- Sort ---
        const sort = filters.sort || 'default';
        if (sort === 'rating') {
            params.set('sort_by', 'vote_average.desc');
            // Ensure sort_by=vote_average.desc returns real high-rated films, not obscure ones
            if (!params.has('vote_count.gte')) params.set('vote_count.gte', '50');
        } else if (sort === 'newest') {
            params.set('sort_by', 'primary_release_date.desc');
        } else if (sort === 'oldest') {
            params.set('sort_by', 'primary_release_date.asc');
        } else {
            // 'default' and 'title' both fetch by popularity; title sort applied in-memory
            params.set('sort_by', 'popularity.desc');
        }

        const url = `${baseUrl}/discover/movie?${params.toString()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`TMDB Discover request failed (${response.status})`);
        const data = await response.json();
        let results = this.formatResults(data.results || []);

        if (sort === 'title') {
            results = results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        }

        return { results, total_pages: data.total_pages || 1 };
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
    state.searchQuery = '';
    state.searchResults = [];
    state.activeGenre = 'ALL';
    state.minRating = 0;
    state.releaseDecade = 'ALL';
    state.discoverSort = 'default';
    await loadDiscoverMovies();
}

/**
 * Central Discover fetch: reads active state filters, calls TMDB /discover/movie,
 * populates state.discoverMovies, then renders.
 *
 * When no filters are set, falls back to /movie/popular (same result, slightly faster).
 * Called by filter setters and initial load.
 */
async function loadDiscoverMovies() {
    state.searchQuery = '';
    state.searchResults = [];
    const searchInput = document.getElementById('tmdbSearchInput');
    if (searchInput && searchInput.value) {
        searchInput.value = '';
    }

    const grid = document.getElementById('discoverGrid');
    const discoverTitle = document.getElementById('discoverResultsTitle');
    const countBadge = document.getElementById('discoverResultsCount');

    const isAllDefaults =
        state.activeGenre === 'ALL' &&
        state.minRating === 0 &&
        state.releaseDecade === 'ALL' &&
        state.discoverSort === 'default';

    // Update title
    if (discoverTitle) {
        discoverTitle.textContent = isAllDefaults
            ? (window.CONFIG && window.CONFIG.DEFAULT_DISCOVER_TITLE) || 'Popular & Trending Selection'
            : 'Discover Results';
    }

    // Show loading spinner in grid
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-cyan); margin-bottom: 12px;"></i>
                <p>Loading movies...</p>
            </div>
        `;
    }
    if (countBadge) countBadge.textContent = '';

    if (!state.apiKey) {
        state.discoverMovies = [];
        renderDiscoverGrid();
        renderAdvancedFilters();
        return;
    }

    try {
        if (isAllDefaults) {
            const { results, total_pages } = await ApiService.fetchPopular(state.apiKey, 1);
            state.discoverMovies = results;
            state.discoverPage = 1;
            state.discoverTotalPages = total_pages;
        } else {
            const { results, total_pages } = await ApiService.discover(state.apiKey, {
                genre: state.activeGenre,
                minRating: state.minRating,
                releaseDecade: state.releaseDecade,
                sort: state.discoverSort
            }, 1);
            state.discoverMovies = results;
            state.discoverPage = 1;
            state.discoverTotalPages = total_pages;
        }
    } catch (err) {
        console.warn('TMDB Discover failed:', err);
        showToast('Could not reach TMDB. Check your connection or API key.', 'info');
        state.discoverMovies = [];
        state.discoverPage = 1;
        state.discoverTotalPages = 1;
    }

    renderDiscoverGrid();
    renderAdvancedFilters();
    updateLoadMoreButton();
    enrichDiscoverRuntimes();
}

async function loadMoreDiscoverMovies() {
    if (state.discoverPage >= state.discoverTotalPages) return;

    const btn = document.getElementById('discoverLoadMoreBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
    }

    const nextPage = state.discoverPage + 1;
    const isAllDefaults =
        state.activeGenre === 'ALL' &&
        state.minRating === 0 &&
        state.releaseDecade === 'ALL' &&
        state.discoverSort === 'default';

    try {
        if (state.searchQuery) {
            const { results, total_pages } = await ApiService.search(state.apiKey, state.searchQuery, nextPage);
            const existingIds = new Set((state.searchResults || []).map(m => m.id));
            const newMovies = results.filter(m => !existingIds.has(m.id));

            state.searchResults = (state.searchResults || []).concat(newMovies);
            state.discoverPage = nextPage;
            state.discoverTotalPages = total_pages;

            state.discoverMovies = typeof applySearchFilters === 'function'
                ? applySearchFilters(state.searchResults)
                : state.searchResults;

            renderDiscoverGrid();
            enrichDiscoverRuntimes();
        } else {
            const { results, total_pages } = isAllDefaults
                ? await ApiService.fetchPopular(state.apiKey, nextPage)
                : await ApiService.discover(state.apiKey, {
                    genre: state.activeGenre,
                    minRating: state.minRating,
                    releaseDecade: state.releaseDecade,
                    sort: state.discoverSort
                }, nextPage);

            // Deduplicate by id before appending
            const existingIds = new Set(state.discoverMovies.map(m => m.id));
            const newMovies = results.filter(m => !existingIds.has(m.id));

            state.discoverMovies = state.discoverMovies.concat(newMovies);
            state.discoverPage = nextPage;
            state.discoverTotalPages = total_pages;

            // Append new cards to existing grid
            const grid = document.getElementById('discoverGrid');
            if (grid) {
                newMovies.forEach(movie => {
                    const isInWatchlist = state.watchlist.some(w => w.id === movie.id);
                    const card = createDiscoverMovieCard(movie, isInWatchlist);
                    grid.appendChild(card);
                });
            }

            const countBadge = document.getElementById('discoverResultsCount');
            if (countBadge) countBadge.textContent = `${state.discoverMovies.length} titles`;

            enrichDiscoverRuntimes();
        }
    } catch (err) {
        console.warn('Load More failed:', err);
        showToast('Failed to load more movies. Try again.', 'info');
    }

    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const btn = document.getElementById('discoverLoadMoreBtn');
    if (!btn) return;
    const hasMore = state.discoverPage < state.discoverTotalPages;
    btn.style.display = hasMore ? 'flex' : 'none';
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Load More';
}

async function searchMovies(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) {
        state.searchQuery = '';
        state.searchResults = [];
        await loadInitialDiscoverMovies();
        return;
    }

    state.searchQuery = trimmed;
    state.searchResults = [];
    state.discoverMovies = [];
    state.discoverPage = 1;
    state.discoverTotalPages = 1;

    // Reset filters to default on new search
    state.activeGenre = 'ALL';
    state.minRating = 0;
    state.releaseDecade = 'ALL';
    state.discoverSort = 'default';
    if (typeof renderAdvancedFilters === 'function') {
        renderAdvancedFilters();
    }

    const discoverTitle = document.getElementById('discoverResultsTitle');
    if (discoverTitle) discoverTitle.textContent = `Search Results for "${trimmed}"`;

    const countBadge = document.getElementById('discoverResultsCount');
    if (countBadge) countBadge.textContent = '';

    const loadMoreBtn = document.getElementById('discoverLoadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    const grid = document.getElementById('discoverGrid');
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-cyan); margin-bottom: 12px;"></i>
                <p>Searching movies...</p>
            </div>
        `;
    }

    if (state.apiKey) {
        try {
            const { results, total_pages } = await ApiService.search(state.apiKey, trimmed, 1);
            state.searchResults = results;
            state.discoverPage = 1;
            state.discoverTotalPages = total_pages;
            state.discoverMovies = typeof applySearchFilters === 'function'
                ? applySearchFilters(state.searchResults)
                : results;
            if (state.discoverMovies.length === 0) {
                showToast(`No movies found matching "${trimmed}"`, 'info');
            }
        } catch (err) {
            console.error('TMDB Search Error:', err);
            showToast('Search failed. Check your connection.', 'info');
            state.searchResults = [];
            state.discoverMovies = [];
            state.discoverPage = 1;
            state.discoverTotalPages = 1;
        }
    } else {
        state.searchResults = [];
        state.discoverMovies = [];
        state.discoverPage = 1;
        state.discoverTotalPages = 1;
    }
    renderDiscoverGrid();
    updateLoadMoreButton();
    enrichDiscoverRuntimes();
}

function formatTmdbResults(results) {
    return ApiService.formatResults(results);
}

// Global Exposure
window.runtimeCache = runtimeCache;
window.ApiService = ApiService;
window.enrichDiscoverRuntimes = enrichDiscoverRuntimes;
window.loadDiscoverMovies = loadDiscoverMovies;
window.loadInitialDiscoverMovies = loadInitialDiscoverMovies;
window.searchMovies = searchMovies;
window.formatTmdbResults = formatTmdbResults;
window.loadMoreDiscoverMovies = loadMoreDiscoverMovies;
window.updateLoadMoreButton = updateLoadMoreButton;
