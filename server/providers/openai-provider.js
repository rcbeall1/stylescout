const OpenAI = require('openai');
const BaseAIProvider = require('./base-provider');

class OpenAIProvider extends BaseAIProvider {
  constructor(apiKey) {
    super(apiKey);
    this.client = new OpenAI({ apiKey });
  }

  async getStyleAdvice(city, season) {
    try {
      const response = await this.client.responses.create({
        model: 'o3-2025-04-16',
        input: `You are an elite fashion consultant providing hyper-specific, actionable style advice.

Context: A visitor needs fashion advice for ${city} during ${season}.

${this.formatStylePrompt(city, season)}

Use web search to find:
- Current weather conditions and forecast for ${city}
- Trending fashion stores and boutiques in ${city}
- Recent fashion blog posts about ${city}
- Local Instagram fashion influencers in ${city}
- Current events in ${city} that might affect dress codes

Your response should include:
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
- Provide detailed, practical advice that a visitor could immediately use`,
        tools: [
          { 
            type: "web_search_preview" 
          }
        ],
        max_output_tokens: 4000,
        reasoning: {
          effort: 'medium' // Using medium for a good balance of speed and quality
        }
      });

      // The o3 model returns output_text instead of choices
      return response.output_text || 'Unable to generate style advice';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get style advice from OpenAI');
    }
  }

  // Helper to infer country code from city string
  inferCountryCode(city) {
    const cityLower = city.toLowerCase();
    
    // Common country mappings
    const countryMappings = {
      // USA
      'usa': 'US', 'united states': 'US', 'america': 'US',
      'new york': 'US', 'los angeles': 'US', 'chicago': 'US', 'miami': 'US',
      'san francisco': 'US', 'boston': 'US', 'seattle': 'US', 'atlanta': 'US',
      'austin': 'US', 'portland': 'US', 'denver': 'US', 'nashville': 'US',
      
      // UK
      'uk': 'GB', 'united kingdom': 'GB', 'england': 'GB',
      'london': 'GB', 'manchester': 'GB', 'edinburgh': 'GB', 'glasgow': 'GB',
      
      // France
      'france': 'FR', 'paris': 'FR', 'lyon': 'FR', 'marseille': 'FR',
      
      // Japan
      'japan': 'JP', 'tokyo': 'JP', 'osaka': 'JP', 'kyoto': 'JP',
      
      // Australia
      'australia': 'AU', 'sydney': 'AU', 'melbourne': 'AU', 'brisbane': 'AU',
      
      // Canada
      'canada': 'CA', 'toronto': 'CA', 'vancouver': 'CA', 'montreal': 'CA',
      
      // Germany
      'germany': 'DE', 'berlin': 'DE', 'munich': 'DE', 'frankfurt': 'DE',
      
      // Italy
      'italy': 'IT', 'rome': 'IT', 'milan': 'IT', 'florence': 'IT', 'venice': 'IT',
      
      // Spain
      'spain': 'ES', 'madrid': 'ES', 'barcelona': 'ES', 'seville': 'ES',
      
      // Netherlands
      'netherlands': 'NL', 'amsterdam': 'NL', 'rotterdam': 'NL',
      
      // Add more as needed
    };
    
    // Check if city contains any known locations
    for (const [location, code] of Object.entries(countryMappings)) {
      if (cityLower.includes(location)) {
        return code;
      }
    }
    
    // Default to US if not found
    return 'US';
  }

  async generateOutfitImage(prompt) {
    try {
      const response = await this.client.images.generate({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'high', // Using high quality (best available for gpt-image-1)
        output_format: 'png' // Valid parameter according to docs
      });

      // The OpenAI SDK returns the URL directly in the response
      console.log('OpenAI image response:', response);
      
      // Check if response has the expected structure
      if (response && response.data && response.data.length > 0) {
        const imageData = response.data[0];
        
        if (imageData.url) {
          return imageData.url;
        } else if (imageData.b64_json) {
          // Convert base64 to data URL that can be displayed in the browser
          return `data:image/png;base64,${imageData.b64_json}`;
        }
      }
      
      console.error('Unexpected response structure');
      return null;
    } catch (error) {
      console.error('Image generation API error:', error);
      throw new Error('Failed to generate outfit image');
    }
  }
}

module.exports = OpenAIProvider;