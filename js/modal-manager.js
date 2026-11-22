// ==========================================================================
// MODAL MANAGER MODULE
// ==========================================================================

let savedScrollY = 0;
let isScrollLocked = false;

const ModalManager = {
    lockScroll() {
        if (isScrollLocked) return;
        savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

        // Compensate for scrollbar disappearance on desktop to avoid layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        document.body.style.top = `-${savedScrollY}px`;
        isScrollLocked = true;
    },

    unlockScroll() {
        if (!isScrollLocked) return;
        const anyActive = document.querySelector('.modal-overlay.active');
        if (anyActive) return; // Another modal is still open

        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');

        const scrollYToRestore = Math.abs(parseInt(document.body.style.top || '0', 10)) || savedScrollY;
        document.body.style.top = '';
        document.body.style.paddingRight = '';
        isScrollLocked = false;

        // Restore exact scroll position without smooth scrolling animation or jumps
        window.scrollTo({
            top: scrollYToRestore,
            left: 0,
            behavior: 'instant'
        });
    },

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            this.lockScroll();
            modal.classList.add('active');
        }
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }

        // Cleanup modal-specific states
        if (modalId === 'deleteModal' && window.state) {
            window.state.deletingMovieId = null;
        }

        this.unlockScroll();
    },

    closeAll() {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
            if (modal.id === 'deleteModal' && window.state) {
                window.state.deletingMovieId = null;
            }
        });
        this.unlockScroll();
    },

    init() {
        // Overlay backdrop click handler and touch prevention
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    ModalManager.close(overlay.id);
                }
            });

            // Prevent touchmove chaining on backdrop on mobile browsers
            overlay.addEventListener('touchmove', (e) => {
                if (e.target === overlay) {
                    e.preventDefault();
                }
            }, { passive: false });
        });

        // Global Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal-overlay.active');
                if (activeModal) {
                    ModalManager.close(activeModal.id);
                }
            }
        });
    }
};

// Global convenience wrappers for backwards compatibility
function openModal(modalId) {
    ModalManager.open(modalId);
}

function closeModal(modalId) {
    ModalManager.close(modalId);
}

function closeAllModals() {
    ModalManager.closeAll();
}

function closeWatchlistModal() {
    ModalManager.close('watchlistModal');
}

function closeMovieDetailsModal() {
    ModalManager.close('movieDetailsModal');
}

function closeDeleteModal() {
    ModalManager.close('deleteModal');
}

function closeAuthModal() {
    ModalManager.close('authModal');
}

// Global Exposure
window.ModalManager = ModalManager;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;
window.closeWatchlistModal = closeWatchlistModal;
window.closeMovieDetailsModal = closeMovieDetailsModal;
window.closeDeleteModal = closeDeleteModal;
window.closeAuthModal = closeAuthModal;

