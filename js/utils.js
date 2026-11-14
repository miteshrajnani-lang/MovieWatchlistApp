// Utilities & Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    const color = type === 'success' ? 'var(--status-completed)' : 'var(--primary-cyan)';

    toast.style.borderLeftColor = color;
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${color}; font-size: 1.1rem;"></i> <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
    }
}

/**
 * Format runtime in minutes to human-readable duration (e.g. 148 -> "2h 28m", 90 -> "1h 30m", 45 -> "45m")
 * Gracefully handles 0, null, or undefined with fallback.
 */
function formatRuntime(minutes, fallback = 'Runtime unavailable') {
    const mins = parseInt(minutes, 10);
    if (!mins || isNaN(mins) || mins <= 0) {
        return fallback;
    }
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0 && m === 0) return `${h}h`;
    return `${m}m`;
}

/**
 * Format cumulative total watch time across a collection (e.g. 1450 minutes -> "24h 10m")
 */
function formatWatchTime(totalMinutes) {
    const mins = parseInt(totalMinutes, 10);
    if (!mins || isNaN(mins) || mins <= 0) return '0 hrs';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h} hrs`;
    return `${m}m`;
}

// Global Exposure
window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.togglePasswordVisibility = togglePasswordVisibility;
window.formatRuntime = formatRuntime;
window.formatWatchTime = formatWatchTime;
