// ==========================================================================
// MOVIE CARD COMPONENT MODULE
// ==========================================================================

function renderGenreTags(genres) {
    if (!genres || !genres.length) return '';
    return genres.map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('');
}

function renderStarIcons(rating = 0, maxStars = 5) {
    const clamped = Math.max(0, Math.min(maxStars, rating || 0));
    return '★'.repeat(clamped) + '☆'.repeat(maxStars - clamped);
}

function getMovieReleaseYear(releaseDate) {
    if (!releaseDate) return 'N/A';
    return String(releaseDate).split('-')[0] || 'N/A';
}

/**
 * Updates runtime badge on any rendered movie card in real-time
 */
function updateMovieCardRuntime(movieId, runtime) {
    if (!movieId) return;
    const formatted = typeof formatRuntime === 'function'
        ? formatRuntime(runtime, '--')
        : (runtime ? `${runtime}m` : '--');

    const badgeElements = document.querySelectorAll(`[data-runtime-for="${movieId}"]`);
    badgeElements.forEach(el => {
        el.textContent = formatted;
        if (runtime && runtime > 0) {
            el.setAttribute('title', `Duration: ${formatted}`);
        }
    });
}

function createDiscoverMovieCard(movie, isInWatchlist) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const fallbackPoster = (window.CONFIG && window.CONFIG.FALLBACK_POSTER) ||
        'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80';
    const posterSrc = movie.poster_path || fallbackPoster;
    // Show only the first 2 genres to keep cards tidy
    const topGenres = (movie.genres || []).slice(0, 2);
    const genresHtml = topGenres.map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('');
    const releaseYear = getMovieReleaseYear(movie.release_date);
    const runtimeFormatted = typeof formatRuntime === 'function' ? formatRuntime(movie.runtime, null) : null;

    card.innerHTML = `
        <div class="poster-container clickable-card-area" onclick="openMovieDetailsModal(${movie.id})">
            <div class="tmdb-rating">★ ${movie.vote_average}</div>
            <img src="${posterSrc}" alt="${escapeHtml(movie.title)}" class="movie-poster" onerror="this.src='${fallbackPoster}'">
            <div class="poster-overlay">
                <div class="poster-overlay-info">
                    <div class="poster-overlay-genres">${genresHtml}</div>
                    <div class="poster-overlay-actions">
                        <button class="cyber-btn cyber-btn-secondary" style="flex:1; font-size: 0.78rem;" onclick="event.stopPropagation(); openMovieDetailsModal(${movie.id})">
                            <i class="fa-solid fa-circle-info"></i> Info
                        </button>
                        <button class="cyber-btn ${isInWatchlist ? 'cyber-btn-secondary' : 'cyber-btn-primary'}"
                            style="flex:1; font-size: 0.78rem;"
                            onclick="event.stopPropagation(); openAddModal(${movie.id})">
                            <i class="fa-solid ${isInWatchlist ? 'fa-check' : 'fa-plus'}"></i>
                            ${isInWatchlist ? 'Added' : 'Add'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="movie-info">
            <h3 class="movie-title clickable-card-area" onclick="openMovieDetailsModal(${movie.id})">${escapeHtml(movie.title)}</h3>
            <div class="movie-meta">
                <span title="Release year"><i class="fa-regular fa-calendar"></i> ${escapeHtml(releaseYear)}</span>
                ${runtimeFormatted ? `<span class="meta-runtime" data-runtime-for="${movie.id}" title="Duration">${runtimeFormatted}</span>` : `<span class="meta-runtime meta-runtime-pending" data-runtime-for="${movie.id}">--</span>`}
                <span title="TMDB Score"><i class="fa-solid fa-star" style="color: var(--star-gold);"></i> ${movie.vote_average}</span>
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

    return card;
}

function createWatchlistMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const fallbackPoster = (window.CONFIG && window.CONFIG.FALLBACK_POSTER) ||
        'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80';
    const statusClass = movie.status === 'Plan to Watch' ? 'plan' : (movie.status === 'Watching' ? 'watching' : 'completed');
    const starsHtml = renderStarIcons(movie.personalRating || 0, 5);
    const topGenres = (movie.genres || []).slice(0, 2);
    const genresHtml = topGenres.map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('');
    const releaseYear = getMovieReleaseYear(movie.release_date);
    const runtimeFormatted = typeof formatRuntime === 'function' ? formatRuntime(movie.runtime, null) : null;

    card.innerHTML = `
        <div class="poster-container clickable-card-area" onclick="openMovieDetailsModal(${movie.id})">
            <span class="status-badge ${statusClass}">${escapeHtml(movie.status)}</span>
            <div class="tmdb-rating">★ ${movie.vote_average}</div>
            <img src="${movie.poster_path || fallbackPoster}" alt="${escapeHtml(movie.title)}" class="movie-poster" onerror="this.src='${fallbackPoster}'">
            <div class="poster-overlay">
                <div class="poster-overlay-info">
                    <div class="poster-overlay-genres">${genresHtml}</div>
                    <div class="poster-overlay-actions">
                        <button class="cyber-btn cyber-btn-primary" style="width: 100%; font-size: 0.82rem;" onclick="event.stopPropagation(); openMovieDetailsModal(${movie.id})">
                            <i class="fa-solid fa-circle-info"></i> View Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="movie-info">
            <h3 class="movie-title clickable-card-area" onclick="openMovieDetailsModal(${movie.id})">${escapeHtml(movie.title)}</h3>
            <div class="movie-meta">
                <span title="Release year"><i class="fa-regular fa-calendar"></i> ${escapeHtml(releaseYear)}</span>
                ${runtimeFormatted ? `<span class="meta-runtime" data-runtime-for="${movie.id}" title="Duration">${runtimeFormatted}</span>` : `<span class="meta-runtime meta-runtime-pending" data-runtime-for="${movie.id}">--</span>`}
                <span title="TMDB Score"><i class="fa-solid fa-star" style="color: var(--star-gold);"></i> ${movie.vote_average}</span>
            </div>
            <div class="genre-tags">${genresHtml}</div>

            <div class="personal-review-box clickable-card-area" onclick="openMovieDetailsModal(${movie.id})">
                <div class="personal-stars">${starsHtml}</div>
                ${movie.notes ? `<p class="personal-notes">"${escapeHtml(movie.notes)}"</p>` : ''}
            </div>

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

    return card;
}

// Global Exposure
window.renderGenreTags = renderGenreTags;
window.renderStarIcons = renderStarIcons;
window.updateMovieCardRuntime = updateMovieCardRuntime;
window.createDiscoverMovieCard = createDiscoverMovieCard;
window.createWatchlistMovieCard = createWatchlistMovieCard;
