// ==========================================================================
// MODAL MANAGER MODULE
// ==========================================================================

const ModalManager = {
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
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

        // Restore body scroll if no modals are open
        const anyActive = document.querySelector('.modal-overlay.active');
        if (!anyActive) {
            document.body.style.overflow = '';
        }
    },

    closeAll() {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            ModalManager.close(modal.id);
        });
    },

    init() {
        // Overlay backdrop click handler
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    ModalManager.close(overlay.id);
                }
            });
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

