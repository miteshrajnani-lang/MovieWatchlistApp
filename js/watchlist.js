// ==========================================================================
// WATCHLIST GRID & RENDERING MODULE
// ==========================================================================

function renderWatchlist() {
    const grid = document.getElementById('watchlistGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let list = [...state.watchlist];

    if (state.filterStatus !== 'ALL') {
        list = list.filter(m => m.status === state.filterStatus);
    }

    if (state.localSearchQuery) {
        const q = state.localSearchQuery.toLowerCase();
        list = list.filter(m =>
            (m.title && m.title.toLowerCase().includes(q)) ||
            (m.notes && m.notes.toLowerCase().includes(q)) ||
            (m.genres && m.genres.some(g => g.toLowerCase().includes(q)))
        );
    }

    if (state.sortBy === 'dateAdded') {
        list.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
    } else if (state.sortBy === 'personalRating') {
        list.sort((a, b) => (b.personalRating || 0) - (a.personalRating || 0));
    } else if (state.sortBy === 'tmdbRating') {
        list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (state.sortBy === 'title') {
        list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
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
        const card = createWatchlistMovieCard(movie);
        grid.appendChild(card);
    });
}

// Global Exposure
window.renderWatchlist = renderWatchlist;
