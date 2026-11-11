// ==========================================================================
// MOVIE DETAILS MODAL MODULE
// ==========================================================================

function openMovieDetailsModal(movieId) {
    let movie = state.discoverMovies.find(m => m.id === movieId) ||
        state.watchlist.find(m => m.id === movieId);

    if (!movie) return;

    const watchlistEntry = state.watchlist.find(m => m.id === movieId);

    document.getElementById('detailTitle').textContent = movie.title;
    document.getElementById('detailMatch').textContent = `★ ${movie.vote_average} TMDB`;
    document.getElementById('detailYear').textContent = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

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
            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(0, 240, 255, 0.2); padding: 14px 18px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="status-badge ${statusClass}">${escapeHtml(watchlistEntry.status)}</span>
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

    ModalManager.open('movieDetailsModal');
}

// Global Exposure
window.openMovieDetailsModal = openMovieDetailsModal;
