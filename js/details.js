// ==========================================================================
// MOVIE DETAILS MODAL MODULE
// ==========================================================================

const TMDB_LANG_MAP = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    hi: 'Hindi',
    pt: 'Portuguese',
    ru: 'Russian',
    sv: 'Swedish',
    da: 'Danish',
    no: 'Norwegian',
    nl: 'Dutch',
    pl: 'Polish'
};

function formatLanguage(code) {
    if (!code) return '';
    const lower = String(code).toLowerCase();
    return TMDB_LANG_MAP[lower] || lower.toUpperCase();
}

function renderModalExtraMeta(movie) {
    const extraMeta = document.getElementById('detailExtraMeta');
    if (!extraMeta) return;

    const dateStr = movie.release_date && movie.release_date !== 'N/A' ? movie.release_date : '';
    const langStr = movie.original_language ? formatLanguage(movie.original_language) : '';
    const voteCount = movie.vote_count ? `${Number(movie.vote_count).toLocaleString()} votes` : '';

    const items = [];
    if (dateStr) items.push(`<span><i class="fa-regular fa-calendar"></i> Release: <strong>${escapeHtml(dateStr)}</strong></span>`);
    if (langStr) items.push(`<span><i class="fa-solid fa-globe"></i> Language: <strong>${escapeHtml(langStr)}</strong></span>`);
    if (voteCount) items.push(`<span><i class="fa-solid fa-users"></i> <strong>${escapeHtml(voteCount)}</strong></span>`);

    if (items.length > 0) {
        extraMeta.innerHTML = items.join('<span class="meta-separator">•</span>');
        extraMeta.style.display = 'flex';
    } else {
        extraMeta.style.display = 'none';
        extraMeta.innerHTML = '';
    }

    const langBadge = document.getElementById('detailLanguage');
    if (langBadge) {
        if (langStr) {
            langBadge.textContent = movie.original_language ? movie.original_language.toUpperCase() : '';
            langBadge.title = langStr;
            langBadge.style.display = 'inline-block';
        } else {
            langBadge.style.display = 'none';
        }
    }
}

async function openMovieDetailsModal(movieId) {
    let movie = state.discoverMovies.find(m => m.id === movieId) ||
        state.watchlist.find(m => m.id === movieId);

    if (!movie) return;

    const watchlistEntry = state.watchlist.find(m => m.id === movieId);

    document.getElementById('detailTitle').textContent = movie.title;
    document.getElementById('detailMatch').textContent = `★ ${movie.vote_average} TMDB`;
    document.getElementById('detailYear').textContent = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

    // Render extra metadata (language, full release date, vote count)
    renderModalExtraMeta(movie);

    // Runtime badge
    const runtimeElem = document.getElementById('detailRuntime');
    if (runtimeElem) {
        const initialRuntime = typeof formatRuntime === 'function'
            ? formatRuntime(movie.runtime, movie.runtime === undefined ? 'Duration...' : 'Runtime unavailable')
            : (movie.runtime ? `${movie.runtime}m` : 'Runtime unavailable');
        runtimeElem.innerHTML = `<i class="fa-regular fa-clock"></i> ${initialRuntime}`;
    }

    // Tagline
    const taglineElem = document.getElementById('detailTagline');
    if (taglineElem) {
        taglineElem.textContent = movie.tagline ? `"${movie.tagline}"` : '';
        taglineElem.style.display = movie.tagline ? 'block' : 'none';
    }

    const fallbackPoster = (window.CONFIG && window.CONFIG.FALLBACK_POSTER) ||
        'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80';
    const posterElem = document.getElementById('detailPoster');
    posterElem.src = movie.poster_path || fallbackPoster;

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
    genresContainer.innerHTML = genresList.map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('');

    const statusBox = document.getElementById('detailWatchlistStatusBox');
    if (watchlistEntry) {
        const starsHtml = renderStarIcons(watchlistEntry.personalRating || 0, 5);
        const statusClass = watchlistEntry.status === 'Plan to Watch' ? 'plan' : (watchlistEntry.status === 'Watching' ? 'watching' : 'completed');
        statusBox.style.display = 'block';
        statusBox.innerHTML = `
            <div class="detail-status-inner">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="status-badge ${statusClass}">${escapeHtml(watchlistEntry.status)}</span>
                    <span style="color: var(--star-gold); font-size: 1.05rem;">${starsHtml}</span>
                </div>
                ${watchlistEntry.notes ? `<p style="font-size: 0.88rem; color: #94a3b8; font-style: italic; margin-top: 10px; border-left: 2px solid rgba(0, 240, 255, 0.4); padding-left: 10px;">"${escapeHtml(watchlistEntry.notes)}"</p>` : ''}
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

    ModalManager.open('movieDetailsModal');

    // On-demand fetch of detailed movie metadata (runtime, tagline, language, etc.) if needed
    if (state.apiKey && (movie.runtime === undefined || movie.runtime === null || !movie.original_language)) {
        try {
            const details = await ApiService.fetchMovieDetails(state.apiKey, movie.id);
            movie.runtime = details.runtime;
            if (details.tagline) movie.tagline = details.tagline;
            if (details.original_language && !movie.original_language) movie.original_language = details.original_language;
            if (details.vote_count && !movie.vote_count) movie.vote_count = details.vote_count;
            if (details.release_date && (!movie.release_date || movie.release_date === 'N/A')) movie.release_date = details.release_date;

            renderModalExtraMeta(movie);

            if (runtimeElem) {
                const updatedRuntime = formatRuntime(movie.runtime, 'Runtime unavailable');
                runtimeElem.innerHTML = `<i class="fa-regular fa-clock"></i> ${updatedRuntime}`;
            }

            if (taglineElem && movie.tagline) {
                taglineElem.textContent = `"${movie.tagline}"`;
                taglineElem.style.display = 'block';
            }

            if (typeof updateMovieCardRuntime === 'function') {
                updateMovieCardRuntime(movie.id, movie.runtime);
            }

            // If movie is saved in watchlist, store runtime to avoid re-fetching
            if (watchlistEntry) {
                watchlistEntry.runtime = movie.runtime;
                if (movie.tagline && !watchlistEntry.tagline) watchlistEntry.tagline = movie.tagline;
                if (movie.original_language && !watchlistEntry.original_language) watchlistEntry.original_language = movie.original_language;
                saveWatchlist();
                renderStats();
            }
        } catch (err) {
            console.warn('Could not fetch additional movie details for ID:', movie.id, err);
            if (runtimeElem) {
                runtimeElem.innerHTML = `<i class="fa-regular fa-clock"></i> Runtime unavailable`;
            }
        }
    }
}

// Global Exposure
window.openMovieDetailsModal = openMovieDetailsModal;
