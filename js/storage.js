// ==========================================================================
// STORAGE SERVICE & USER SESSION ENGINE
// ==========================================================================

const StorageService = {
    getUsersDb() {
        const key = (window.STORAGE_KEYS && window.STORAGE_KEYS.USERS_DB) || 'cyber_users_db';
        const dbRaw = localStorage.getItem(key);
        if (dbRaw) {
            try { return JSON.parse(dbRaw); } catch (e) { return {}; }
        }
        return {};
    },

    saveUsersDb(db) {
        const key = (window.STORAGE_KEYS && window.STORAGE_KEYS.USERS_DB) || 'cyber_users_db';
        localStorage.setItem(key, JSON.stringify(db));
    },

    getCurrentUser() {
        const key = (window.STORAGE_KEYS && window.STORAGE_KEYS.CURRENT_USER) || 'cyber_current_user';
        return localStorage.getItem(key);
    },

    setCurrentUser(username) {
        const key = (window.STORAGE_KEYS && window.STORAGE_KEYS.CURRENT_USER) || 'cyber_current_user';
        if (username) {
            localStorage.setItem(key, username);
        } else {
            localStorage.removeItem(key);
        }
    },

    getLegacyWatchlist() {
        const key = (window.STORAGE_KEYS && window.STORAGE_KEYS.WATCHLIST) || 'cyber_watchlist';
        const raw = localStorage.getItem(key);
        if (raw) {
            try { return JSON.parse(raw); } catch (e) { return []; }
        }
        return [];
    },

    saveLegacyWatchlist(watchlist) {
        const key = (window.STORAGE_KEYS && window.STORAGE_KEYS.WATCHLIST) || 'cyber_watchlist';
        localStorage.setItem(key, JSON.stringify(watchlist));
    },

    getApiKey() {
        const key = (window.STORAGE_KEYS && window.STORAGE_KEYS.API_KEY) || 'cyber_tmdb_api_key';
        return localStorage.getItem(key);
    }
};

function getUsersDb() {
    return StorageService.getUsersDb();
}

function saveUsersDb(db) {
    StorageService.saveUsersDb(db);
}

function loadUserSession() {
    const savedUser = StorageService.getCurrentUser();
    const usersDb = StorageService.getUsersDb();

    if (savedUser && usersDb[savedUser]) {
        state.currentUser = savedUser;
        state.watchlist = usersDb[savedUser].watchlist || [];
    } else {
        state.currentUser = null;
        state.watchlist = StorageService.getLegacyWatchlist();
    }

    sanitizeWatchlistUrls();
    
    // Seed runtime cache from existing watchlist
    state.watchlist.forEach(m => {
        if (typeof m.runtime === 'number' && m.runtime > 0 && window.runtimeCache) {
            window.runtimeCache.set(m.id, m.runtime);
        }
    });

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

function loadApiKey() {
    const savedKey = StorageService.getApiKey();
    if (savedKey) {
        state.apiKey = savedKey;
    }
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
        const usersDb = StorageService.getUsersDb();
        if (!usersDb[state.currentUser]) {
            usersDb[state.currentUser] = { password: '', watchlist: [] };
        }
        usersDb[state.currentUser].watchlist = state.watchlist;
        StorageService.saveUsersDb(usersDb);
    } else {
        StorageService.saveLegacyWatchlist(state.watchlist);
    }
    updateNavWatchlistCount();
    renderStats();
}

function updateNavWatchlistCount() {
    const badge = document.getElementById('navWatchlistCount');
    if (badge) badge.textContent = state.watchlist.length;
}

/**
 * Safe, non-destructive migration engine:
 * Retrieves missing runtimes for previously saved movies and stores them directly
 * in the existing movie record without modifying ratings, notes, dates, or other fields.
 */
async function enrichWatchlistRuntimes() {
    if (!state.apiKey || !state.watchlist || state.watchlist.length === 0) return;

    const pending = state.watchlist.filter(m => m.id && (m.runtime === undefined || m.runtime === null));
    if (pending.length === 0) return;

    let hasUpdates = false;
    const batchSize = 3;

    for (let i = 0; i < pending.length; i += batchSize) {
        const batch = pending.slice(i, i + batchSize);
        await Promise.all(batch.map(async (movie) => {
            try {
                let runtime = 0;
                if (window.runtimeCache && window.runtimeCache.has(movie.id)) {
                    const cached = window.runtimeCache.get(movie.id);
                    runtime = typeof cached === 'object' ? cached.runtime : cached;
                } else if (window.ApiService) {
                    const details = await window.ApiService.fetchMovieDetails(state.apiKey, movie.id);
                    runtime = details.runtime || 0;
                    if (details.tagline && !movie.tagline) movie.tagline = details.tagline;
                }

                if (typeof runtime === 'number') {
                    // Safe property assignment: preserves all existing fields intact!
                    movie.runtime = runtime;
                    hasUpdates = true;
                    if (typeof updateMovieCardRuntime === 'function') {
                        updateMovieCardRuntime(movie.id, movie.runtime);
                    }
                }
            } catch (err) {
                console.warn(`[Watchlist Migration] Could not retrieve runtime for movie ${movie.id}:`, err);
            }
        }));

        await new Promise(resolve => setTimeout(resolve, 60));
    }

    if (hasUpdates) {
        saveWatchlist();
        if (typeof renderStats === 'function') renderStats();
        if (typeof renderWatchlist === 'function') renderWatchlist();
    }
}

// Global Exposure
window.StorageService = StorageService;
window.getUsersDb = getUsersDb;
window.saveUsersDb = saveUsersDb;
window.loadUserSession = loadUserSession;
window.updateUserHeaderUI = updateUserHeaderUI;
window.loadApiKey = loadApiKey;
window.updateApiBadge = () => {};
window.sanitizeWatchlistUrls = sanitizeWatchlistUrls;
window.saveWatchlist = saveWatchlist;
window.updateNavWatchlistCount = updateNavWatchlistCount;
window.enrichWatchlistRuntimes = enrichWatchlistRuntimes;
