// ==========================================================================
// AUTHENTICATION & SESSION MANAGEMENT MODULE
// ==========================================================================

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

function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('authErrorMessage');

    if (!username || !password) {
        if (errEl) {
            errEl.textContent = 'Please fill in all fields.';
            errEl.style.display = 'block';
        }
        return;
    }

    const usersDb = StorageService.getUsersDb();
    const user = usersDb[username];

    if (!user || user.password !== password) {
        if (errEl) {
            errEl.textContent = 'Invalid username or password.';
            errEl.style.display = 'block';
        }
        return;
    }

    state.currentUser = username;
    StorageService.setCurrentUser(username);
    state.watchlist = user.watchlist || [];

    sanitizeWatchlistUrls();
    updateNavWatchlistCount();
    updateUserHeaderUI();
    renderWatchlist();
    renderDiscoverGrid();
    renderStats();
    closeAuthModal();

    showToast(`Welcome back, ${username}!`, 'success');
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const errEl = document.getElementById('regErrorMessage');

    if (!username || !password) {
        if (errEl) {
            errEl.textContent = 'Please enter a username and password.';
            errEl.style.display = 'block';
        }
        return;
    }

    if (username.length < 3) {
        if (errEl) {
            errEl.textContent = 'Username must be at least 3 characters.';
            errEl.style.display = 'block';
        }
        return;
    }

    const usersDb = StorageService.getUsersDb();
    if (usersDb[username]) {
        if (errEl) {
            errEl.textContent = 'Username already exists! Choose another or Sign In.';
            errEl.style.display = 'block';
        }
        return;
    }

    usersDb[username] = { password: password, watchlist: [] };
    StorageService.saveUsersDb(usersDb);

    state.currentUser = username;
    StorageService.setCurrentUser(username);
    state.watchlist = [];

    updateNavWatchlistCount();
    updateUserHeaderUI();
    renderWatchlist();
    renderDiscoverGrid();
    renderStats();
    closeAuthModal();

    showToast(`Account created! Welcome, ${username}.`, 'success');
}

function handleLogout() {
    saveWatchlist();
    const prevUser = state.currentUser;
    state.currentUser = null;
    StorageService.setCurrentUser(null);
    state.watchlist = [];

    updateUserHeaderUI();
    renderWatchlist();
    renderDiscoverGrid();
    renderStats();

    showToast(`Logged out from ${prevUser}.`, 'info');
}

// Global Exposure
window.openAuthModal = openAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.handleLogout = handleLogout;
