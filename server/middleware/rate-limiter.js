const fs = require('fs').promises;
const path = require('path');

class RateLimiter {
  constructor() {
    this.dataFile = path.join(__dirname, '..', 'data', 'rate-limits.json');
    this.limits = {
      openai: parseInt(process.env.OPENAI_DAILY_LIMIT) || 100,
      anthropic: parseInt(process.env.ANTHROPIC_DAILY_LIMIT) || 100,
      google: parseInt(process.env.GOOGLE_DAILY_LIMIT) || 100,
      perplexity: parseInt(process.env.PERPLEXITY_DAILY_LIMIT) || 100,
      'openai-images': parseInt(process.env.OPENAI_IMAGES_DAILY_LIMIT) || 50
    };
    this.data = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dataFile);
      await fs.mkdir(dataDir, { recursive: true });

      // Load existing data or create new
      try {
        const fileContent = await fs.readFile(this.dataFile, 'utf8');
        this.data = JSON.parse(fileContent);
      } catch (error) {
        // File doesn't exist or is invalid, create new data
        this.data = this.createEmptyData();
        await this.saveData();
      }

      // Check if we need to reset for a new day
      await this.checkAndResetDaily();
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing rate limiter:', error);
      // Use in-memory fallback
      this.data = this.createEmptyData();
      this.initialized = true;
    }
  }

  createEmptyData() {
    const today = this.getTodayString();
    return {
      date: today,
      providers: {
        openai: { requests: 0, lastReset: today },
        anthropic: { requests: 0, lastReset: today },
        google: { requests: 0, lastReset: today },
        perplexity: { requests: 0, lastReset: today },
        'openai-images': { requests: 0, lastReset: today }
      }
    };
  }

  getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  async checkAndResetDaily() {
    const today = this.getTodayString();
    
    if (this.data.date !== today) {
      // It's a new day, reset all counters
      this.data = this.createEmptyData();
      await this.saveData();
    }
  }

  async saveData() {
    try {
      await fs.writeFile(this.dataFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving rate limit data:', error);
    }
  }

  async checkLimit(provider, type = 'requests') {
    await this.initialize();
    await this.checkAndResetDaily();

    const key = type === 'images' ? `${provider}-images` : provider;
    const limit = this.limits[key];
    
    if (!this.data.providers[key]) {
      this.data.providers[key] = { requests: 0, lastReset: this.getTodayString() };
    }

    const currentCount = this.data.providers[key].requests;
    
    return {
      allowed: currentCount < limit,
      current: currentCount,
      limit: limit,
      remaining: Math.max(0, limit - currentCount)
    };
  }

  async increment(provider, type = 'requests') {
    await this.initialize();
    await this.checkAndResetDaily();

    const key = type === 'images' ? `${provider}-images` : provider;
    
    if (!this.data.providers[key]) {
      this.data.providers[key] = { requests: 0, lastReset: this.getTodayString() };
    }

    this.data.providers[key].requests++;
    await this.saveData();

    return this.data.providers[key].requests;
  }

  async getUsageStats() {
    await this.initialize();
    await this.checkAndResetDaily();

    const stats = {
      date: this.data.date,
      providers: {}
    };

    for (const [provider, data] of Object.entries(this.data.providers)) {
      const limit = this.limits[provider];
      stats.providers[provider] = {
        requests: data.requests,
        limit: limit,
        remaining: Math.max(0, limit - data.requests),
        percentUsed: limit > 0 ? Math.round((data.requests / limit) * 100) : 0
      };
    }

    return stats;
  }

  async resetProvider(provider) {
    await this.initialize();
    
    if (this.data.providers[provider]) {
      this.data.providers[provider].requests = 0;
      this.data.providers[provider].lastReset = this.getTodayString();
      await this.saveData();
    }
  }

  async resetAll() {
    await this.initialize();
    this.data = this.createEmptyData();
    await this.saveData();
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Middleware function
const rateLimitMiddleware = (type = 'requests') => {
  return async (req, res, next) => {
    try {
      // Determine the provider from the request
      let provider = process.env.AI_PROVIDER || 'openai';
      
      // For image generation, always check OpenAI limits
      if (req.path.includes('generate-outfit') || type === 'images') {
        provider = 'openai';
      }

      const limitCheck = await rateLimiter.checkLimit(provider, type);

      if (!limitCheck.allowed) {
        return res.status(429).json({
          error: 'Daily request limit reached',
          message: `You've reached the daily limit for ${provider} ${type}. Please try again tomorrow.`,
          details: {
            provider,
            type,
            current: limitCheck.current,
            limit: limitCheck.limit,
            resetTime: 'Midnight UTC'
          }
        });
      }

      // Add rate limit info to response headers
      res.setHeader('X-RateLimit-Limit', limitCheck.limit);
      res.setHeader('X-RateLimit-Remaining', limitCheck.remaining);
      res.setHeader('X-RateLimit-Provider', provider);

      // Store provider and type for use in the route
      req.rateLimitProvider = provider;
      req.rateLimitType = type;

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Don't block requests on rate limiter errors
      next();
    }
  };
};

// Function to increment counter after successful request
const incrementUsage = async (req) => {
  if (req.rateLimitProvider) {
    await rateLimiter.increment(req.rateLimitProvider, req.rateLimitType);
  }
};

module.exports = {
  rateLimiter,
  rateLimitMiddleware,
  incrementUsage
};