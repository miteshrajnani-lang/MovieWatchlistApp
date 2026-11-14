// ==========================================================================
// AUTHENTICATION & SESSION MANAGEMENT MODULE (SUPABASE AUTH)
// ==========================================================================

function getSyntheticEmail(username) {
    const domain = (window.AUTH_CONFIG && window.AUTH_CONFIG.SYNTHETIC_EMAIL_DOMAIN) || 'watchathon.app';
    const cleanUser = (username || '').trim().toLowerCase();
    return `${cleanUser}@${domain}`;
}

function validateUsernameInput(username) {
    if (!username) {
        return 'Please enter a username.';
    }
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 50) {
        return 'Username must be between 3 and 50 characters.';
    }
    const regex = (window.AUTH_CONFIG && window.AUTH_CONFIG.USERNAME_REGEX) || /^[a-zA-Z0-9_]{3,50}$/;
    if (!regex.test(trimmed)) {
        return 'Username may only contain letters, numbers, and underscores.';
    }
    return null;
}

function openAuthModal(mode = 'login') {
    switchAuthTab(mode);
    ModalManager.open('authModal');
}

function switchAuthTab(mode) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const errLogin = document.getElementById('authErrorMessage');
    const errReg = document.getElementById('regErrorMessage');

    if (errLogin) errLogin.style.display = 'none';
    if (errReg) errReg.style.display = 'none';

    if (mode === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (tabRegister) tabRegister.classList.add('active');
        if (tabLogin) tabLogin.classList.remove('active');
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const errEl = document.getElementById('authErrorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (errEl) errEl.style.display = 'none';

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) {
        if (errEl) {
            errEl.textContent = 'Please fill in all fields.';
            errEl.style.display = 'block';
        }
        return;
    }

    if (!window.supabaseClient) {
        if (errEl) {
            errEl.textContent = 'Authentication service is currently unavailable.';
            errEl.style.display = 'block';
        }
        return;
    }

    const email = getSyntheticEmail(username);

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';
        }

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            let message = 'Invalid username or password.';
            if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
                message = 'Email confirmation is required. Please contact support.';
            }
            if (errEl) {
                errEl.textContent = message;
                errEl.style.display = 'block';
            }
            return;
        }

        if (data && data.user) {
            // Strictly require a valid profile row with a non-empty username
            let resolvedUsername = null;
            try {
                const { data: profile, error: profileErr } = await window.supabaseClient
                    .from('profiles')
                    .select('username')
                    .eq('id', data.user.id)
                    .maybeSingle();

                if (!profileErr && profile && profile.username && profile.username.trim() !== '') {
                    resolvedUsername = profile.username.trim();
                }
            } catch (pErr) {
                console.error('Error querying user profile during login:', pErr);
            }

            if (!resolvedUsername) {
                // Incomplete or missing profile: abort authentication, sign out, and do not display user badge
                await window.supabaseClient.auth.signOut();
                state.currentUser = null;
                state.supabaseUserId = null;
                state.watchlist = StorageService.getLegacyWatchlist();
                updateUserHeaderUI();

                if (errEl) {
                    errEl.textContent = 'User profile not found. Please contact support.';
                    errEl.style.display = 'block';
                }
                return;
            }

            state.sessionEpoch = (state.sessionEpoch || 0) + 1;
            const currentEpoch = state.sessionEpoch;
            state.supabaseUserId = data.user.id;
            state.currentUser = resolvedUsername;

            updateUserHeaderUI();

            // Load user's Supabase watchlist before presenting the authenticated app as ready
            try {
                if (typeof window.fetchAndSetUserWatchlist === 'function') {
                    await window.fetchAndSetUserWatchlist(data.user.id, currentEpoch);
                } else if (window.DB && typeof window.DB.fetchUserWatchlist === 'function') {
                    state.watchlistLoadingStatus = 'loading';
                    const remoteList = await window.DB.fetchUserWatchlist(data.user.id);
                    if (state.sessionEpoch === currentEpoch && state.supabaseUserId === data.user.id) {
                        state.watchlist = Array.isArray(remoteList) ? remoteList : [];
                        state.watchlistLoadingStatus = 'loaded';
                        if (typeof sanitizeWatchlistUrls === 'function') sanitizeWatchlistUrls();
                        if (typeof updateNavWatchlistCount === 'function') updateNavWatchlistCount();
                    }
                }
            } catch (wErr) {
                console.error('Failed to load watchlist on login:', wErr);
                // User remains authenticated; state.watchlistLoadingStatus is 'error'
            }

            // Guard: if another login, logout, or external sign-out changed the session
            // while fetchAndSetUserWatchlist was awaited, do not render the old user's UI.
            if (state.sessionEpoch !== currentEpoch || state.supabaseUserId !== data.user.id) {
                console.warn('handleLoginSubmit: session changed during watchlist load; aborting UI update.');
                return;
            }

            renderWatchlist();
            renderDiscoverGrid();
            renderStats();
            closeAuthModal();

            showToast(`Welcome back, ${resolvedUsername}!`, 'success');
        }
    } catch (err) {
        console.error('Sign in error:', err);
        if (errEl) {
            errEl.textContent = 'An unexpected error occurred during sign in. Please try again.';
            errEl.style.display = 'block';
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
        }
    }
}


async function handleRegisterSubmit(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('regUsername');
    const passwordInput = document.getElementById('regPassword');
    const errEl = document.getElementById('regErrorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (errEl) errEl.style.display = 'none';

    const rawUsername = usernameInput ? usernameInput.value : '';
    const username = rawUsername.trim();
    const password = passwordInput ? passwordInput.value : '';

    const validationError = validateUsernameInput(username);
    if (validationError) {
        if (errEl) {
            errEl.textContent = validationError;
            errEl.style.display = 'block';
        }
        return;
    }

    if (!password) {
        if (errEl) {
            errEl.textContent = 'Please enter a password.';
            errEl.style.display = 'block';
        }
        return;
    }

    if (password.length < 6) {
        if (errEl) {
            errEl.textContent = 'Password must be at least 6 characters.';
            errEl.style.display = 'block';
        }
        return;
    }

    if (!window.supabaseClient) {
        if (errEl) {
            errEl.textContent = 'Authentication service is currently unavailable.';
            errEl.style.display = 'block';
        }
        return;
    }

    const email = getSyntheticEmail(username);

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';
        }

        // 1. Pre-check username availability via RPC function if available
        try {
            const { data: taken, error: checkErr } = await window.supabaseClient.rpc('is_username_taken', {
                requested_username: username
            });
            if (!checkErr && taken === true) {
                if (errEl) {
                    errEl.textContent = `Username "${username}" is already taken. Please choose another.`;
                    errEl.style.display = 'block';
                }
                return;
            }
        } catch (rpcErr) {
            console.warn('is_username_taken check bypassed:', rpcErr);
        }

        // 2. Register account with Supabase Auth (passing username in metadata for trigger)
        const { data, error } = await window.supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        });

        if (error) {
            let message = error.message || 'Registration failed.';
            const lowerMsg = message.toLowerCase();
            if (lowerMsg.includes('already taken') || lowerMsg.includes('already registered') || lowerMsg.includes('user already exists')) {
                message = `Username "${username}" is already taken. Please choose another or Sign In.`;
            }
            if (errEl) {
                errEl.textContent = message;
                errEl.style.display = 'block';
            }
            return;
        }

        if (data && data.user) {
            // Strictly query profiles table to verify the profile was created by the trigger
            let resolvedUsername = null;
            try {
                const { data: profile, error: profileErr } = await window.supabaseClient
                    .from('profiles')
                    .select('username')
                    .eq('id', data.user.id)
                    .maybeSingle();

                if (!profileErr && profile && profile.username && profile.username.trim() !== '') {
                    resolvedUsername = profile.username.trim();
                }
            } catch (pErr) {
                console.error('Error verifying user profile during registration:', pErr);
            }

            if (!resolvedUsername) {
                // Incomplete or missing profile: sign out the newly created session and reset state
                try {
                    await window.supabaseClient.auth.signOut();
                } catch (soErr) {
                    console.error('Error signing out incomplete registration session:', soErr);
                }

                state.currentUser = null;
                state.supabaseUserId = null;
                state.watchlist = StorageService.getLegacyWatchlist();
                updateUserHeaderUI();

                if (errEl) {
                    errEl.textContent = 'Account profile creation failed. Please try again or contact support.';
                    errEl.style.display = 'block';
                }
                return;
            }

            state.sessionEpoch = (state.sessionEpoch || 0) + 1;
            state.supabaseUserId = data.user.id;
            state.currentUser = resolvedUsername;
            // Explicitly initialize authenticated watchlist as empty (brand-new account)
            state.watchlist = [];
            state.watchlistLoadingStatus = 'loaded';

            updateUserHeaderUI();
            renderWatchlist();
            renderDiscoverGrid();
            renderStats();
            closeAuthModal();

            showToast(`Account created! Welcome, ${resolvedUsername}.`, 'success');
        }
    } catch (err) {
        console.error('Registration error:', err);
        if (errEl) {
            errEl.textContent = 'An unexpected error occurred during account creation. Please try again.';
            errEl.style.display = 'block';
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
        }
    }
}


async function handleLogout() {
    // Note: Do NOT call saveWatchlist() here. We do not write or migrate legacy localStorage data on logout.
    const prevUser = state.currentUser;

    if (window.supabaseClient) {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) {
            console.error('Logout failed:', error);
            showToast('Failed to sign out. Please try again.', 'info');
            return;
        }
    }

    // Only clear in-memory authentication state after successful sign-out
    state.sessionEpoch = (state.sessionEpoch || 0) + 1;
    state.currentUser = null;
    state.supabaseUserId = null;
    state.watchlistLoadingStatus = 'loaded';
    // Restore legacy anonymous watchlist for unauthenticated browsing
    state.watchlist = StorageService.getLegacyWatchlist();

    updateUserHeaderUI();
    renderWatchlist();
    renderDiscoverGrid();
    renderStats();

    showToast(`Logged out from ${prevUser || 'account'}.`, 'info');
}



// Global Exposure
window.getSyntheticEmail = getSyntheticEmail;
window.validateUsernameInput = validateUsernameInput;
window.openAuthModal = openAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.handleLogout = handleLogout;