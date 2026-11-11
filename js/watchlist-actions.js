// ==========================================================================
// WATCHLIST CRUD OPERATIONS MODULE
// ==========================================================================

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

    const fallbackPoster = (window.CONFIG && window.CONFIG.FALLBACK_POSTER) ||
        'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80';
    const posterSrc = movie.poster_path || fallbackPoster;

    const preview = document.getElementById('modalMoviePreview');
    preview.innerHTML = `
        <img src="${posterSrc}" style="width: 55px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color);">
        <div>
            <h4 style="color: #fff; font-family: var(--font-heading); font-size: 1rem;">${escapeHtml(movie.title)}</h4>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Released: ${escapeHtml(movie.release_date || 'N/A')} | TMDB: ★ ${movie.vote_average}</div>
        </div>
    `;

    ModalManager.open('watchlistModal');
}

function openEditModal(movieId) {
    openAddModal(movieId);
}

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

function openDeleteModal(movieId) {
    const movie = state.watchlist.find(m => m.id === movieId);
    if (!movie) return;

    state.deletingMovieId = movieId;
    document.getElementById('deleteMovieTitle').textContent = `Are you sure you want to remove "${movie.title}" from your watchlist?`;
    ModalManager.open('deleteModal');
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

// Global Exposure
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.handleWatchlistSubmit = handleWatchlistSubmit;
window.openDeleteModal = openDeleteModal;
window.confirmDeleteMovie = confirmDeleteMovie;
