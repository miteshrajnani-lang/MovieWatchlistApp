/**
 * ==========================================================================
 * CYBER-WATCH MOVIE WATCHLIST & DISCOVER ENGINE
 * Full Vanilla JS Application Logic featuring TMDB API Integration, 
 * LocalStorage CRUD Engine, Dynamic Filtering, Stats Engine & Modals.
 * ==========================================================================
 */

// Global Application State
const state = {
    watchlist: [],
    apiKey: '',
    currentView: 'discover-view',
    discoverMovies: [],
    filterStatus: 'ALL',
    searchQuery: '',
    localSearchQuery: '',
    sortBy: 'dateAdded',
    activeGenre: 'ALL',
    editingMovieId: null,
    deletingMovieId: null
};

// Genre Map for TMDB API genre IDs
const TMDB_GENRES = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};

// DOM Content Loaded - Application Entry Point
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

/**
 * Initialize Application Engine
 */
function initApp() {
    loadApiKey();
    loadWatchlist();
    setupNavigation();
    setupEventListeners();
    setupStarPicker();
    
    // Initial Render of Discover & Watchlist Views
    loadInitialDiscoverMovies();
    renderWatchlist();
    renderStats();
}

/* ==========================================================================
   STORAGE ENGINE (LocalStorage Sync)
   ========================================================================== */

function loadApiKey() {
    const savedKey = localStorage.getItem('cyber_tmdb_api_key');
    if (savedKey) {
        state.apiKey = savedKey;
        updateApiBadge(true);
    } else {
        updateApiBadge(false);
    }
}

function saveApiKey(key) {
    state.apiKey = key.trim();
    if (state.apiKey) {
        localStorage.setItem('cyber_tmdb_api_key', state.apiKey);
        updateApiBadge(true);
        showToast('TMDB API Key saved successfully!', 'success');
    } else {
        localStorage.removeItem('cyber_tmdb_api_key');
        updateApiBadge(false);
        showToast('Running in Cyber-Deck Demo Mode.', 'info');
    }
}

function updateApiBadge(isLive) {
    const dot = document.getElementById('apiStatusDot');
    const text = document.getElementById('apiStatusText');
    if (isLive) {
        dot.classList.remove('demo-mode');
        text.textContent = 'TMDB Live Connected';
    } else {
        dot.classList.add('demo-mode');
        text.textContent = 'Demo Mode (Click to Add Key)';
    }
}

function loadWatchlist() {
    const savedWatchlist = localStorage.getItem('cyber_watchlist');
    if (savedWatchlist) {
        try {
            state.watchlist = JSON.parse(savedWatchlist);
        } catch (e) {
            console.error('Failed to parse watchlist from storage:', e);
            state.watchlist = [...INITIAL_WATCHLIST_SAMPLES];
        }
    } else {
        // First-time visit: populate with pre-seeded sample data
        state.watchlist = [...INITIAL_WATCHLIST_SAMPLES];
        saveWatchlist();
    }
    updateNavWatchlistCount();
}

function saveWatchlist() {
    localStorage.setItem('cyber_watchlist', JSON.stringify(state.watchlist));
    updateNavWatchlistCount();
    renderStats();
}

function updateNavWatchlistCount() {
    const badge = document.getElementById('navWatchlistCount');
    if (badge) badge.textContent = state.watchlist.length;
}


/* ==========================================================================
   TMDB API & DISCOVER ENGINE (Fetch API & Fallback)
   ========================================================================== */

/**
 * Load initial movies for Discover section
 */
async function loadInitialDiscoverMovies() {
    if (state.apiKey) {
        // Query TMDB for trending/popular movies
        try {
            const url = `https://api.themoviedb.org/3/movie/popular?api_key=${state.apiKey}&language=en-US&page=1`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('API Request Failed');
            const data = await response.json();
            state.discoverMovies = formatTmdbResults(data.results);
        } catch (err) {
            console.warn('TMDB API call failed, falling back to mock dataset:', err);
            state.discoverMovies = [...MOCK_MOVIES];
            showToast('Using Cyber-Deck Demo dataset.', 'info');
        }
    } else {
        state.discoverMovies = [...MOCK_MOVIES];
    }
    renderDiscoverGrid();
    renderGenreFilters();
}

/**
 * Search movies from TMDB API or local mock data
 */
async function searchMovies(query) {
    if (!query.trim()) {
        loadInitialDiscoverMovies();
        return;
    }

    const discoverTitle = document.getElementById('discoverResultsTitle');
    discoverTitle.textContent = `Search Results for "${query}"`;

    if (state.apiKey) {
        try {
            const url = `https://api.themoviedb.org/3/search/movie?api_key=${state.apiKey}&query=${encodeURIComponent(query)}&language=en-US&page=1`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Search Request Failed');
            const data = await response.json();
            state.discoverMovies = formatTmdbResults(data.results);
            if (state.discoverMovies.length === 0) {
                showToast(`No movies found matching "${query}"`, 'info');
            }
        } catch (err) {
            console.error('TMDB Search Error:', err);
            fallbackMockSearch(query);
        }
    } else {
        fallbackMockSearch(query);
    }
    renderDiscoverGrid();
}

function fallbackMockSearch(query) {
    const q = query.toLowerCase();
    state.discoverMovies = MOCK_MOVIES.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.overview.toLowerCase().includes(q) ||
        m.genres.some(g => g.toLowerCase().includes(q))
    );
}

/**
 * Format raw TMDB API items into standard internal movie structure
 */
function formatTmdbResults(results) {
    return results.map(item => {
        const genreNames = (item.genre_ids || []).map(id => TMDB_GENRES[id] || 'Movie');
        return {
            id: item.id,
            title: item.title || 'Untitled Movie',
            release_date: item.release_date || 'N/A',
            vote_average: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0,
            overview: item.overview || 'No overview available.',
            poster_path: item.poster_path 
                ? `https://image.tmdb.org/t500${item.poster_path}` 
                : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
            backdrop_path: item.backdrop_path 
                ? `https://image.tmdb.org/t1280${item.backdrop_path}` 
                : null,
            genres: genreNames.length > 0 ? genreNames : ['Cinema']
        };
    });
}


/* ==========================================================================
   UI RENDERING ENGINE (DOM Manipulation)
   ========================================================================== */

/**
 * Render Discover Grid
 */
function renderDiscoverGrid() {
    const grid = document.getElementById('discoverGrid');
    grid.innerHTML = '';

    let moviesToDisplay = state.discoverMovies;

    // Apply active genre filter
    if (state.activeGenre !== 'ALL') {
        moviesToDisplay = moviesToDisplay.filter(m => m.genres.includes(state.activeGenre));
    }

    if (moviesToDisplay.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <i class="fa-solid fa-ghost" style="font-size: 3rem; color: var(--primary-cyan); margin-bottom: 12px;"></i>
                <h3>No Movies Found</h3>
                <p>Try searching for a different keyword or adjusting genre filters.</p>
            </div>
        `;
        return;
    }

    moviesToDisplay.forEach(movie => {
        const isInWatchlist = state.watchlist.some(w => w.id === movie.id);
        const card = document.createElement('div');
        card.className = 'movie-card';

        const posterSrc = movie.poster_path;
        const genresHtml = movie.genres.map(g => `<span class="genre-tag">${g}</span>`).join('');

        card.innerHTML = `
            <div class="poster-container">
                <div class="tmdb-rating">★ ${movie.vote_average}</div>
                <img src="${posterSrc}" alt="${escapeHtml(movie.title)}" class="movie-poster" onerror="this.src='https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80'">
                <div class="poster-overlay">
                    <button class="cyber-btn ${isInWatchlist ? 'cyber-btn-secondary' : 'cyber-btn-primary'}" 
                        style="width: 100%;" 
                        onclick="openAddModal(${movie.id})">
                        <i class="fa-solid ${isInWatchlist ? 'fa-check' : 'fa-plus'}"></i> 
                        ${isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    </button>
                </div>
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
                <div class="movie-meta">
                    <span><i class="fa-regular fa-calendar"></i> ${movie.release_date.split('-')[0] || 'N/A'}</span>
                    <span><i class="fa-solid fa-star" style="color: var(--star-gold);"></i> ${movie.vote_average} / 10</span>
                </div>
                <div class="genre-tags">${genresHtml}</div>
                <p class="movie-overview">${escapeHtml(movie.overview)}</p>
                
                <div class="card-actions">
                    <button class="btn-icon" onclick="openAddModal(${movie.id})">
                        <i class="fa-solid ${isInWatchlist ? 'fa-pen-to-square' : 'fa-bookmark'}"></i> 
                        ${isInWatchlist ? 'Edit Watchlist' : 'Save'}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

/**
 * Render Watchlist Grid
 */
function renderWatchlist() {
    const grid = document.getElementById('watchlistGrid');
    grid.innerHTML = '';

    let list = [...state.watchlist];

    // Filter by Status
    if (state.filterStatus !== 'ALL') {
        list = list.filter(m => m.status === state.filterStatus);
    }

    // Filter by Local Search Bar
    if (state.localSearchQuery) {
        const q = state.localSearchQuery.toLowerCase();
        list = list.filter(m => 
            m.title.toLowerCase().includes(q) ||
            (m.notes && m.notes.toLowerCase().includes(q)) ||
            m.genres.some(g => g.toLowerCase().includes(q))
        );
    }

    // Sort Watchlist Items
    if (state.sortBy === 'dateAdded') {
        list.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
    } else if (state.sortBy === 'personalRating') {
        list.sort((a, b) => (b.personalRating || 0) - (a.personalRating || 0));
    } else if (state.sortBy === 'tmdbRating') {
        list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (state.sortBy === 'title') {
        list.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (list.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <i class="fa-solid fa-film" style="font-size: 3rem; color: var(--secondary-purple); margin-bottom: 12px;"></i>
                <h3>Watchlist is Empty</h3>
                <p>No movies match your current status filter or search query.</p>
                <button class="cyber-btn cyber-btn-primary" style="margin-top: 16px;" onclick="switchView('discover-view')">
                    <i class="fa-solid fa-compass"></i> Discover Movies
                </button>
            </div>
        `;
        return;
    }

    list.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';

        const statusClass = movie.status === 'Plan to Watch' ? 'plan' : (movie.status === 'Watching' ? 'watching' : 'completed');
        const starsHtml = '★'.repeat(movie.personalRating || 0) + '☆'.repeat(5 - (movie.personalRating || 0));
        const genresHtml = (movie.genres || []).map(g => `<span class="genre-tag">${g}</span>`).join('');

        card.innerHTML = `
            <div class="poster-container">
                <span class="status-badge ${statusClass}">${movie.status}</span>
                <div class="tmdb-rating">★ ${movie.vote_average}</div>
                <img src="${movie.poster_path}" alt="${escapeHtml(movie.title)}" class="movie-poster" onerror="this.src='https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80'">
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
                <div class="movie-meta">
                    <span><i class="fa-regular fa-calendar"></i> ${movie.release_date.split('-')[0] || 'N/A'}</span>
                </div>
                <div class="genre-tags">${genresHtml}</div>
                
                ${movie.notes ? `<div class="personal-review-box"><div class="personal-stars">${starsHtml}</div><p class="personal-notes">"${escapeHtml(movie.notes)}"</p></div>` : `<div class="personal-review-box"><div class="personal-stars">${starsHtml}</div></div>`}
                
                <div class="card-actions">
                    <button class="btn-icon" onclick="openEditModal(${movie.id})">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn-icon delete" onclick="openDeleteModal(${movie.id})">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

/**
 * Render Genre Filter Buttons in Discover Bar
 */
function renderGenreFilters() {
    const container = document.getElementById('genreFilterGroup');
    if (!container) return;

    const genres = ['ALL', 'Sci-Fi', 'Action', 'Cyberpunk', 'Animation', 'Drama', 'Adventure'];
    container.innerHTML = genres.map(g => `
        <button class="filter-badge ${state.activeGenre === g ? 'active' : ''}" onclick="setGenreFilter('${g}')">
            ${g}
        </button>
    `).join('');
}

function setGenreFilter(genre) {
    state.activeGenre = genre;
    renderGenreFilters();
    renderDiscoverGrid();
}


/* ==========================================================================
   CRUD OPERATIONS (Create, Read, Update, Delete)
   ========================================================================== */

/**
 * Open Modal to Add/Edit Movie in Watchlist
 */
function openAddModal(movieId) {
    // Find movie in discover list or watchlist
    let movie = state.discoverMovies.find(m => m.id === movieId) || 
                state.watchlist.find(m => m.id === movieId) ||
                MOCK_MOVIES.find(m => m.id === movieId);

    if (!movie) return;

    const existingInWatchlist = state.watchlist.find(m => m.id === movieId);

    document.getElementById('modalTitle').textContent = existingInWatchlist ? 'EDIT WATCHLIST ITEM' : 'ADD TO WATCHLIST';
    document.getElementById('modalMovieId').value = movie.id;
    document.getElementById('modalMovieData').value = JSON.stringify(movie);

    // Set initial form values
    document.getElementById('modalStatusSelect').value = existingInWatchlist ? existingInWatchlist.status : 'Plan to Watch';
    document.getElementById('modalNotesInput').value = existingInWatchlist ? (existingInWatchlist.notes || '') : '';
    
    const initialRating = existingInWatchlist ? (existingInWatchlist.personalRating || 0) : 0;
    setStarRatingUI(initialRating);

    // Movie preview element
    const preview = document.getElementById('modalMoviePreview');
    preview.innerHTML = `
        <img src="${movie.poster_path}" style="width: 55px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color);">
        <div>
            <h4 style="color: #fff; font-family: var(--font-heading); font-size: 1rem;">${escapeHtml(movie.title)}</h4>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Released: ${movie.release_date} | TMDB: ★ ${movie.vote_average}</div>
        </div>
    `;

    document.getElementById('watchlistModal').classList.add('active');
}

function openEditModal(movieId) {
    openAddModal(movieId);
}

function closeWatchlistModal() {
    document.getElementById('watchlistModal').classList.remove('active');
}

/**
 * Handle Watchlist Form Submit (Create & Update)
 */
function handleWatchlistSubmit(e) {
    e.preventDefault();

    const movieId = parseInt(document.getElementById('modalMovieId').value);
    const movieDataRaw = document.getElementById('modalMovieData').value;
    const status = document.getElementById('modalStatusSelect').value;
    const personalRating = parseInt(document.getElementById('modalRatingInput').value) || 0;
    const notes = document.getElementById('modalNotesInput').value.trim();

    let movieBase = JSON.parse(movieDataRaw);

    const existingIndex = state.watchlist.findIndex(m => m.id === movieId);

    if (existingIndex >= 0) {
        // UPDATE existing watchlist item
        state.watchlist[existingIndex] = {
            ...state.watchlist[existingIndex],
            status,
            personalRating,
            notes
        };
        showToast(`Updated "${movieBase.title}" in Watchlist!`, 'success');
    } else {
        // CREATE new watchlist item
        const newItem = {
            ...movieBase,
            status,
            personalRating,
            notes,
            dateAdded: new Date().toISOString()
        };
        state.watchlist.unshift(newItem);
        showToast(`Added "${movieBase.title}" to Watchlist!`, 'success');
    }

    saveWatchlist();
    renderWatchlist();
    renderDiscoverGrid();
    closeWatchlistModal();
}

/**
 * Delete Operations
 */
function openDeleteModal(movieId) {
    const movie = state.watchlist.find(m => m.id === movieId);
    if (!movie) return;

    state.deletingMovieId = movieId;
    document.getElementById('deleteMovieTitle').textContent = `Are you sure you want to remove "${movie.title}" from your watchlist?`;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    state.deletingMovieId = null;
    document.getElementById('deleteModal').classList.remove('active');
}

function confirmDeleteMovie() {
    if (!state.deletingMovieId) return;

    const movie = state.watchlist.find(m => m.id === state.deletingMovieId);
    state.watchlist = state.watchlist.filter(m => m.id !== state.deletingMovieId);

    saveWatchlist();
    renderWatchlist();
    renderDiscoverGrid();
    closeDeleteModal();

    if (movie) {
        showToast(`Removed "${movie.title}" from Watchlist.`, 'info');
    }
}


/* ==========================================================================
   STATS & ANALYTICS CALCULATOR
   ========================================================================== */

function renderStats() {
    const total = state.watchlist.length;
    const completed = state.watchlist.filter(m => m.status === 'Completed').length;
    
    // Average rating
    const rated = state.watchlist.filter(m => m.personalRating > 0);
    const avg = rated.length > 0 
        ? (rated.reduce((sum, m) => sum + m.personalRating, 0) / rated.length).toFixed(1) 
        : '0.0';

    // Estimated watch hours (assume avg 2.1 hours per movie)
    const hours = Math.round(total * 2.1);

    document.getElementById('statTotalMovies').textContent = total;
    document.getElementById('statCompletedMovies').textContent = completed;
    document.getElementById('statAvgRating').textContent = `${avg} ★`;
    document.getElementById('statHoursEstimated').textContent = `${hours} hrs`;

    // Render Status Breakdown Bar
    const plan = state.watchlist.filter(m => m.status === 'Plan to Watch').length;
    const watching = state.watchlist.filter(m => m.status === 'Watching').length;

    const planPct = total ? Math.round((plan / total) * 100) : 0;
    const watchPct = total ? Math.round((watching / total) * 100) : 0;
    const compPct = total ? Math.round((completed / total) * 100) : 0;

    const container = document.getElementById('statusBreakdownContainer');
    if (container) {
        container.innerHTML = `
            <div style="display: flex; height: 16px; border-radius: 8px; overflow: hidden; background: #08090d; border: 1px solid var(--border-color); margin-bottom: 16px;">
                <div style="width: ${planPct}%; background: var(--status-plan);" title="Plan to Watch (${planPct}%)"></div>
                <div style="width: ${watchPct}%; background: var(--status-watching);" title="Watching (${watchPct}%)"></div>
                <div style="width: ${compPct}%; background: var(--status-completed);" title="Completed (${compPct}%)"></div>
            </div>
            <div style="display: flex; justify-content: space-around; font-size: 0.85rem; color: var(--text-muted);">
                <span><i class="fa-solid fa-square" style="color: var(--status-plan);"></i> Plan to Watch: <strong>${plan}</strong> (${planPct}%)</span>
                <span><i class="fa-solid fa-square" style="color: var(--status-watching);"></i> Watching: <strong>${watching}</strong> (${watchPct}%)</span>
                <span><i class="fa-solid fa-square" style="color: var(--status-completed);"></i> Completed: <strong>${completed}</strong> (${compPct}%)</span>
            </div>
        `;
    }
}


/* ==========================================================================
   EVENT LISTENERS & INTERACTIVITY
   ========================================================================== */

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetView = btn.getAttribute('data-view');
            switchView(targetView);
        });
    });
}

function switchView(viewId) {
    state.currentView = viewId;

    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-view') === viewId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Hide all view sections and display target
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.style.display = sec.id === viewId ? 'block' : 'none';
    });

    // Refresh view specific data
    if (viewId === 'watchlist-view') renderWatchlist();
    if (viewId === 'stats-view') renderStats();
}

function setupEventListeners() {
    // TMDB Search Button
    document.getElementById('tmdbSearchBtn')?.addEventListener('click', () => {
        const query = document.getElementById('tmdbSearchInput').value;
        searchMovies(query);
    });

    // Enter key on search input
    document.getElementById('tmdbSearchInput')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchMovies(e.target.value);
        }
    });

    // Watchlist Local Live Filter Input
    document.getElementById('watchlistLocalSearch')?.addEventListener('input', (e) => {
        state.localSearchQuery = e.target.value;
        renderWatchlist();
    });

    // Status Filter Badges in Watchlist
    document.querySelectorAll('[data-status-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-status-filter]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.filterStatus = e.target.getAttribute('data-status-filter');
            renderWatchlist();
        });
    });

    // Sort Dropdown
    document.getElementById('watchlistSort')?.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderWatchlist();
    });

    // Watchlist Form Submit
    document.getElementById('watchlistForm')?.addEventListener('submit', handleWatchlistSubmit);

    // API Key Modal Triggers
    document.getElementById('openApiModalBtn')?.addEventListener('click', () => {
        document.getElementById('apiKeyInput').value = state.apiKey;
        document.getElementById('apiModal').classList.add('active');
    });

    document.getElementById('saveApiKeyBtn')?.addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value;
        saveApiKey(key);
        closeApiModal();
        loadInitialDiscoverMovies();
    });

    document.getElementById('resetApiKeyBtn')?.addEventListener('click', () => {
        saveApiKey('');
        closeApiModal();
        loadInitialDiscoverMovies();
    });

    // Delete Confirmation
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDeleteMovie);
}

function closeApiModal() {
    document.getElementById('apiModal').classList.remove('active');
}

/**
 * Interactive Star Rating Picker Controls
 */
function setupStarPicker() {
    const stars = document.querySelectorAll('#starPickerContainer .star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const val = parseInt(star.getAttribute('data-value'));
            setStarRatingUI(val);
        });

        star.addEventListener('mouseenter', () => {
            const val = parseInt(star.getAttribute('data-value'));
            highlightStars(val);
        });
    });

    document.getElementById('starPickerContainer')?.addEventListener('mouseleave', () => {
        const currentVal = parseInt(document.getElementById('modalRatingInput').value) || 0;
        highlightStars(currentVal);
    });
}

function setStarRatingUI(rating) {
    document.getElementById('modalRatingInput').value = rating;
    highlightStars(rating);
}

function highlightStars(count) {
    const stars = document.querySelectorAll('#starPickerContainer .star');
    stars.forEach((star, index) => {
        if (index < count) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}


/* ==========================================================================
   TOAST NOTIFICATION ENGINE & UTILITIES
   ========================================================================== */

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    const color = type === 'success' ? 'var(--status-completed)' : 'var(--primary-cyan)';

    toast.style.borderLeftColor = color;
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${color}; font-size: 1.1rem;"></i> <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
