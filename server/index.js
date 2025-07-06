require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const ProviderFactory = require('./providers/provider-factory');
const { rateLimitMiddleware, incrementUsage } = require('./middleware/rate-limiter');
const adminRoutes = require('./routes/admin');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 3000;

// Temporary image storage (in production, use a proper storage solution)
const imageStorage = new Map();

// Trust proxy headers (needed for Render and other cloud platforms)
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Admin routes (before other API routes)
app.use('/api/admin', adminRoutes);

// Feedback routes
app.use('/api/feedback', feedbackRoutes);

// Temporary image serving endpoint
app.get('/api/image/:id', (req, res) => {
  const imageData = imageStorage.get(req.params.id);
  if (!imageData) {
    return res.status(404).send('Image not found');
  }
  
  // Extract mime type and base64 data
  const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches) {
    return res.status(400).send('Invalid image data');
  }
  
  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(buffer);
  
  // Clean up old images after 5 minutes
  setTimeout(() => imageStorage.delete(req.params.id), 5 * 60 * 1000);
});

// Get current AI provider
function getAIProvider() {
  const providerName = process.env.AI_PROVIDER || 'openai';
  const apiKeyMap = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY
  };
  
  const apiKey = apiKeyMap[providerName.toLowerCase()];
  if (!apiKey || apiKey === 'your_' + providerName + '_key_here') {
    throw new Error(`No API key configured for ${providerName}. Please add it to your .env file.`);
  }
  
  return ProviderFactory.create(providerName, apiKey);
}

// Routes
app.get('/api/providers', (req, res) => {
  const providers = ProviderFactory.getAvailableProviders();
  const currentProvider = process.env.AI_PROVIDER || 'openai';
  res.json({
    current: currentProvider,
    available: providers
  });
});

app.post('/api/style-advice', rateLimitMiddleware('requests'), async (req, res) => {
  try {
    const { city, season } = req.body;
    
    if (!city || !season) {
      return res.status(400).json({ error: 'City and season are required' });
    }
    
    const provider = getAIProvider();
    const advice = await provider.getStyleAdvice(city, season);
    
    // Generate outfit images automatically (using OpenAI regardless of main provider)
    let outfitImages = [];
    
    // TEMPORARILY DISABLED FOR DEBUGGING
    const SKIP_IMAGE_GENERATION = false;
    
    if (!SKIP_IMAGE_GENERATION) {
    try {
      // Always use OpenAI for image generation
      const openAIProvider = ProviderFactory.create('openai', process.env.OPENAI_API_KEY);
      
      // Generate 3 different outfit images based on the advice and city context
      const outfitPrompts = [
        `${season} casual outfit flat lay for ${city}: Relaxed daywear that locals actually wear. Include denim, comfortable shoes, and practical accessories. Realistic style, natural lighting.`,
        `${season} smart casual outfit for ${city}: Versatile pieces for lunch, shopping, or casual dinner. Balance between comfort and style. Include transitional pieces that work day to night.`,
        `${season} active lifestyle outfit for ${city}: Athletic-inspired streetwear for walking, exploring, or outdoor activities. Include sneakers, breathable fabrics, and functional accessories.`
      ];
      
      // Generate images in parallel for better performance
      const imagePromises = outfitPrompts.map(async (prompt, index) => {
        try {
          console.log(`Generating image ${index + 1} with prompt:`, prompt.substring(0, 100) + '...');
          const imageUrl = await openAIProvider.generateOutfitImage(prompt);
          console.log(`Image ${index + 1} generated successfully:`, imageUrl);
          return { url: imageUrl, prompt };
        } catch (error) {
          console.error(`Failed to generate image ${index + 1}:`, error.message);
          console.error('Full error:', error);
          return null;
        }
      });
      
      const results = await Promise.all(imagePromises);
      outfitImages = results.filter(img => img !== null);
    } catch (error) {
      console.error('Error generating outfit images:', error);
      // Continue without images if generation fails
    }
    } // End of SKIP_IMAGE_GENERATION check
    
    // Increment usage counter on success
    await incrementUsage(req);
    
    // If we generated images, increment image counter too
    if (outfitImages.length > 0) {
      req.rateLimitProvider = 'openai';
      req.rateLimitType = 'images';
      await incrementUsage(req);
    }
    
    res.json({
      success: true,
      city,
      season,
      advice,
      outfitImages,
      provider: process.env.AI_PROVIDER || 'openai'
    });
  } catch (error) {
    console.error('Error getting style advice:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get style advice',
      provider: process.env.AI_PROVIDER || 'openai'
    });
  }
});

// New streaming endpoint for style advice
app.post('/api/style-advice-stream', rateLimitMiddleware('requests'), async (req, res) => {
  const { city, season } = req.body;
  
  if (!city || !season) {
    return res.status(400).json({ error: 'City and season are required' });
  }

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable Nginx buffering if present
  });

  // Send initial status
  res.write(`data: ${JSON.stringify({ status: 'starting', message: 'Initializing fashion consultant...' })}\n\n`);

  try {
    // Get AI provider
    const provider = getAIProvider();
    
    // Send status update
    res.write(`data: ${JSON.stringify({ status: 'searching', message: `🔍 Searching for current weather in ${city}...` })}\n\n`);
    
    // Set up periodic keepalive messages during long API calls
    const keepAliveMessages = [
      { delay: 5000, message: `🛍️ Finding trending stores and boutiques in ${city}...` },
      { delay: 10000, message: `📍 Checking local Instagram fashion accounts...` },
      { delay: 15000, message: `👗 Analyzing current fashion trends for ${season}...` },
      { delay: 20000, message: `🌡️ Reviewing weather patterns and humidity levels...` },
      { delay: 30000, message: `💰 Researching local price ranges and deals...` },
      { delay: 40000, message: `✨ Creating your personalized style guide...` },
      { delay: 50000, message: `📝 Finalizing recommendations...` },
      { delay: 60000, message: `⏳ Almost there, adding final touches...` },
      { delay: 70000, message: `🔍 Double-checking local insights...` },
      { delay: 80000, message: `📋 Compiling your complete style guide...` }
    ];
    
    const keepAliveIntervals = [];
    keepAliveMessages.forEach(({ delay, message }) => {
      const interval = setTimeout(() => {
        res.write(`data: ${JSON.stringify({ status: 'processing', message })}\n\n`);
      }, delay);
      keepAliveIntervals.push(interval);
    });
    
    // Generate style advice
    const startTime = Date.now();
    let advice;
    try {
      advice = await provider.getStyleAdvice(city, season);
    } finally {
      // Clear all keepalive intervals
      keepAliveIntervals.forEach(interval => clearTimeout(interval));
    }
    const adviceTime = Date.now() - startTime;
    
    // Send status update
    res.write(`data: ${JSON.stringify({ 
      status: 'advice_complete', 
      message: '✨ Style advice generated!',
      advice: advice,
      timeTaken: adviceTime
    })}\n\n`);

    // Generate outfit images
    let outfitImages = [];
    const SKIP_IMAGE_GENERATION = false;
    
    if (!SKIP_IMAGE_GENERATION) {
      try {
        const openAIProvider = ProviderFactory.create('openai', process.env.OPENAI_API_KEY);
        
        const outfitPrompts = [
          `${season} casual outfit flat lay for ${city}: Relaxed daywear that locals actually wear. Include denim, comfortable shoes, and practical accessories. Realistic style, natural lighting.`,
          `${season} smart casual outfit for ${city}: Versatile pieces for lunch, shopping, or casual dinner. Balance between comfort and style. Include transitional pieces that work day to night.`,
          `${season} active outfit for ${city}: Simple athletic wear with sneakers and comfortable clothes.`
        ];
        
        // Send initial status for all images
        for (let i = 0; i < outfitPrompts.length; i++) {
          res.write(`data: ${JSON.stringify({ 
            status: 'generating_image', 
            message: `🎨 Creating outfit inspiration ${i + 1} of 3...`,
            imageIndex: i
          })}\n\n`);
        }
        
        // Set up keepalive during image generation to prevent Cloudflare timeout
        const imageKeepAlive = setInterval(() => {
          res.write(`data: ${JSON.stringify({ 
            status: 'keepalive', 
            message: '⏳ Still generating outfits...' 
          })}\n\n`);
        }, 15000); // Send every 15 seconds
        
        // Generate all images in parallel for speed
        const imagePromises = outfitPrompts.map(async (prompt, index) => {
          try {
            // Add a small staggered delay to avoid rate limiting (0ms, 500ms, 1000ms)
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, index * 500));
            }
            
            const imageStartTime = Date.now();
            
            // Add timeout for image generation (60 seconds per image)
            const imagePromise = openAIProvider.generateOutfitImage(prompt);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Image generation took too long')), 60000)
            );
            
            let imageUrl = await Promise.race([imagePromise, timeoutPromise]);
            const imageTime = Date.now() - imageStartTime;
            
            // If it's a base64 image, store it and return a URL
            if (imageUrl && imageUrl.startsWith('data:')) {
              const imageId = `img_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
              imageStorage.set(imageId, imageUrl);
              imageUrl = `/api/image/${imageId}`;
            }
            
            // Send success update
            const imageCompleteEvent = {
              status: 'image_complete', 
              message: `✅ Outfit ${index + 1} created!`,
              imageIndex: index,
              imageUrl: imageUrl,
              timeTaken: imageTime
            };
            console.log(`[${new Date().toISOString()}] Sending image_complete event for image ${index + 1}:`, imageCompleteEvent);
            res.write(`data: ${JSON.stringify(imageCompleteEvent)}\n\n`);
            
            // Force flush the response to ensure the event is sent immediately
            if (res.flush && typeof res.flush === 'function') {
              res.flush();
            }
            
            return { url: imageUrl, prompt };
          } catch (error) {
            console.error(`Failed to generate image ${index + 1}:`, error.message);
            console.error('Full error details:', error);
            
            // Check if it's a rate limit error
            const isRateLimit = error.message?.includes('rate') || error.message?.includes('limit');
            const errorMessage = isRateLimit 
              ? 'Rate limit reached - try again later' 
              : error.message;
            
            // Send failure update
            res.write(`data: ${JSON.stringify({ 
              status: 'image_failed', 
              message: `⚠️ Couldn't generate outfit ${index + 1}: ${errorMessage}`,
              imageIndex: index,
              error: errorMessage
            })}\n\n`);
            return null;
          }
        });
        
        // Wait for all images to complete (success or failure)
        const results = await Promise.all(imagePromises);
        outfitImages = results.filter(img => img !== null);
        
        console.log(`[${new Date().toISOString()}] All image promises resolved. Generated ${outfitImages.length} images successfully.`);
        
        // Clear the keepalive interval
        clearInterval(imageKeepAlive);
        
        // Add a delay to ensure all image_complete events are processed
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error generating outfit images:', error);
        
        // Clear the keepalive interval on error too
        if (typeof imageKeepAlive !== 'undefined') {
          clearInterval(imageKeepAlive);
        }
        
        res.write(`data: ${JSON.stringify({ 
          status: 'images_error', 
          message: '⚠️ Could not generate outfit images',
          error: error.message
        })}\n\n`);
      }
    }
    
    // Increment usage counters
    await incrementUsage(req);
    if (outfitImages.length > 0) {
      req.rateLimitProvider = 'openai';
      req.rateLimitType = 'images';
      await incrementUsage(req);
    }
    
    // Send final complete event
    res.write(`data: ${JSON.stringify({ 
      status: 'complete',
      message: '✅ All done!',
      result: {
        success: true,
        city,
        season,
        advice,
        outfitImages,
        provider: process.env.AI_PROVIDER || 'openai'
      }
    })}\n\n`);
    
    // Add a delay to ensure all data is flushed
    console.log(`[${new Date().toISOString()}] Preparing to close SSE connection...`);
    setTimeout(() => {
      console.log(`[${new Date().toISOString()}] Sending close event and ending response`);
      res.write('event: close\ndata: \n\n');
      res.end();
    }, 1500);
    
  } catch (error) {
    console.error('Error in streaming endpoint:', error);
    res.write(`data: ${JSON.stringify({ 
      status: 'error',
      message: '❌ An error occurred',
      error: error.message || 'Failed to get style advice'
    })}\n\n`);
    res.end();
  }
});

app.post('/api/generate-outfit', rateLimitMiddleware('images'), async (req, res) => {
  try {
    const { city, season, description } = req.body;
    
    if (!city || !season) {
      return res.status(400).json({ error: 'City and season are required' });
    }
    
    const provider = getAIProvider();
    
    // Check if provider supports image generation
    const providerInfo = ProviderFactory.getAvailableProviders()[process.env.AI_PROVIDER || 'openai'];
    if (!providerInfo.supportsImages) {
      return res.status(400).json({ 
        error: `${providerInfo.name} does not support image generation. Please use OpenAI.` 
      });
    }
    
    const prompt = provider.formatImagePrompt(city, season, description || 'stylish and weather-appropriate outfit');
    const imageUrl = await provider.generateOutfitImage(prompt);
    
    // Increment usage counter on success
    await incrementUsage(req);
    
    res.json({
      success: true,
      imageUrl,
      prompt
    });
  } catch (error) {
    console.error('Error generating outfit:', error);
    res.status(500).json({ error: error.message || 'Failed to generate outfit image' });
  }
});

// Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    provider: process.env.AI_PROVIDER,
    hasGoogleKey: !!process.env.GOOGLE_API_KEY,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`StyleScout server running on http://localhost:${PORT}`);
  console.log(`Using AI Provider: ${process.env.AI_PROVIDER || 'openai'}`);
});