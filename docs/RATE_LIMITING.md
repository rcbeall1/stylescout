# Rate Limiting and Cost Control

StyleScout includes a comprehensive rate limiting and cost control system to prevent excessive API usage and manage costs when deployed.

## Features

### 1. Daily Request Limits
- Configurable daily limits for each AI provider
- Separate limits for text requests and image generation
- Automatically resets at midnight UTC
- Persists across server restarts using JSON file storage

### 2. User-Friendly Error Messages
When limits are reached, users see a friendly modal explaining:
- Why the limit exists
- Current usage statistics
- When the limit will reset
- Suggestions for what they can do

### 3. Admin API Endpoints
Monitor and manage usage through secure admin endpoints:
- `/api/admin/usage` - View current usage statistics
- `/api/admin/reset/:provider` - Reset a specific provider's counter
- `/api/admin/reset-all` - Reset all counters
- `/api/admin/config` - View current rate limit configuration

## Configuration

Add these environment variables to your `.env` file:

```env
# Daily API Cost Control Limits

# Text request limits
OPENAI_DAILY_LIMIT=100
ANTHROPIC_DAILY_LIMIT=100
GOOGLE_DAILY_LIMIT=100
PERPLEXITY_DAILY_LIMIT=100

# Image generation limits
# Note: If a provider doesn't support images, OpenAI will be used as a fallback.
OPENAI_IMAGES_DAILY_LIMIT=50
GOOGLE_IMAGES_DAILY_LIMIT=50

# Admin API Key (required for admin endpoints)
ADMIN_API_KEY=your_secure_admin_key_here
```

## Usage

### Accessing Admin Endpoints

Include the admin API key in your requests:

```bash
# Get usage statistics
curl -H "X-Admin-Key: your_secure_admin_key_here" \
  https://your-app.onrender.com/api/admin/usage

# Reset a provider
curl -X POST -H "X-Admin-Key: your_secure_admin_key_here" \
  https://your-app.onrender.com/api/admin/reset/openai

# Reset all providers
curl -X POST -H "X-Admin-Key: your_secure_admin_key_here" \
  https://your-app.onrender.com/api/admin/reset-all
```

### Usage Response Example

```json
{
  "date": "2025-01-05",
  "providers": {
    "openai": {
      "requests": 45,
      "limit": 100,
      "remaining": 55,
      "percentUsed": 45
    },
    "anthropic": {
      "requests": 23,
      "limit": 100,
      "remaining": 77,
      "percentUsed": 23
    },
    "openai-images": {
      "requests": 12,
      "limit": 50,
      "remaining": 38,
      "percentUsed": 24
    }
  }
}
```

## How It Works

1. **Request Tracking**: Each API request for text or images is checked against the daily limits for the corresponding provider.
2. **Image Generation Fallback**: If the selected AI provider does not support image generation, the system automatically falls back to using the OpenAI DALL-E 3 model. In this case, the `OPENAI_IMAGES_DAILY_LIMIT` is used.
3. **Persistence**: Usage data is stored in `server/data/rate-limits.json`.
4. **Auto-Reset**: Counters automatically reset at midnight UTC.
5. **Graceful Degradation**: If the rate limiter fails, requests are allowed through to prevent service disruption, though this is not ideal for cost control.

## Rate Limit Headers

The API includes rate limit information in response headers:
- `X-RateLimit-Limit`: The daily limit for the provider
- `X-RateLimit-Remaining`: Requests remaining today
- `X-RateLimit-Provider`: The provider being tracked

## Deployment on Render

The rate limiting system works seamlessly with Render:
1. The JSON file persists in the container's filesystem
2. Daily limits prevent runaway costs
3. Admin endpoints allow monitoring without SSH access
4. Automatic reset ensures fresh limits each day

## Cost Estimation

With default limits:
- OpenAI: 100 requests/day ≈ $0.10-$0.50/day
- Anthropic: 100 requests/day ≈ $0.20-$1.00/day
- Image Generation: 50 images/day ≈ $0.50-$2.00/day

Total estimated maximum daily cost: $0.80-$3.50

## Security

- Admin endpoints require authentication via API key
- Rate limit data is stored server-side only
- No sensitive information is exposed to clients
- Failed authentication attempts are logged

## Troubleshooting

### Limits Not Resetting
- Check server timezone settings
- Verify the rate-limits.json file has write permissions
- Check server logs for any errors

### Admin Endpoints Not Working
- Ensure ADMIN_API_KEY is set in environment variables
- Verify you're including the correct header or query parameter
- Check that the API key matches exactly (no extra spaces)

### High Usage
- Review which providers are being used most
- Consider adjusting limits based on your budget
- Monitor for any unusual patterns that might indicate abuse