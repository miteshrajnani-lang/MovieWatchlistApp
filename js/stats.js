// Statistics & Analytics
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

// Global Exposure
window.renderStats = renderStats;
