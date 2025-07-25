const { GoogleGenerativeAI } = require('@google/generative-ai');
const BaseAIProvider = require('./base-provider');

class GoogleProvider extends BaseAIProvider {
  constructor(apiKey) {
    super(apiKey);
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async getStyleAdvice(city, season) {
    try {
      // Using the latest Gemini 2.5 Pro model
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-pro',
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8000, // Increased for detailed fashion advice
          topP: 0.95,
          topK: 40
        }
      });
      
      // Enable Google Search tool for real-time information
      const tools = [{
        googleSearch: {}
      }];
      
      const prompt = `You are an elite fashion consultant providing hyper-specific, actionable style advice for ${city} during ${season}.

${this.formatStylePrompt(city, season)}

Use Google Search to find:
- Current weather conditions and forecast for ${city}
- Trending fashion stores and boutiques in ${city}
- Recent fashion blog posts about ${city}
- Local Instagram fashion influencers in ${city}
- Current events in ${city} that might affect dress codes
- Actual store hours and locations

IMPORTANT: Format your response in proper markdown with:
- Use ## for main section headers
- Use proper numbered lists (1., 2., 3.)
- Use bullet points (-) for sub-items under numbers
- Provide detailed, practical advice that a visitor could immediately use

Focus on current trends, real store names with addresses, specific brands with current prices, and actionable advice based on real-time information.`;
      
      const result = await model.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: prompt }] 
        }],
        tools: tools
      });
      
      const response = await result.response;
      
      // Log grounding metadata if available (for debugging)
      const metadata = response.candidates?.[0]?.groundingMetadata;
      if (metadata?.webSearchQueries) {
        console.log('Gemini searched for:', metadata.webSearchQueries);
      }
      
      let text = response.text();
      
      // Clean up any double ## symbols that might appear
      text = text.replace(/^##\s*#/gm, '##'); // Remove extra # if there are ###
      
      return text;
    } catch (error) {
      console.error('Google AI API error:', error);
      throw new Error('Failed to get style advice from Gemini');
    }
  }

  // Gemini doesn't have built-in image generation like DALL-E
  async generateOutfitImage(prompt) {
    throw new Error('Gemini does not support image generation. Please use OpenAI or another provider for images.');
  }
}

module.exports = GoogleProvider;