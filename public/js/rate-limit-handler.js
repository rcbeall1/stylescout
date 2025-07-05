// Rate limit error handling
class RateLimitHandler {
  static showRateLimitError(errorData) {
    const modal = document.createElement('div');
    modal.className = 'rate-limit-modal';
    modal.innerHTML = `
      <div class="rate-limit-content">
        <div class="rate-limit-icon">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        
        <h2>Daily Limit Reached</h2>
        
        <p class="rate-limit-message">
          You've reached the daily request limit for StyleScout. 
          To keep costs manageable, we limit the number of requests per day.
        </p>
        
        <div class="rate-limit-details">
          <div class="detail-item">
            <span class="detail-label">Provider:</span>
            <span class="detail-value">${errorData.details?.provider || 'AI Service'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Today's Usage:</span>
            <span class="detail-value">${errorData.details?.current || 0} / ${errorData.details?.limit || 0}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Resets at:</span>
            <span class="detail-value">${this.getResetTime()}</span>
          </div>
        </div>
        
        <div class="rate-limit-suggestions">
          <h3>What you can do:</h3>
          <ul>
            <li>Come back tomorrow when your limit resets</li>
            <li>Try using the app during off-peak hours</li>
            <li>Save your favorite style recommendations for reference</li>
          </ul>
        </div>
        
        <button class="rate-limit-close" onclick="this.closest('.rate-limit-modal').remove()">
          Got it, thanks!
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add styles if not already present
    if (!document.getElementById('rate-limit-styles')) {
      const styles = document.createElement('style');
      styles.id = 'rate-limit-styles';
      styles.textContent = `
        .rate-limit-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .rate-limit-content {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .rate-limit-icon {
          text-align: center;
          color: #ff6b6b;
          margin-bottom: 1rem;
        }
        
        .rate-limit-content h2 {
          text-align: center;
          color: #333;
          margin-bottom: 1rem;
        }
        
        .rate-limit-message {
          text-align: center;
          color: #666;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }
        
        .rate-limit-details {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .detail-item:last-child {
          margin-bottom: 0;
        }
        
        .detail-label {
          font-weight: 600;
          color: #555;
        }
        
        .detail-value {
          color: #333;
        }
        
        .rate-limit-suggestions {
          margin-bottom: 1.5rem;
        }
        
        .rate-limit-suggestions h3 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
          color: #333;
        }
        
        .rate-limit-suggestions ul {
          margin: 0;
          padding-left: 1.5rem;
          color: #666;
        }
        
        .rate-limit-suggestions li {
          margin-bottom: 0.25rem;
        }
        
        .rate-limit-close {
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: #333;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .rate-limit-close:hover {
          background: #555;
        }
      `;
      document.head.appendChild(styles);
    }
  }
  
  static getResetTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const hours = Math.floor((tomorrow - now) / (1000 * 60 * 60));
    const minutes = Math.floor(((tomorrow - now) % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m (Midnight UTC)`;
  }
  
  static handleError(error) {
    if (error.status === 429 && error.responseJSON) {
      this.showRateLimitError(error.responseJSON);
      return true;
    }
    return false;
  }
}

// Export for use in other scripts
window.RateLimitHandler = RateLimitHandler;