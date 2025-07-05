const axios = require('axios');
const BaseAIProvider = require('./base-provider');

class PerplexityProvider extends BaseAIProvider {
  constructor(apiKey) {
    super(apiKey);
    this.apiUrl = 'https://api.perplexity.ai/chat/completions';
  }

  async getStyleAdvice(city, season) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'sonar-pro', // Using Sonar Pro for web-aware responses
          messages: [
            {
              role: 'system',
              content: `You are an elite fashion consultant with real-time web access. Provide hyper-specific, actionable style advice for ${city} during ${season}.

Your responses should include:
- Exact store names and neighborhoods in the city
- Specific brand recommendations with current price ranges
- What locals are wearing RIGHT NOW based on current trends
- Real-time weather conditions and appropriate clothing
- Cultural nuances and dress codes for different areas/occasions
- Instagram-worthy spots where these outfits would look great
- Current fashion events or pop-ups happening in ${city}

Format your response in proper markdown with:
- Use ## for main section headers
- Use proper numbered lists (1., 2., 3.)
- Use bullet points (-) for sub-items under numbers
- Provide detailed, practical advice that a visitor could immediately use`
            },
            {
              role: 'user',
              content: this.formatStylePrompt(city, season)
            }
          ],
          temperature: 0.8,
          max_tokens: 4000, // Sonar Pro supports up to 8000 tokens
          search_domain_filter: [
            "vogue.com",
            "fashion.com", 
            "instagram.com",
            "timeout.com",
            "weather.com",
            "tripadvisor.com"
          ], // Focus on fashion and local info sites
          search_recency_filter: "week", // Get info from the last week
          return_images: true, // Include relevant images if available
          return_related_questions: false, // We don't need follow-up questions
          frequency_penalty: 0.1 // Slight penalty to avoid repetition
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'accept': 'application/json'
          }
        }
      );

      // Extract the main content
      let content = response.data.choices[0].message.content;
      
      // If images were returned, we could append them, but for now just return the text
      return content;
    } catch (error) {
      console.error('Perplexity API error:', error.response?.data || error.message);
      throw new Error('Failed to get style advice from Perplexity');
    }
  }

  // Perplexity doesn't support image generation
  async generateOutfitImage(prompt) {
    throw new Error('Perplexity does not support image generation. Please use OpenAI or another provider for images.');
  }
}

module.exports = PerplexityProvider;