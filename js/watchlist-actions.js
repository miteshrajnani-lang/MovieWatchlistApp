// ==========================================================================
// WATCHLIST CRUD OPERATIONS MODULE
// ==========================================================================

function openAddModal(movieId) {
    if (!state.currentUser) {
        showToast('Please sign in or create an account to save movies to your watchlist!', 'info');
        openAuthModal('login');
        return;
    }

    // Safeguard 4: reject an incomplete authenticated state before routing anywhere.
    // currentUser is set but supabaseUserId is missing — this is an inconsistent state.
    if (state.currentUser && !state.supabaseUserId) {
        showToast('Your session is incomplete. Please sign out and sign in again.', 'info');
        return;
    }

    // Guard: do not open the modal while the authenticated watchlist is not fully loaded.
    // An unloaded watchlist means existingInWatchlist checks below are unreliable.
    if (state.watchlistLoadingStatus !== 'loaded') {
        const msg = state.watchlistLoadingStatus === 'loading'
            ? 'Your watchlist is still loading. Please wait a moment and try again.'
            : 'Your watchlist could not be loaded. Please retry loading before making changes.';
        showToast(msg, 'info');
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

    const form = document.getElementById('watchlistForm');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
        // Invalidate any lingering operation token so an in-flight background request
        // cannot alter the button state of this newly opened modal.
        submitBtn._operationToken = null;
        submitBtn.disabled = false;
        submitBtn.innerHTML = existingInWatchlist ? 'Update Watchlist' : 'Save to Watchlist';
    }

    ModalManager.open('watchlistModal');
}

function openEditModal(movieId) {
    openAddModal(movieId);
}

async function handleWatchlistSubmit(e) {
    e.preventDefault();

    // Re-check loading status at submit time: it may have changed since the modal opened.
    if (state.currentUser && state.watchlistLoadingStatus !== 'loaded') {
        showToast('Cannot save changes while your watchlist is loading or unavailable.', 'info');
        return;
    }

    // Safeguard 4 (re-check at submit): currentUser present but no supabaseUserId is invalid.
    if (state.currentUser && !state.supabaseUserId) {
        showToast('Your session is incomplete. Please sign out and sign in again.', 'info');
        return;
    }

    const movieId = parseInt(document.getElementById('modalMovieId').value);
    const movieDataRaw = document.getElementById('modalMovieData').value;
    const status = document.getElementById('modalStatusSelect').value;
    const personalRating = parseInt(document.getElementById('modalRatingInput').value) || 0;
    const notes = document.getElementById('modalNotesInput').value.trim();

    let movieBase = JSON.parse(movieDataRaw);
    const existingIndex = state.watchlist.findIndex(m => m.id === movieId);

    // ─── AUTHENTICATED PATH ────────────────────────────────────────────────
    if (state.supabaseUserId) {

        // Safeguard 3: capture the button's exact original state before disabling it.
        // An operation token (unique Symbol) is stamped onto the button element so that
        // only THIS request's finally block can restore it. If a newer submission fires
        // while this one is awaiting, the newer submission stamps its own token and the
        // older finally block detects the mismatch and skips the restore.
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalDisabled = submitBtn ? submitBtn.disabled : false;
        const originalLabel = submitBtn ? submitBtn.innerHTML : '';
        const operationToken = Symbol('watchlist-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            submitBtn._operationToken = operationToken;
        }

        // Capture session identifiers before the first await.
        const capturedEpoch = state.sessionEpoch;
        const capturedUserId = state.supabaseUserId;

        try {
            if (existingIndex >= 0) {
                // ── EDIT: partial update of user-editable fields only ──────
                const updates = { status, personalRating, notes };

                const savedItem = await window.DB.updateWatchlistItem(capturedUserId, movieId, updates);

                // Session guard before touching any state.
                if (state.sessionEpoch !== capturedEpoch || state.supabaseUserId !== capturedUserId) {
                    console.warn('handleWatchlistSubmit (edit): session changed during DB call; discarding result.');
                    return;
                }

                // Safeguard 5: re-locate the entry by TMDB ID after the await —
                // the index captured before the await may now point to the wrong slot
                // or be out of range if the array was modified by a concurrent operation.
                const currentIndex = state.watchlist.findIndex(m => m.id === movieId);

                if (currentIndex >= 0) {
                    // Normal path: merge DB-confirmed values, preserving untouched fields
                    // (runtime, genres, dateAdded, poster, etc.) from the existing entry.
                    state.watchlist[currentIndex] = {
                        ...state.watchlist[currentIndex],
                        ...savedItem
                    };
                    updateNavWatchlistCount();
                    showToast(`Updated "${movieBase.title}" in Watchlist!`, 'success');
                    renderWatchlist();
                    renderDiscoverGrid();
                    closeWatchlistModal();
                } else {
                    // The entry disappeared from local state while the DB edit was in
                    // flight (e.g. a concurrent delete or a mid-request watchlist reload).
                    // The edit IS committed in the DB. Refresh local state from Supabase
                    // using the same session context — do not bump the epoch here.
                    console.warn('handleWatchlistSubmit (edit): local entry missing after DB update; refreshing watchlist from Supabase.');
                    try {
                        const applied = await window.fetchAndSetUserWatchlist(capturedUserId, capturedEpoch);

                        // Verify session is unchanged after the refresh await.
                        if (applied && state.sessionEpoch === capturedEpoch && state.supabaseUserId === capturedUserId) {
                            showToast(`Updated "${movieBase.title}" in Watchlist!`, 'success');
                            renderWatchlist();
                            renderDiscoverGrid();
                            closeWatchlistModal();
                        }
                        // If not applied (epoch/user mismatch after refresh), do nothing —
                        // a newer session is in control.
                    } catch (refreshErr) {
                        console.error('handleWatchlistSubmit: watchlist refresh failed after local inconsistency:', refreshErr);
                        if (state.sessionEpoch === capturedEpoch && state.supabaseUserId === capturedUserId) {
                            // The DB edit succeeded but local state could not be re-synced.
                            // Communicate clearly: data is safe, but a manual retry is needed.
                            showToast(
                                `"${movieBase.title}" was saved to the database, but your watchlist could not be refreshed. Please retry loading.`,
                                'info'
                            );
                            renderWatchlist(); // Renders the error/retry card if status is 'error'.
                        }
                    }
                }

            } else {
                // ── ADD: insert-only to protect existing DB data ───────────
                // insertWatchlistItem uses INSERT semantics. On a (user_id, tmdb_id)
                // conflict it returns the EXISTING row (wasExisting: true) without
                // applying any of the submitted form values to the database.
                let runtimeVal = movieBase.runtime;
                if (runtimeVal === undefined && window.runtimeCache && window.runtimeCache.has(movieId)) {
                    const cached = window.runtimeCache.get(movieId);
                    runtimeVal = typeof cached === 'object' ? cached.runtime : cached;
                }

                const newItem = {
                    ...movieBase,
                    runtime: runtimeVal,
                    status,
                    personalRating,
                    notes,
                    dateAdded: new Date().toISOString()
                };

                const { saved, wasExisting } = await window.DB.insertWatchlistItem(capturedUserId, newItem);

                // Session guard after await.
                if (state.sessionEpoch !== capturedEpoch || state.supabaseUserId !== capturedUserId) {
                    console.warn('handleWatchlistSubmit (add): session changed during DB call; discarding result.');
                    return;
                }

                // Sync local state with the DB-confirmed record.
                // `saved` is the authoritative row: either the newly inserted row or the
                // pre-existing row. On a duplicate, `saved` carries the user's real notes,
                // personal rating, status, and metadata — form values are never applied.
                const alreadyInList = state.watchlist.findIndex(m => m.id === movieId);
                if (alreadyInList >= 0) {
                    // Movie exists locally: sync with DB-authoritative values.
                    state.watchlist[alreadyInList] = {
                        ...state.watchlist[alreadyInList],
                        ...saved
                    };
                } else {
                    // Genuinely new entry (or was absent locally): prepend DB record.
                    state.watchlist.unshift(saved);
                }

                updateNavWatchlistCount();

                // Background runtime fetch is intentionally omitted for authenticated users.
                // Runtime persistence for Supabase users is handled in Stage 2D.

                const toastMsg = wasExisting
                    ? `"${movieBase.title}" is already in your watchlist. Your saved entry has been loaded.`
                    : `Added "${movieBase.title}" to Watchlist!`;
                showToast(toastMsg, wasExisting ? 'info' : 'success');
                renderWatchlist();
                renderDiscoverGrid();
                closeWatchlistModal();
            }

        } catch (dbErr) {
            // Surface the error only if the session that initiated this operation is still
            // active. A stale session's error must not appear in the new session's UI.
            if (state.sessionEpoch === capturedEpoch && state.supabaseUserId === capturedUserId) {
                console.error('Watchlist DB operation failed:', dbErr);
                // State is NOT mutated. Modal remains open. Form values are intact for retry.
                showToast('Could not save your changes. Please check your connection and try again.', 'info');
            } else {
                console.warn('handleWatchlistSubmit: DB error for a stale session; suppressed.');
            }

        } finally {
            // Safeguard 3: restore the button only if this operation still owns it.
            // The token check ensures a concurrent newer submission's button state is
            // never overwritten by this request's finally block.
            if (submitBtn && submitBtn._operationToken === operationToken) {
                submitBtn.disabled = originalDisabled;
                submitBtn.innerHTML = originalLabel;
                delete submitBtn._operationToken;
            }
        }

        return; // Do not fall through to the anonymous path.
    }

    // ─── ANONYMOUS PATH (unchanged) ───────────────────────────────────────
    if (existingIndex >= 0) {
        state.watchlist[existingIndex] = {
            ...state.watchlist[existingIndex],
            status,
            personalRating,
            notes
        };
        showToast(`Updated "${movieBase.title}" in Watchlist!`, 'success');
    } else {
        // Ensure runtime is attached if cached or available
        let runtimeVal = movieBase.runtime;
        if (runtimeVal === undefined && window.runtimeCache && window.runtimeCache.has(movieId)) {
            const cached = window.runtimeCache.get(movieId);
            runtimeVal = typeof cached === 'object' ? cached.runtime : cached;
        }

        const newItem = {
            ...movieBase,
            runtime: runtimeVal,
            status,
            personalRating,
            notes,
            dateAdded: new Date().toISOString()
        };
        state.watchlist.unshift(newItem);
        showToast(`Added "${movieBase.title}" to Watchlist!`, 'success');

        // If runtime is still missing, fetch in background and persist to localStorage
        if (newItem.runtime === undefined && state.apiKey && window.ApiService) {
            window.ApiService.getRuntime(state.apiKey, movieId).then(rt => {
                if (rt) {
                    newItem.runtime = rt;
                    saveWatchlist();
                    if (typeof updateMovieCardRuntime === 'function') {
                        updateMovieCardRuntime(movieId, rt);
                    }
                }
            }).catch(() => {});
        }
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

async function confirmDeleteMovie() {
    if (!state.deletingMovieId) return;

    if (state.currentUser && !state.supabaseUserId) {
        showToast('Your session is incomplete. Please sign out and sign in again.', 'info');
        return;
    }

    // ─── AUTHENTICATED PATH ────────────────────────────────────────────────
    if (state.supabaseUserId) {
        if (state.watchlistLoadingStatus !== 'loaded') {
            showToast('Cannot delete while your watchlist is loading or unavailable.', 'info');
            return;
        }

        const movieId = state.deletingMovieId;
        const userId = state.supabaseUserId;
        const epoch = state.sessionEpoch;

        const deleteBtn = document.getElementById('confirmDeleteBtn');
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
        }

        try {
            await window.DB.deleteWatchlistItem(userId, movieId);

            // Session guard: verify epoch and user have not changed during request
            if (state.sessionEpoch !== epoch || state.supabaseUserId !== userId) {
                console.warn('confirmDeleteMovie: session changed during deletion; ignoring result.');
                return;
            }

            const movie = state.watchlist.find(m => m.id === movieId);
            state.watchlist = state.watchlist.filter(m => m.id !== movieId);

            updateNavWatchlistCount();
            renderWatchlist();
            renderDiscoverGrid();
            renderStats();
            closeDeleteModal();
            state.deletingMovieId = null;

            if (movie) {
                showToast(`Removed "${movie.title}" from Watchlist.`, 'info');
            }
        } catch (err) {
            console.error('Failed to delete watchlist item:', err);
            if (state.sessionEpoch === epoch && state.supabaseUserId === userId) {
                showToast('Could not remove this movie. Please try again.', 'info');
            }
        } finally {
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = 'Delete Movie';
            }
        }

        return;
    }

    // ─── ANONYMOUS PATH (unchanged) ───────────────────────────────────────
    const movie = state.watchlist.find(m => m.id === state.deletingMovieId);
    state.watchlist = state.watchlist.filter(m => m.id !== state.deletingMovieId);

    saveWatchlist();
    renderWatchlist();
    renderDiscoverGrid();
    closeDeleteModal();
    state.deletingMovieId = null;

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
