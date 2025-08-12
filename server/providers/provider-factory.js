const OpenAIProvider = require('./openai-provider');
const AnthropicProvider = require('./anthropic-provider');
const GoogleProvider = require('./google-provider');
const PerplexityProvider = require('./perplexity-provider');

class ProviderFactory {
  static create(providerName, apiKey) {
    switch (providerName.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(apiKey);
      
      case 'anthropic':
      case 'claude':
        return new AnthropicProvider(apiKey);
      
      case 'google':
      case 'gemini':
        return new GoogleProvider(apiKey);
      
      case 'perplexity':
        return new PerplexityProvider(apiKey);
      
      default:
        throw new Error(`Unknown AI provider: ${providerName}. Supported: openai, anthropic, google, perplexity`);
    }
  }

  static getAvailableProviders() {
    return {
      openai: {
        name: 'OpenAI',
        supportsImages: true,
        models: ['o3-2025-04-16', 'gpt-4-turbo'],
        description: 'Latest o3 model with web search for real-time fashion advice'
      },
      anthropic: {
        name: 'Claude (Anthropic)',
        supportsImages: false,
        models: ['claude-4-sonnet-20250514', 'claude-opus-4-20250514', 'claude-3-haiku'],
        description: 'Claude Opus 4 with web search for real-time fashion advice'
      },
      google: {
        name: 'Gemini (Google)',
        supportsImages: true,
        models: ['gemini-2.5-pro', 'gemini-2.0-flash-preview-image-generation'],
        description: 'Gemini 2.5 Pro with Google Search and image generation'
      },
      perplexity: {
        name: 'Perplexity',
        supportsImages: false,
        models: ['sonar-pro'],
        description: 'Sonar Pro with real-time web search for current fashion trends'
      }
    };
  }
}

module.exports = ProviderFactory;