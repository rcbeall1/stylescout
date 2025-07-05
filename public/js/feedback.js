// Feedback system functionality
(function() {
    // Elements
    const feedbackBtn = document.getElementById('feedbackBtn');
    const feedbackModal = document.getElementById('feedbackModal');
    const starRating = document.getElementById('starRating');
    const stars = starRating.querySelectorAll('.star');
    const feedbackOptions = document.getElementById('feedbackOptions');
    const feedbackText = document.getElementById('feedbackText');
    const charCount = document.getElementById('charCount');
    const submitBtn = document.getElementById('submitFeedback');
    const cancelBtn = document.getElementById('cancelFeedback');

    // State
    let selectedRating = 0;
    let selectedOptions = [];
    let feedbackTextValue = '';

    // Initialize
    init();

    function init() {
        loadFeedbackOptions();
        setupEventListeners();
    }

    // Load feedback options from server
    async function loadFeedbackOptions() {
        try {
            const response = await fetch('/api/feedback/options');
            const data = await response.json();
            
            feedbackOptions.innerHTML = data.options.map(option => `
                <label class="checkbox-label">
                    <input type="checkbox" value="${option.value}" class="feedback-checkbox">
                    <span>${option.label}</span>
                </label>
            `).join('');
        } catch (error) {
            console.error('Error loading feedback options:', error);
        }
    }

    // Event listeners
    function setupEventListeners() {
        // Show modal
        feedbackBtn.addEventListener('click', showFeedbackModal);

        // Close modal
        cancelBtn.addEventListener('click', closeFeedbackModal);
        feedbackModal.addEventListener('click', (e) => {
            if (e.target === feedbackModal) {
                closeFeedbackModal();
            }
        });

        // Star rating
        stars.forEach(star => {
            star.addEventListener('click', () => selectRating(parseInt(star.dataset.rating)));
            star.addEventListener('mouseenter', () => hoverRating(parseInt(star.dataset.rating)));
        });
        starRating.addEventListener('mouseleave', () => updateStarDisplay(selectedRating));

        // Feedback options
        feedbackOptions.addEventListener('change', (e) => {
            if (e.target.classList.contains('feedback-checkbox')) {
                updateSelectedOptions();
            }
        });

        // Text feedback
        feedbackText.addEventListener('input', (e) => {
            feedbackTextValue = e.target.value;
            charCount.textContent = feedbackTextValue.length;
            validateForm();
        });

        // Submit
        submitBtn.addEventListener('click', submitFeedback);
    }

    // Show/hide modal
    function showFeedbackModal() {
        feedbackModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeFeedbackModal() {
        feedbackModal.classList.remove('show');
        document.body.style.overflow = '';
        resetForm();
    }

    // Star rating functions
    function selectRating(rating) {
        selectedRating = rating;
        updateStarDisplay(rating);
        validateForm();
    }

    function hoverRating(rating) {
        updateStarDisplay(rating);
    }

    function updateStarDisplay(rating) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.textContent = '★';
                star.classList.add('selected');
            } else {
                star.textContent = '☆';
                star.classList.remove('selected');
            }
        });
    }

    // Update selected options
    function updateSelectedOptions() {
        selectedOptions = Array.from(feedbackOptions.querySelectorAll('.feedback-checkbox:checked'))
            .map(checkbox => checkbox.value);
        validateForm();
    }

    // Validate form
    function validateForm() {
        const isValid = selectedRating > 0;
        submitBtn.disabled = !isValid;
    }

    // Submit feedback
    async function submitFeedback() {
        if (selectedRating === 0) return;

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const response = await fetch('/api/feedback/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating: selectedRating,
                    options: selectedOptions,
                    textFeedback: feedbackTextValue,
                    userAgent: navigator.userAgent
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Show success message
                showNotification('Thank you for your feedback!', 'success');
                closeFeedbackModal();
            } else {
                throw new Error(data.error || 'Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            showNotification(error.message || 'Failed to submit feedback. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Feedback';
        }
    }

    // Reset form
    function resetForm() {
        selectedRating = 0;
        selectedOptions = [];
        feedbackTextValue = '';
        feedbackText.value = '';
        charCount.textContent = '0';
        updateStarDisplay(0);
        
        // Uncheck all checkboxes
        feedbackOptions.querySelectorAll('.feedback-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submit Feedback';
    }

    // Show notification
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Remove notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
})();