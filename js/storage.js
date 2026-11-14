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

async function fetchAndSetUserWatchlist(userId, epoch) {
    // ① Pre-flight staleness guard: return false without touching any state.
    if (state.sessionEpoch !== epoch || state.supabaseUserId !== userId) {
        console.warn('fetchAndSetUserWatchlist: called with a stale epoch/userId; ignoring.');
        return false;
    }

    // ② Treat an unavailable DB service as a genuine loading failure for the active session.
    //    Session currency is already guaranteed by the guard above.
    if (!window.DB || typeof window.DB.fetchUserWatchlist !== 'function') {
        const dbErr = new Error('Database service (window.DB) is not available.');
        state.watchlistLoadingStatus = 'error';
        state.watchlist = [];
        updateNavWatchlistCount();
        console.error('fetchAndSetUserWatchlist:', dbErr.message);
        showToast('Could not load your saved watchlist. Please check your connection.', 'info');
        throw dbErr;
    }

    state.watchlistLoadingStatus = 'loading';
    try {
        const remoteList = await window.DB.fetchUserWatchlist(userId);

        // Guard against stale asynchronous responses if session changed or user logged out
        if (state.sessionEpoch !== epoch || state.supabaseUserId !== userId) {
            console.warn('Ignoring stale fetchUserWatchlist response for previous session epoch.');
            return false;
        }

        state.watchlist = Array.isArray(remoteList) ? remoteList : [];
        state.watchlistLoadingStatus = 'loaded';

        sanitizeWatchlistUrls();

        // Seed runtime cache from loaded watchlist
        state.watchlist.forEach(m => {
            if (typeof m.runtime === 'number' && m.runtime > 0 && window.runtimeCache) {
                window.runtimeCache.set(m.id, m.runtime);
            }
        });

        updateNavWatchlistCount();
        return true;
    } catch (err) {
        // If session is still current, mark error and surface to user
        if (state.sessionEpoch === epoch && state.supabaseUserId === userId) {
            state.watchlistLoadingStatus = 'error';
            state.watchlist = [];
            updateNavWatchlistCount();
            console.error('Failed to load user watchlist from database:', err);
            showToast('Could not load your saved watchlist. Please check your connection.', 'info');
        }
        throw err;
    }
}

async function loadUserSession() {
    // 1. Establish session epoch before any asynchronous call starts
    state.sessionEpoch = (state.sessionEpoch || 0) + 1;
    const restorationEpoch = state.sessionEpoch;

    if (window.supabaseClient) {
        try {
            const { data: { session }, error } = await window.supabaseClient.auth.getSession();

            // Check if epoch changed while waiting for getSession
            if (state.sessionEpoch !== restorationEpoch) {
                console.warn('Session restoration aborted: epoch changed during getSession.');
                return;
            }

            if (!error && session && session.user) {
                // Strictly fetch and validate username from profiles table
                let resolvedUsername = null;
                try {
                    const { data: profile, error: profileErr } = await window.supabaseClient
                        .from('profiles')
                        .select('username')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (!profileErr && profile && profile.username && profile.username.trim() !== '') {
                        resolvedUsername = profile.username.trim();
                    }
                } catch (pErr) {
                    console.error('Could not query profile on session restoration:', pErr);
                }

                // Check if epoch changed while waiting for profile query
                if (state.sessionEpoch !== restorationEpoch) {
                    console.warn('Session restoration aborted: epoch changed during profile query.');
                    return;
                }

                if (resolvedUsername) {
                    state.supabaseUserId = session.user.id;
                    state.currentUser = resolvedUsername;

                    updateUserHeaderUI();

                    // Load user's Supabase watchlist using the established restoration epoch
                    try {
                        await fetchAndSetUserWatchlist(session.user.id, restorationEpoch);
                    } catch (loadErr) {
                        // User remains authenticated; watchlistLoadingStatus is set to 'error'
                    }
                    return;
                } else {
                    // Profile is missing, query failed, or username is empty: sign out incomplete session
                    console.warn('Session found but profile is incomplete/missing. Signing out session.');
                    try {
                        await window.supabaseClient.auth.signOut();
                    } catch (soErr) {
                        console.error('Error signing out incomplete session:', soErr);
                    }
                }
            }
        } catch (err) {
            console.warn('Error fetching Supabase session:', err);
        }
    }

    // Check if epoch changed before applying fallback
    if (state.sessionEpoch !== restorationEpoch) {
        console.warn('Session restoration aborted: epoch changed before fallback.');
        return;
    }

    // Fallback: If not authenticated or profile invalid, keep anonymous state
    state.currentUser = null;
    state.supabaseUserId = null;
    state.watchlistLoadingStatus = 'loaded';
    state.watchlist = StorageService.getLegacyWatchlist();

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
 * Retry loading the user's watchlist from Supabase if previous attempt failed
 */
async function retryWatchlistLoad() {
    if (!state.supabaseUserId) {
        console.warn('retryWatchlistLoad: No authenticated user session.');
        return;
    }

    state.sessionEpoch = (state.sessionEpoch || 0) + 1;
    const currentEpoch = state.sessionEpoch;
    const targetUserId = state.supabaseUserId;

    try {
        const applied = await fetchAndSetUserWatchlist(targetUserId, currentEpoch);
        // Verify result was actually applied to the current user and epoch
        if (applied && state.sessionEpoch === currentEpoch && state.supabaseUserId === targetUserId) {
            if (typeof renderWatchlist === 'function') renderWatchlist();
            if (typeof renderDiscoverGrid === 'function') renderDiscoverGrid();
            if (typeof renderStats === 'function') renderStats();
            showToast('Watchlist loaded successfully!', 'success');
        } else {
            console.warn('retryWatchlistLoad: Result was not applied due to session change.');
        }
    } catch (err) {
        console.error('retryWatchlistLoad failed:', err);
        if (state.sessionEpoch === currentEpoch && state.supabaseUserId === targetUserId) {
            if (typeof renderWatchlist === 'function') renderWatchlist();
        }
    }
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
window.fetchAndSetUserWatchlist = fetchAndSetUserWatchlist;
window.loadUserSession = loadUserSession;
window.updateUserHeaderUI = updateUserHeaderUI;
window.loadApiKey = loadApiKey;
window.updateApiBadge = () => { };
window.sanitizeWatchlistUrls = sanitizeWatchlistUrls;
window.saveWatchlist = saveWatchlist;
window.updateNavWatchlistCount = updateNavWatchlistCount;
window.retryWatchlistLoad = retryWatchlistLoad;
window.enrichWatchlistRuntimes = enrichWatchlistRuntimes;
