// Interactive Star Rating Picker
function setupStarPicker() {
    const stars = document.querySelectorAll('#starPickerContainer .star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const val = parseInt(star.getAttribute('data-value'));
            setStarRatingUI(val);
        });

        star.addEventListener('mouseenter', () => {
            const val = parseInt(star.getAttribute('data-value'));
            highlightStars(val);
        });
    });

    document.getElementById('starPickerContainer')?.addEventListener('mouseleave', () => {
        const currentVal = parseInt(document.getElementById('modalRatingInput').value) || 0;
        highlightStars(currentVal);
    });
}

function setStarRatingUI(rating) {
    document.getElementById('modalRatingInput').value = rating;
    highlightStars(rating);
}

function highlightStars(count) {
    const stars = document.querySelectorAll('#starPickerContainer .star');
    stars.forEach((star, index) => {
        if (index < count) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Global Exposure
window.setupStarPicker = setupStarPicker;
window.setStarRatingUI = setStarRatingUI;
window.highlightStars = highlightStars;
