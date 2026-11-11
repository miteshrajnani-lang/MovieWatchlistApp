// ==========================================================================
// DISCOVER GRID & MULTI-FILTER ENGINE
// ==========================================================================

function renderDiscoverGrid() {
    const grid = document.getElementById('discoverGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let moviesToDisplay = [...state.discoverMovies];

    if (state.activeGenre !== 'ALL') {
        moviesToDisplay = moviesToDisplay.filter(m => m.genres && m.genres.includes(state.activeGenre));
    }

    if (state.minRating > 0) {
        moviesToDisplay = moviesToDisplay.filter(m => m.vote_average >= state.minRating);
    }

    if (state.releaseDecade !== 'ALL') {
        moviesToDisplay = moviesToDisplay.filter(m => {
            const year = parseInt((m.release_date || '').split('-')[0]);
            if (!year) return false;
            if (state.releaseDecade === '2020s') return year >= 2020;
            if (state.releaseDecade === '2010s') return year >= 2010 && year < 2020;
            if (state.releaseDecade === '2000s') return year >= 2000 && year < 2010;
            if (state.releaseDecade === '1990s') return year >= 1990 && year < 2000;
            if (state.releaseDecade === 'Older') return year < 1990;
            return true;
        });
    }

    if (state.discoverSort === 'rating') {
        moviesToDisplay.sort((a, b) => b.vote_average - a.vote_average);
    } else if (state.discoverSort === 'newest') {
        moviesToDisplay.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
    } else if (state.discoverSort === 'oldest') {
        moviesToDisplay.sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
    } else if (state.discoverSort === 'title') {
        moviesToDisplay.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    const countBadge = document.getElementById('discoverResultsCount');
    if (countBadge) {
        countBadge.textContent = `${moviesToDisplay.length} titles`;
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
        const card = createDiscoverMovieCard(movie, isInWatchlist);
        grid.appendChild(card);
    });
}

function setGenreFilter(genre) {
    state.activeGenre = genre;
    renderAdvancedFilters();
    renderDiscoverGrid();
}

function setMinRating(rating) {
    state.minRating = rating;
    renderAdvancedFilters();
    renderDiscoverGrid();
}

function setReleaseDecade(decade) {
    state.releaseDecade = decade;
    renderAdvancedFilters();
    renderDiscoverGrid();
}

function setDiscoverSort(sort) {
    state.discoverSort = sort;
    renderAdvancedFilters();
    renderDiscoverGrid();
}

function resetDiscoverFilters() {
    state.activeGenre = 'ALL';
    state.minRating = 0;
    state.releaseDecade = 'ALL';
    state.discoverSort = 'default';
    renderAdvancedFilters();
    renderDiscoverGrid();
}

function renderAdvancedFilters() {
    const sidebar = document.getElementById('filterSidebar');
    if (!sidebar) return;

    const filterOptions = window.FILTER_OPTIONS || {
        GENRES: ['ALL', 'Sci-Fi', 'Action', 'Animation', 'Drama', 'Adventure', 'Thriller', 'Comedy', 'Horror', 'Romance'],
        RATINGS: [
            { val: 0, label: 'Any' },
            { val: 6, label: '6+' },
            { val: 7, label: '7+' },
            { val: 7.5, label: '7.5+' },
            { val: 8, label: '8+' },
            { val: 9, label: '9+' }
        ],
        DECADES: ['ALL', '2020s', '2010s', '2000s', '1990s', 'Older'],
        SORTS: [
            { value: 'default', label: '<i class="fa-solid fa-fire-flame-curved"></i> Popular' },
            { value: 'rating', label: '<i class="fa-solid fa-star"></i> Top Rated' },
            { value: 'newest', label: '<i class="fa-solid fa-calendar-days"></i> Newest' },
            { value: 'oldest', label: '<i class="fa-regular fa-calendar"></i> Oldest' },
            { value: 'title', label: '<i class="fa-solid fa-arrow-down-a-z"></i> A – Z' }
        ]
    };

    const hasActiveFilter = state.activeGenre !== 'ALL' || state.minRating > 0 || state.releaseDecade !== 'ALL' || state.discoverSort !== 'default';

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <div class="sidebar-title"><i class="fa-solid fa-sliders"></i> Filters</div>
            ${hasActiveFilter ? `<button class="sidebar-reset-btn" onclick="resetDiscoverFilters()"><i class="fa-solid fa-rotate-left"></i> Reset</button>` : ''}
        </div>

        <div class="sidebar-section">
            <div class="sidebar-section-title"><i class="fa-solid fa-film" style="color:var(--primary-cyan);"></i> Genre</div>
            <div class="sidebar-tag-grid">
                ${filterOptions.GENRES.map(g => `
                    <button class="filter-badge ${state.activeGenre === g ? 'active' : ''}" onclick="setGenreFilter('${g}')">${g === 'ALL' ? 'All Genres' : g}</button>
                `).join('')}
            </div>
        </div>

        <div class="sidebar-section">
            <div class="sidebar-section-title"><i class="fa-solid fa-star" style="color:var(--star-gold);"></i> Min TMDB Rating</div>
            <div class="sidebar-tag-grid">
                ${filterOptions.RATINGS.map(r => `
                    <button class="filter-badge ${state.minRating === r.val ? 'active' : ''}" onclick="setMinRating(${r.val})">${r.label}</button>
                `).join('')}
            </div>
        </div>

        <div class="sidebar-section">
            <div class="sidebar-section-title"><i class="fa-regular fa-calendar" style="color:var(--secondary-purple);"></i> Release Era</div>
            <div class="sidebar-tag-grid">
                ${filterOptions.DECADES.map(d => `
                    <button class="filter-badge ${state.releaseDecade === d ? 'active' : ''}" onclick="setReleaseDecade('${d}')">${d === 'ALL' ? 'Any Year' : d}</button>
                `).join('')}
            </div>
        </div>

        <div class="sidebar-section">
            <div class="sidebar-section-title"><i class="fa-solid fa-arrow-up-wide-short" style="color:var(--primary-cyan);"></i> Sort Order</div>
            <div class="sidebar-tag-list">
                ${filterOptions.SORTS.map(s => `
                    <button class="filter-badge sidebar-sort-btn ${state.discoverSort === s.value ? 'active' : ''}" onclick="setDiscoverSort('${s.value}')">${s.label}</button>
                `).join('')}
            </div>
        </div>
    `;
}

// Global Exposure
window.renderDiscoverGrid = renderDiscoverGrid;
window.setGenreFilter = setGenreFilter;
window.setMinRating = setMinRating;
window.setReleaseDecade = setReleaseDecade;
window.setDiscoverSort = setDiscoverSort;
window.resetDiscoverFilters = resetDiscoverFilters;
window.renderAdvancedFilters = renderAdvancedFilters;
