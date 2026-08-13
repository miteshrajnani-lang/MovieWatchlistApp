/**
 * ==========================================================================
 * WATCHATHON - MOVIE WATCHLIST & DISCOVER ENGINE
 * Full Vanilla JS Application with TMDB API, User Auth (LocalStorage),
 * Per-User Watchlist Isolation, Movie Details Modal & CRUD Engine.
 * ==========================================================================
 */

// Global Application State
const state = {
    currentUser: null,
    watchlist: [],
    apiKey: '7f631300a2ef07bafe2c64d6214f99c2',
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
    loadUserSession();
    setupNavigation();
    setupEventListeners();
    setupStarPicker();

    // Initial Render
    loadInitialDiscoverMovies();
    renderWatchlist();
    renderStats();
}

/* ==========================================================================
   USER AUTH & ISOLATED LOCALSTORAGE ENGINE
   ========================================================================== */

function getUsersDb() {
    const dbRaw = localStorage.getItem('cyber_users_db');
    if (dbRaw) {
        try { return JSON.parse(dbRaw); } catch (e) { return {}; }
    }
    return {};
}

function saveUsersDb(db) {
    localStorage.setItem('cyber_users_db', JSON.stringify(db));
}

function loadUserSession() {
    const savedUser = localStorage.getItem('cyber_current_user');
    const usersDb = getUsersDb();

    if (savedUser && usersDb[savedUser]) {
        state.currentUser = savedUser;
        state.watchlist = usersDb[savedUser].watchlist || [];
    } else {
        state.currentUser = null;
        const savedWatchlist = localStorage.getItem('cyber_watchlist');
        if (savedWatchlist) {
            try { state.watchlist = JSON.parse(savedWatchlist); } catch (e) { state.watchlist = []; }
        } else {
            state.watchlist = [];
        }
    }

    sanitizeWatchlistUrls();
    updateUserHeaderUI();
    updateNavWatchlistCount();
}

function updateUserHeaderUI() {
    const container = document.getElementById('userBadgeContainer');
    if (!container) return;

    if (state.currentUser) {
        container.innerHTML = `
            <div class="user-profile-badge" title="Logged in as ${escapeHtml(state.currentUser)}">
                <i class="fa-solid fa-circle-user" style="color: var(--primary-cyan); font-size: 1.1rem;"></i>
                <span>${escapeHtml(state.currentUser)}</span>
                <button class="logout-btn" onclick="handleLogout()" title="Logout">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button class="auth-btn-trigger" onclick="openAuthModal('login')">
                <i class="fa-solid fa-right-to-bracket"></i> Sign In
            </button>
        `;
    }
}

/* ==========================================================================
   STORAGE ENGINE (LocalStorage Sync)
   ========================================================================== */

function loadApiKey() {
    const savedKey = localStorage.getItem('cyber_tmdb_api_key');
    if (savedKey) {
        state.apiKey = savedKey;
    }
    updateApiBadge();
}

function updateApiBadge() {
    const dot = document.getElementById('apiStatusDot');
    const text = document.getElementById('apiStatusText');
    if (dot) dot.classList.remove('demo-mode');
    if (text) text.textContent = 'TMDB Live API';
}

function loadWatchlist() {
    loadUserSession();
}

function sanitizeWatchlistUrls() {
    state.watchlist.forEach(movie => {
        if (movie.poster_path && movie.poster_path.includes('image.tmdb.org/t500')) {
            movie.poster_path = movie.poster_path.replace('image.tmdb.org/t500', 'image.tmdb.org/t/p/w500');
        }
        if (movie.backdrop_path && movie.backdrop_path.includes('image.tmdb.org/t1280')) {
            movie.backdrop_path = movie.backdrop_path.replace('image.tmdb.org/t1280', 'image.tmdb.org/t/p/w1280');
        }
    });
}

function saveWatchlist() {
    if (state.currentUser) {
        const usersDb = getUsersDb();
        if (!usersDb[state.currentUser]) {
            usersDb[state.currentUser] = { password: '', watchlist: [] };
        }
        usersDb[state.currentUser].watchlist = state.watchlist;
        saveUsersDb(usersDb);
    } else {
        localStorage.setItem('cyber_watchlist', JSON.stringify(state.watchlist));
    }
    updateNavWatchlistCount();
    renderStats();
}

function updateNavWatchlistCount() {
    const badge = document.getElementById('navWatchlistCount');
    if (badge) badge.textContent = state.watchlist.length;
}

/* ================= AUTH MODAL & HANDLERS ================= */

function openAuthModal(mode = 'login') {
    switchAuthTab(mode);
    document.getElementById('authModal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function switchAuthTab(mode) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const errLogin = document.getElementById('authErrorMessage');
    const errReg = document.getElementById('regErrorMessage');

    if (errLogin) errLogin.style.display = 'none';
    if (errReg) errReg.style.display = 'none';

    if (mode === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
    }
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('authErrorMessage');

    if (!username || !password) {
        errEl.textContent = 'Please fill in all fields.';
        errEl.style.display = 'block';
        return;
    }

    const usersDb = getUsersDb();
    const user = usersDb[username];

    if (!user || user.password !== password) {
        errEl.textContent = 'Invalid username or password.';
        errEl.style.display = 'block';
        return;
    }

    state.currentUser = username;
    localStorage.setItem('cyber_current_user', username);
    state.watchlist = user.watchlist || [];

    sanitizeWatchlistUrls();
    updateNavWatchlistCount();
    updateUserHeaderUI();
    renderWatchlist();
    renderDiscoverGrid();
    renderStats();
    closeAuthModal();

    showToast(`Welcome back, ${username}!`, 'success');
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const errEl = document.getElementById('regErrorMessage');

    if (!username || !password) {
        errEl.textContent = 'Please enter a username and password.';
        errEl.style.display = 'block';
        return;
    }

    if (username.length < 3) {
        errEl.textContent = 'Username must be at least 3 characters.';
        errEl.style.display = 'block';
        return;
    }

    const usersDb = getUsersDb();
    if (usersDb[username]) {
        errEl.textContent = 'Username already exists! Choose another or Sign In.';
        errEl.style.display = 'block';
        return;
    }

    usersDb[username] = { password: password, watchlist: [] };
    saveUsersDb(usersDb);

    state.currentUser = username;
    localStorage.setItem('cyber_current_user', username);
    state.watchlist = [];

    updateNavWatchlistCount();
    updateUserHeaderUI();
    renderWatchlist();
    renderDiscoverGrid();
    renderStats();
    closeAuthModal();

    showToast(`Account created! Welcome, ${username}.`, 'success');
}

function handleLogout() {
    saveWatchlist();
    const prevUser = state.currentUser;
    state.currentUser = null;
    localStorage.removeItem('cyber_current_user');
    state.watchlist = [];

    updateUserHeaderUI();
    renderWatchlist();
    renderDiscoverGrid();
    renderStats();

    showToast(`Logged out from ${prevUser}.`, 'info');
}

/* ==========================================================================
   TMDB API & DISCOVER ENGINE (Fetch API)
   ========================================================================== */

/**
 * Load initial movies for Discover section
 */
async function loadInitialDiscoverMovies() {
    if (state.apiKey) {
        try {
            const url = `https://api.themoviedb.org/3/movie/popular?api_key=${state.apiKey}&language=en-US&page=1`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('API Request Failed');
            const data = await response.json();
            state.discoverMovies = formatTmdbResults(data.results);
        } catch (err) {
            console.warn('TMDB API call failed:', err);
            showToast('Could not reach TMDB. Check your API key.', 'info');
            state.discoverMovies = [];
        }
    } else {
        state.discoverMovies = [];
    }
    renderDiscoverGrid();
    renderGenreFilters();
}

/**
 * Search movies from TMDB API
 */
async function searchMovies(query) {
    if (!query.trim()) {
        loadInitialDiscoverMovies();
        return;
    }

    const discoverTitle = document.getElementById('discoverResultsTitle');
    if (discoverTitle) discoverTitle.textContent = `Search Results for "${query}"`;

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
            showToast('Search failed. Check your connection.', 'info');
        }
    }
    renderDiscoverGrid();
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
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
            backdrop_path: item.backdrop_path
                ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
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
            <div class="poster-container clickable-card-area" onclick="openMovieDetailsModal(${movie.id})">
                <div class="tmdb-rating">★ ${movie.vote_average}</div>
                <img src="${posterSrc}" alt="${escapeHtml(movie.title)}" class="movie-poster" onerror="this.src='https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80'">
                <div class="poster-overlay">
                    <button class="cyber-btn cyber-btn-secondary" style="width: 48%; font-size: 0.8rem;" onclick="event.stopPropagation(); openMovieDetailsModal(${movie.id})">
                        <i class="fa-solid fa-circle-info"></i> Info
                    </button>
                    <button class="cyber-btn ${isInWatchlist ? 'cyber-btn-secondary' : 'cyber-btn-primary'}"
                        style="width: 48%; font-size: 0.8rem;"
                        onclick="event.stopPropagation(); openAddModal(${movie.id})">
                        <i class="fa-solid ${isInWatchlist ? 'fa-check' : 'fa-plus'}"></i>
                        ${isInWatchlist ? 'Added' : 'Add'}
                    </button>
                </div>
            </div>
            <div class="movie-info">
                <h3 class="movie-title clickable-card-area" onclick="openMovieDetailsModal(${movie.id})">${escapeHtml(movie.title)}</h3>
                <div class="movie-meta">
                    <span><i class="fa-regular fa-calendar"></i> ${(movie.release_date || '').split('-')[0] || 'N/A'}</span>
                    <span><i class="fa-solid fa-star" style="color: var(--star-gold);"></i> ${movie.vote_average} / 10</span>
                </div>
                <div class="genre-tags">${genresHtml}</div>
                <p class="movie-overview clickable-card-area" onclick="openMovieDetailsModal(${movie.id})">${escapeHtml(movie.overview)}</p>

                <div class="card-actions">
                    <button class="btn-icon" onclick="openMovieDetailsModal(${movie.id})">
                        <i class="fa-solid fa-circle-info"></i> Details
                    </button>
                    <button class="btn-icon" onclick="openAddModal(${movie.id})">
                        <i class="fa-solid ${isInWatchlist ? 'fa-pen-to-square' : 'fa-bookmark'}"></i>
                        ${isInWatchlist ? 'Edit' : 'Save'}
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

    if (state.filterStatus !== 'ALL') {
        list = list.filter(m => m.status === state.filterStatus);
    }

    if (state.localSearchQuery) {
        const q = state.localSearchQuery.toLowerCase();
        list = list.filter(m =>
            m.title.toLowerCase().includes(q) ||
            (m.notes && m.notes.toLowerCase().includes(q)) ||
            m.genres.some(g => g.toLowerCase().includes(q))
        );
    }

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
        const emptyAction = state.currentUser
            ? `<button class="cyber-btn cyber-btn-primary" style="margin-top: 16px;" onclick="switchView('discover-view')"><i class="fa-solid fa-compass"></i> Discover Movies</button>`
            : `<button class="cyber-btn cyber-btn-primary" style="margin-top: 16px;" onclick="openAuthModal('login')"><i class="fa-solid fa-right-to-bracket"></i> Sign In</button>`;
        const emptyMsg = state.currentUser ? 'No movies match your current filter.' : 'Sign in to access your personal watchlist.';
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <i class="fa-solid fa-film" style="font-size: 3rem; color: var(--secondary-purple); margin-bottom: 12px;"></i>
                <h3>Watchlist is Empty</h3>
                <p>${emptyMsg}</p>
                ${emptyAction}
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
            <div class="poster-container clickable-card-area" onclick="openMovieDetailsModal(${movie.id})">
                <span class="status-badge ${statusClass}">${movie.status}</span>
                <div class="tmdb-rating">★ ${movie.vote_average}</div>
                <img src="${movie.poster_path}" alt="${escapeHtml(movie.title)}" class="movie-poster" onerror="this.src='https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80'">
                <div class="poster-overlay">
                    <button class="cyber-btn cyber-btn-primary" style="width: 100%; font-size: 0.85rem;" onclick="event.stopPropagation(); openMovieDetailsModal(${movie.id})">
                        <i class="fa-solid fa-circle-info"></i> View Details
                    </button>
                </div>
            </div>
            <div class="movie-info">
                <h3 class="movie-title clickable-card-area" onclick="openMovieDetailsModal(${movie.id})">${escapeHtml(movie.title)}</h3>
                <div class="movie-meta">
                    <span><i class="fa-regular fa-calendar"></i> ${(movie.release_date || '').split('-')[0] || 'N/A'}</span>
                </div>
                <div class="genre-tags">${genresHtml}</div>

                ${movie.notes
                ? `<div class="personal-review-box clickable-card-area" onclick="openMovieDetailsModal(${movie.id})"><div class="personal-stars">${starsHtml}</div><p class="personal-notes">"${escapeHtml(movie.notes)}"</p></div>`
                : `<div class="personal-review-box clickable-card-area" onclick="openMovieDetailsModal(${movie.id})"><div class="personal-stars">${starsHtml}</div></div>`
            }

                <div class="card-actions">
                    <button class="btn-icon" onclick="openMovieDetailsModal(${movie.id})">
                        <i class="fa-solid fa-circle-info"></i> Details
                    </button>
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

    const genres = ['ALL', 'Sci-Fi', 'Action', 'Animation', 'Drama', 'Adventure', 'Thriller', 'Comedy'];
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
   MOVIE DETAILS MODAL
   ========================================================================== */

function openMovieDetailsModal(movieId) {
    let movie = state.discoverMovies.find(m => m.id === movieId) ||
        state.watchlist.find(m => m.id === movieId);

    if (!movie) return;

    const watchlistEntry = state.watchlist.find(m => m.id === movieId);

    document.getElementById('detailTitle').textContent = movie.title;
    document.getElementById('detailMatch').textContent = `★ ${movie.vote_average} TMDB`;
    document.getElementById('detailYear').textContent = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

    const posterElem = document.getElementById('detailPoster');
    posterElem.src = movie.poster_path || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80';

    const heroBg = document.getElementById('detailHeroBg');
    const backdropUrl = movie.backdrop_path || movie.poster_path;
    if (backdropUrl) {
        heroBg.style.backgroundImage = `url('${backdropUrl}')`;
    } else {
        heroBg.style.backgroundImage = 'none';
    }

    document.getElementById('detailOverview').textContent = movie.overview || 'No detailed overview available for this movie.';

    const genresContainer = document.getElementById('detailGenres');
    const genresList = movie.genres || ['Cinema'];
    genresContainer.innerHTML = genresList.map(g => `<span class="genre-tag">${g}</span>`).join('');

    const statusBox = document.getElementById('detailWatchlistStatusBox');
    if (watchlistEntry) {
        const starsHtml = '★'.repeat(watchlistEntry.personalRating || 0) + '☆'.repeat(5 - (watchlistEntry.personalRating || 0));
        const statusClass = watchlistEntry.status === 'Plan to Watch' ? 'plan' : (watchlistEntry.status === 'Watching' ? 'watching' : 'completed');
        statusBox.style.display = 'block';
        statusBox.innerHTML = `
            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(0, 240, 255, 0.2); padding: 14px 18px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="status-badge ${statusClass}">${watchlistEntry.status}</span>
                    <span style="color: var(--star-gold); font-size: 1.1rem;">${starsHtml}</span>
                </div>
                ${watchlistEntry.notes ? `<p style="font-size: 0.88rem; color: #cbd5e1; font-style: italic; margin-top: 8px;">"${escapeHtml(watchlistEntry.notes)}"</p>` : ''}
            </div>
        `;
    } else {
        statusBox.style.display = 'none';
        statusBox.innerHTML = '';
    }

    const actionsContainer = document.getElementById('detailActions');
    if (watchlistEntry) {
        actionsContainer.innerHTML = `
            <button class="cyber-btn cyber-btn-primary" onclick="closeMovieDetailsModal(); openEditModal(${movie.id})">
                <i class="fa-solid fa-pen"></i> Edit Watchlist & Rating
            </button>
            <button class="cyber-btn cyber-btn-pink" onclick="closeMovieDetailsModal(); openDeleteModal(${movie.id})">
                <i class="fa-solid fa-trash"></i> Remove
            </button>
        `;
    } else {
        actionsContainer.innerHTML = `
            <button class="cyber-btn cyber-btn-primary" onclick="closeMovieDetailsModal(); openAddModal(${movie.id})">
                <i class="fa-solid fa-plus"></i> Add to My Watchlist
            </button>
        `;
    }

    document.getElementById('movieDetailsModal').classList.add('active');
}

function closeMovieDetailsModal() {
    document.getElementById('movieDetailsModal').classList.remove('active');
}


/* ==========================================================================
   CRUD OPERATIONS (Create, Read, Update, Delete)
   ========================================================================== */

/**
 * Open Modal to Add/Edit Movie in Watchlist
 */
function openAddModal(movieId) {
    if (!state.currentUser) {
        showToast('Please sign in or create an account to save movies to your watchlist!', 'info');
        openAuthModal('login');
        return;
    }

    let movie = state.discoverMovies.find(m => m.id === movieId) ||
        state.watchlist.find(m => m.id === movieId);

    if (!movie) return;

    const existingInWatchlist = state.watchlist.find(m => m.id === movieId);

    document.getElementById('modalTitle').textContent = existingInWatchlist ? 'EDIT WATCHLIST ITEM' : 'ADD TO WATCHLIST';
    document.getElementById('modalMovieId').value = movie.id;
    document.getElementById('modalMovieData').value = JSON.stringify(movie);

    document.getElementById('modalStatusSelect').value = existingInWatchlist ? existingInWatchlist.status : 'Plan to Watch';
    document.getElementById('modalNotesInput').value = existingInWatchlist ? (existingInWatchlist.notes || '') : '';

    const initialRating = existingInWatchlist ? (existingInWatchlist.personalRating || 0) : 0;
    setStarRatingUI(initialRating);

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
        state.watchlist[existingIndex] = {
            ...state.watchlist[existingIndex],
            status,
            personalRating,
            notes
        };
        showToast(`Updated "${movieBase.title}" in Watchlist!`, 'success');
    } else {
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

    const rated = state.watchlist.filter(m => m.personalRating > 0);
    const avg = rated.length > 0
        ? (rated.reduce((sum, m) => sum + m.personalRating, 0) / rated.length).toFixed(1)
        : '0.0';

    const hours = Math.round(total * 2.1);

    document.getElementById('statTotalMovies').textContent = total;
    document.getElementById('statCompletedMovies').textContent = completed;
    document.getElementById('statAvgRating').textContent = `${avg} ★`;
    document.getElementById('statHoursEstimated').textContent = `${hours} hrs`;

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
    document.getElementById('tmdbSearchBtn')?.addEventListener('click', () => {
        const query = document.getElementById('tmdbSearchInput').value;
        searchMovies(query);
    });

    document.getElementById('tmdbSearchInput')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchMovies(e.target.value);
        }
    });

    document.getElementById('watchlistLocalSearch')?.addEventListener('input', (e) => {
        state.localSearchQuery = e.target.value;
        renderWatchlist();
    });

    document.querySelectorAll('[data-status-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-status-filter]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.filterStatus = e.target.getAttribute('data-status-filter');
            renderWatchlist();
        });
    });

    document.getElementById('watchlistSort')?.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderWatchlist();
    });

    document.getElementById('watchlistForm')?.addEventListener('submit', handleWatchlistSubmit);

    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDeleteMovie);

    // Auth form submissions
    document.getElementById('loginForm')?.addEventListener('submit', handleLoginSubmit);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegisterSubmit);

    // Close modals on overlay background click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
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

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
    }
}
