const Anthropic = require('@anthropic-ai/sdk');
const BaseAIProvider = require('./base-provider');

class AnthropicProvider extends BaseAIProvider {
  constructor(apiKey) {
    super(apiKey);
    this.client = new Anthropic({ apiKey });
  }

  async getStyleAdvice(city, season, retryCount = 0) {
    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-20250514', // Using latest Opus 4 model
        max_tokens: 8000, // Matched to Gemini's output length
        temperature: 0.8,
        stream: false, // For now keeping it false, but we could enable streaming later
        system: `You are an elite fashion consultant who provides hyper-specific, actionable style advice with real-time information.
Your responses should include:
- Exact store names and neighborhoods in the city
- Specific brand recommendations with current price ranges
- What locals are wearing RIGHT NOW based on current trends
- Real-time weather conditions and forecast for ${city}
- Cultural nuances and dress codes for different areas/occasions
- Instagram-worthy spots where these outfits would look great
- Current fashion events or pop-ups happening in ${city}

Use web search to gather current information about weather, local stores, fashion trends, and events.
Provide detailed, practical advice that a visitor could immediately use.

IMPORTANT: Format your response in proper markdown with:
- Use ## for main section headers (NOT #)
- Use proper numbered lists (1., 2., 3.)
- Use bullet points (-) for sub-items under numbers
- Do NOT mix heading syntax with regular text`,
        messages: [
          {
            role: 'user',
            content: this.formatStylePrompt(city, season)
          }
        ],
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 25  // Increased to match Gemini's extensive search capability
        }]
      });

      // Handle response which may contain both text and tool use
      let finalText = '';
      
      for (const content of response.content) {
        if (content.type === 'text') {
          finalText += content.text;
        }
      }
      
      // Clean up the response to remove any trailing empty bullets or incomplete sentences
      finalText = finalText
        .replace(/\n\s*[-•]\s*$/gm, '') // Remove empty bullet points at end of lines
        .replace(/\n\s*[-•]\s*\n/g, '\n') // Remove empty bullet points on their own lines
        .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with just two
        .trim();
      
      // Check if the text seems cut off (ends mid-sentence)
      const lastChar = finalText.slice(-1);
      const lastLine = finalText.split('\n').pop();
      if (lastLine && !lastChar.match(/[.!?]/) && lastLine.length > 10) {
        finalText += '...'; // Add ellipsis to indicate continuation
      }
      
      // Remove only the "I'll provide..." sentence if it exists
      finalText = finalText.replace(/I'll provide you with ultra-specific fashion advice.*?Let me gather.*?\./g, '');
      
      return finalText || 'Unable to generate style advice';
    } catch (error) {
      console.error('Anthropic API error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        type: error.error?.type,
        apiKeyExists: !!this.apiKey,
        apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'none'
      });
      
      // Handle 529 overloaded errors with retry
      if (error.status === 529 && retryCount < 3) {
        const waitTime = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Anthropic overloaded (529), retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.getStyleAdvice(city, season, retryCount + 1);
      }
      
      throw new Error(`Failed to get style advice from Claude: ${error.message}`);
    }
  }

  // Claude doesn't support image generation
  async generateOutfitImage(prompt) {
    throw new Error('Claude does not support image generation. Please use OpenAI or another provider for images.');
  }
}

module.exports = AnthropicProvider;