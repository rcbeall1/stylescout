const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const validator = require('validator');
const rateLimit = require('express-rate-limit');

// Feedback file path
const FEEDBACK_FILE = path.join(__dirname, '..', 'data', 'feedback.json');

// Rate limiting for feedback submissions
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 feedback submissions per hour per IP
  message: 'Too many feedback submissions. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Predefined feedback options
const FEEDBACK_OPTIONS = [
  'easy-to-use',
  'helpful-advice',
  'accurate-weather',
  'good-outfit-ideas',
  'fast-response',
  'needs-more-detail',
  'outfit-images-helpful',
  'would-recommend'
];

// Initialize feedback file if it doesn't exist
async function initFeedbackFile() {
  try {
    // Ensure directory exists first
    const dir = path.dirname(FEEDBACK_FILE);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.access(FEEDBACK_FILE);
  } catch {
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify({ feedback: [] }, null, 2));
  }
}

// Sanitize text input to prevent XSS and injection
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Remove any HTML tags and scripts
  let sanitized = text.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  sanitized = validator.escape(sanitized);
  
  // Limit length
  sanitized = sanitized.substring(0, 500);
  
  // Remove any null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  return sanitized.trim();
}

// Validate feedback data
function validateFeedback(data) {
  const errors = [];
  
  // Validate rating
  if (!data.rating || typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
    errors.push('Rating must be between 1 and 5');
  }
  
  // Validate options
  if (data.options && Array.isArray(data.options)) {
    const invalidOptions = data.options.filter(opt => !FEEDBACK_OPTIONS.includes(opt));
    if (invalidOptions.length > 0) {
      errors.push('Invalid feedback options selected');
    }
  }
  
  // Validate text feedback length
  if (data.textFeedback && data.textFeedback.length > 500) {
    errors.push('Text feedback must be less than 500 characters');
  }
  
  return errors;
}

// Submit feedback
router.post('/submit', feedbackLimiter, async (req, res) => {
  try {
    await initFeedbackFile();
    
    const { rating, options = [], textFeedback = '', userAgent } = req.body;
    
    // Validate input
    const errors = validateFeedback({ rating, options, textFeedback });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    // Sanitize text feedback
    const sanitizedText = sanitizeText(textFeedback);
    
    // Create feedback entry
    const feedbackEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      rating: parseInt(rating),
      options: options.filter(opt => FEEDBACK_OPTIONS.includes(opt)),
      textFeedback: sanitizedText,
      userAgent: sanitizeText(userAgent || ''),
      ip: req.ip || 'unknown'
    };
    
    // Read existing feedback
    const fileContent = await fs.readFile(FEEDBACK_FILE, 'utf8');
    const data = JSON.parse(fileContent);
    
    // Add new feedback
    data.feedback.push(feedbackEntry);
    
    // Keep only last 1000 entries to prevent file from growing too large
    if (data.feedback.length > 1000) {
      data.feedback = data.feedback.slice(-1000);
    }
    
    // Write back to file
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify(data, null, 2));
    
    res.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// Admin endpoint to view feedback (protected)
router.get('/admin', async (req, res) => {
  try {
    // Simple authentication - in production, use proper auth
    const adminToken = req.headers['x-admin-token'];
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await initFeedbackFile();
    const fileContent = await fs.readFile(FEEDBACK_FILE, 'utf8');
    const data = JSON.parse(fileContent);
    
    // Calculate summary statistics
    const feedback = data.feedback || [];
    const summary = {
      totalFeedback: feedback.length,
      averageRating: feedback.length > 0 
        ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(2)
        : 0,
      ratingDistribution: {
        1: feedback.filter(f => f.rating === 1).length,
        2: feedback.filter(f => f.rating === 2).length,
        3: feedback.filter(f => f.rating === 3).length,
        4: feedback.filter(f => f.rating === 4).length,
        5: feedback.filter(f => f.rating === 5).length
      },
      optionCounts: {}
    };
    
    // Count option selections
    FEEDBACK_OPTIONS.forEach(option => {
      summary.optionCounts[option] = feedback.filter(f => 
        f.options && f.options.includes(option)
      ).length;
    });
    
    // Get recent feedback (last 50)
    const recentFeedback = feedback.slice(-50).reverse();
    
    res.json({
      summary,
      recentFeedback,
      feedbackOptions: FEEDBACK_OPTIONS
    });
  } catch (error) {
    console.error('Error reading feedback:', error);
    res.status(500).json({ error: 'Failed to read feedback' });
  }
});

// Get feedback options for frontend
router.get('/options', (req, res) => {
  res.json({
    options: FEEDBACK_OPTIONS.map(opt => ({
      value: opt,
      label: opt.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }))
  });
});

module.exports = router;