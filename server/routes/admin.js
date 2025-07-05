const express = require('express');
const router = express.Router();
const { rateLimiter } = require('../middleware/rate-limiter');

// Simple authentication middleware
const authenticateAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
  const configuredKey = process.env.ADMIN_API_KEY;

  if (!configuredKey) {
    return res.status(500).json({ error: 'Admin API key not configured' });
  }

  if (adminKey !== configuredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// Get current usage stats
router.get('/usage', authenticateAdmin, async (req, res) => {
  try {
    const stats = await rateLimiter.getUsageStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

// Reset a specific provider's counter
router.post('/reset/:provider', authenticateAdmin, async (req, res) => {
  try {
    const { provider } = req.params;
    await rateLimiter.resetProvider(provider);
    res.json({ success: true, message: `Reset counter for ${provider}` });
  } catch (error) {
    console.error('Error resetting provider:', error);
    res.status(500).json({ error: 'Failed to reset provider' });
  }
});

// Reset all counters
router.post('/reset-all', authenticateAdmin, async (req, res) => {
  try {
    await rateLimiter.resetAll();
    res.json({ success: true, message: 'All counters reset' });
  } catch (error) {
    console.error('Error resetting all:', error);
    res.status(500).json({ error: 'Failed to reset all counters' });
  }
});

// Get rate limit configuration
router.get('/config', authenticateAdmin, async (req, res) => {
  res.json({
    limits: {
      openai: parseInt(process.env.OPENAI_DAILY_LIMIT) || 100,
      anthropic: parseInt(process.env.ANTHROPIC_DAILY_LIMIT) || 100,
      google: parseInt(process.env.GOOGLE_DAILY_LIMIT) || 100,
      perplexity: parseInt(process.env.PERPLEXITY_DAILY_LIMIT) || 100,
      'openai-images': parseInt(process.env.OPENAI_IMAGES_DAILY_LIMIT) || 50
    },
    currentProvider: process.env.AI_PROVIDER || 'openai',
    adminEndpoints: {
      usage: 'GET /api/admin/usage',
      resetProvider: 'POST /api/admin/reset/:provider',
      resetAll: 'POST /api/admin/reset-all',
      config: 'GET /api/admin/config'
    }
  });
});

module.exports = router;