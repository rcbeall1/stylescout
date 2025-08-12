# StyleScout 👗🌍

StyleScout is an AI-powered fashion advice application that provides hyper-specific, location-aware style recommendations based on real-time weather, local trends, and shopping information.

## Features

- 🤖 **Multiple AI Providers**: Choose between Claude Opus 4, Gemini 2.5 Pro, OpenAI o3, or Perplexity Sonar Pro
- 🔍 **Real-Time Information**: Uses web search to find current weather, local stores, and fashion trends
- 🎨 **Outfit Visualization**: Automatically generates 3 outfit inspiration images
- 💰 **Cost Protection**: Built-in rate limiting and daily usage caps
- 📊 **Usage Monitoring**: Admin dashboard to track API usage
- 💬 **User Feedback**: Secure feedback system for continuous improvement
- 🎯 **Location-Specific**: Provides advice for exact neighborhoods, stores, and local culture

## Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open http://localhost:3000

## Deployment on Render

1. Fork this repository
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Add environment variables from `.env.example`
5. Deploy!

## Configuration

### AI Providers

Set `AI_PROVIDER` in your `.env` file to one of:
- `anthropic` - Claude Opus 4 with web search
- `google` - Gemini 2.5 Pro with Google Search
- `openai` - OpenAI o3 with web search
- `perplexity` - Perplexity Sonar Pro

### Rate Limiting

Protect against excessive API costs by setting daily limits:
```env
OPENAI_DAILY_LIMIT=100
ANTHROPIC_DAILY_LIMIT=100
GOOGLE_DAILY_LIMIT=100
PERPLEXITY_DAILY_LIMIT=100
OPENAI_IMAGES_DAILY_LIMIT=50
```

### Admin Access

Monitor usage at `/admin-feedback.html?token=YOUR_ADMIN_TOKEN`

## Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon
- `npm run monitor` - Check API usage statistics
- `npm run monitor:reset` - Reset usage counters

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **AI**: Multiple provider integration
- **Styling**: Modern CSS with gradients and animations

## Security

- API keys stored in environment variables
- Input sanitization for user feedback
- Rate limiting to prevent abuse
- Admin endpoints protected by token

## License

Private repository - All rights reserved

## Support

For issues or questions, please open a GitHub issue.