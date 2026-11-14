// ==========================================================================
// STATISTICS & CINEMATIC MOVIE JOURNAL MODULE
// ==========================================================================

function renderStats() {
    const total = state.watchlist.length;
    const completedMovies = state.watchlist.filter(m => m.status === 'Completed');
    const completed = completedMovies.length;

    const rated = state.watchlist.filter(m => m.personalRating > 0);
    const avg = rated.length > 0
        ? (rated.reduce((sum, m) => sum + m.personalRating, 0) / rated.length).toFixed(1)
        : '0.0';

    // 1. Precise Watch Time Calculations using Actual Movie Runtimes
    // Completed watch time: ONLY counts Completed movies with known runtime
    const completedWithRuntime = completedMovies.filter(m => typeof m.runtime === 'number' && m.runtime > 0);
    const completedRuntimeMinutes = completedWithRuntime.reduce((sum, m) => sum + m.runtime, 0);
    const completedMissing = completed - completedWithRuntime.length;

    // Total collection watch time: sum of all saved movies with known runtime
    const totalWithRuntime = state.watchlist.filter(m => typeof m.runtime === 'number' && m.runtime > 0);
    const totalRuntimeMinutes = totalWithRuntime.reduce((sum, m) => sum + m.runtime, 0);
    const totalMissing = total - totalWithRuntime.length;

    const totalElem = document.getElementById('statTotalMovies');
    const compElem = document.getElementById('statCompletedMovies');
    const avgElem = document.getElementById('statAvgRating');
    const hoursElem = document.getElementById('statHoursEstimated');
    const totalWatchTimeElem = document.getElementById('statTotalWatchTime');
    const partialNoticeElem = document.getElementById('statWatchTimePartialNotice');

    if (totalElem) totalElem.textContent = total;
    if (compElem) compElem.textContent = completed;
    if (avgElem) avgElem.textContent = `${avg} ★`;

    // Display completed watch time in primary stat counter
    const completedTimeFormatted = typeof formatWatchTime === 'function'
        ? formatWatchTime(completedRuntimeMinutes)
        : `${Math.round(completedRuntimeMinutes / 60)} hrs`;

    if (hoursElem) {
        hoursElem.textContent = total === 0 ? '0 hrs' : completedTimeFormatted;
    }

    // Display total library watch time
    if (totalWatchTimeElem) {
        const libraryTimeFormatted = typeof formatWatchTime === 'function'
            ? formatWatchTime(totalRuntimeMinutes)
            : `${Math.round(totalRuntimeMinutes / 60)} hrs`;
        totalWatchTimeElem.textContent = total === 0 ? 'Library: 0 hrs' : `Library: ${libraryTimeFormatted}`;
    }

    // Partial calculation notice if any runtimes are pending
    if (partialNoticeElem) {
        if (total > 0 && totalMissing > 0) {
            partialNoticeElem.style.display = 'inline-block';
            partialNoticeElem.textContent = `* ${totalMissing} ${totalMissing === 1 ? 'title' : 'titles'} pending runtime`;
            partialNoticeElem.setAttribute('title', `${totalWithRuntime.length} of ${total} titles calculated with verified runtime.`);
        } else {
            partialNoticeElem.style.display = 'none';
            partialNoticeElem.textContent = '';
        }
    }

    const plan = state.watchlist.filter(m => m.status === 'Plan to Watch').length;
    const watching = state.watchlist.filter(m => m.status === 'Watching').length;

    const planPct = total ? Math.round((plan / total) * 100) : 0;
    const watchPct = total ? Math.round((watching / total) * 100) : 0;
    const compPct = total ? Math.round((completed / total) * 100) : 0;

    // 2. Status Breakdown (Viewing Pipeline)
    const statusContainer = document.getElementById('statusBreakdownContainer');
    if (statusContainer) {
        if (total === 0) {
            statusContainer.innerHTML = `
                <div class="stats-empty-notice">
                    <i class="fa-solid fa-film"></i>
                    No movies logged in your journal yet.<br>
                    Add titles from Discover to track your viewing progress.
                </div>
            `;
        } else {
            statusContainer.innerHTML = `
                <div class="status-pipeline-track">
                    <div class="pipeline-segment plan" style="width: ${planPct}%;" title="Plan to Watch: ${plan} (${planPct}%)"></div>
                    <div class="pipeline-segment watching" style="width: ${watchPct}%;" title="Watching: ${watching} (${watchPct}%)"></div>
                    <div class="pipeline-segment completed" style="width: ${compPct}%;" title="Completed: ${completed} (${compPct}%)"></div>
                </div>
                <div class="status-legend-grid">
                    <div class="status-legend-item">
                        <span class="status-legend-label">
                            <span class="status-legend-dot plan"></span> Plan to Watch
                        </span>
                        <span class="status-legend-val">${plan}</span>
                        <span class="status-legend-pct">${planPct}% of collection</span>
                    </div>
                    <div class="status-legend-item">
                        <span class="status-legend-label">
                            <span class="status-legend-dot watching"></span> Watching
                        </span>
                        <span class="status-legend-val">${watching}</span>
                        <span class="status-legend-pct">${watchPct}% of collection</span>
                    </div>
                    <div class="status-legend-item">
                        <span class="status-legend-label">
                            <span class="status-legend-dot completed"></span> Completed
                        </span>
                        <span class="status-legend-val">${completed}</span>
                        <span class="status-legend-pct">${compPct}% of collection</span>
                    </div>
                </div>
            `;
        }
    }

    // 3. Taste Profile (Genre Distribution Breakdown)
    const genreContainer = document.getElementById('genreDistributionContainer');
    if (genreContainer) {
        if (total === 0) {
            genreContainer.innerHTML = `
                <div class="stats-empty-notice">
                    <i class="fa-solid fa-shapes"></i>
                    Add movies to your watchlist to unlock your personal genre profile.
                </div>
            `;
        } else {
            const genreCounts = {};
            state.watchlist.forEach(m => {
                if (Array.isArray(m.genres) && m.genres.length > 0) {
                    m.genres.forEach(g => {
                        const trimmed = g.trim();
                        if (trimmed) {
                            genreCounts[trimmed] = (genreCounts[trimmed] || 0) + 1;
                        }
                    });
                }
            });

            const sortedGenres = Object.entries(genreCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            if (sortedGenres.length === 0) {
                genreContainer.innerHTML = `
                    <div class="stats-empty-notice">
                        <i class="fa-solid fa-shapes"></i>
                        No genre metadata available for saved titles.
                    </div>
                `;
            } else {
                const maxCount = sortedGenres[0][1];
                const genreRowsHtml = sortedGenres.map(([genre, count]) => {
                    const fillPercent = Math.max(10, Math.round((count / maxCount) * 100));
                    const collectionPercent = Math.round((count / total) * 100);
                    return `
                        <div class="genre-dist-row">
                            <div class="genre-dist-header">
                                <span class="genre-dist-name">${typeof escapeHtml === 'function' ? escapeHtml(genre) : genre}</span>
                                <span class="genre-dist-count">${count} ${count === 1 ? 'title' : 'titles'} (${collectionPercent}%)</span>
                            </div>
                            <div class="genre-dist-track">
                                <div class="genre-dist-fill" style="width: ${fillPercent}%;"></div>
                            </div>
                        </div>
                    `;
                }).join('');

                genreContainer.innerHTML = `
                    <div class="genre-dist-list">
                        ${genreRowsHtml}
                    </div>
                `;
            }
        }
    }

    // 4. Personal Hall of Fame (Highest-Rated Titles Showcase — top 5)
    const highestRatedContainer = document.getElementById('highestRatedContainer');
    if (highestRatedContainer) {
        const topRated = state.watchlist
            .filter(m => m.personalRating && m.personalRating > 0)
            .sort((a, b) => {
                if (b.personalRating !== a.personalRating) {
                    return b.personalRating - a.personalRating;
                }
                return (b.vote_average || 0) - (a.vote_average || 0);
            })
            .slice(0, 5);

        if (topRated.length === 0) {
            highestRatedContainer.innerHTML = `
                <div class="stats-empty-notice" style="grid-column: 1 / -1;">
                    <i class="fa-solid fa-star" style="color: rgba(251, 191, 36, 0.35);"></i>
                    Rate movies with 1–5 stars in your watchlist to see your highest-rated titles here.
                </div>
            `;
        } else {
            const fallbackPoster = (window.CONFIG && window.CONFIG.FALLBACK_POSTER) ||
                'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80';

            highestRatedContainer.innerHTML = topRated.map((movie, idx) => {
                const posterSrc = movie.poster_path || fallbackPoster;
                const releaseYear = movie.release_date ? String(movie.release_date).split('-')[0] : 'N/A';
                const starsHtml = typeof renderStarIcons === 'function' ? renderStarIcons(movie.personalRating, 5) : '★'.repeat(movie.personalRating);
                const runtimeHtml = typeof formatRuntime === 'function' ? formatRuntime(movie.runtime, '') : '';
                const statusClass = movie.status === 'Plan to Watch' ? 'plan' : (movie.status === 'Watching' ? 'watching' : 'completed');
                const rankLabel = ['', '🥇', '🥈', '🥉', '', ''][idx] || '';

                return `
                    <div class="highest-rated-card" onclick="openMovieDetailsModal(${movie.id})">
                        <div class="highest-rated-rank">${idx + 1}</div>
                        <img src="${posterSrc}" alt="${escapeHtml(movie.title)}" class="highest-rated-thumb" onerror="this.src='${fallbackPoster}'">
                        <div class="highest-rated-info">
                            <h4 class="highest-rated-title" title="${escapeHtml(movie.title)}">${escapeHtml(movie.title)}</h4>
                            <div class="highest-rated-meta">
                                <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(releaseYear)}</span>
                                ${runtimeHtml ? `<span><i class="fa-regular fa-clock"></i> ${escapeHtml(runtimeHtml)}</span>` : ''}
                            </div>
                            <div class="highest-rated-stars" title="${movie.personalRating}/5 stars">${starsHtml}</div>
                            <span class="highest-rated-status ${statusClass}">${escapeHtml(movie.status)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

// Global Exposure
window.renderStats = renderStats;
