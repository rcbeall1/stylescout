// Base class that all AI providers must implement
class BaseAIProvider {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error(`API key required for ${this.constructor.name}`);
    }
    this.apiKey = apiKey;
  }

  // Must be implemented by each provider
  async getStyleAdvice(city, season) {
    throw new Error('getStyleAdvice must be implemented by provider');
  }

  // Optional - can be overridden if provider supports image generation
  async generateOutfitImage(prompt) {
    throw new Error('This provider does not support image generation');
  }

  // Helper method to format the prompt consistently
  formatStylePrompt(city, season) {
    return `Provide ultra-specific fashion advice for visiting ${city} during ${season}.

1. WEATHER REALITY CHECK
   - Exact temperature ranges (day/night)
   - Humidity, rain chances, wind
   - What it ACTUALLY feels like

2. WHAT LOCALS ARE WEARING RIGHT NOW
   - Current trends in ${city}
   - Age-specific observations (20s, 30s, 40s+)
   - Weekend vs workday differences

3. MUST-PACK ITEMS
   - Exact pieces with brand suggestions
   - Where to buy if forgot something
   - Price ranges in local currency

4. NEIGHBORHOOD DRESS CODES
   - How to dress for different areas
   - Day vs night transformations
   - What screams "tourist" (avoid!)

5. SHOPPING INTEL
   - Best local stores/areas
   - Hidden gems only locals know
   - Typical price ranges

6. INSTAGRAM-WORTHY OUTFIT LOCATIONS
   - Where these outfits photograph best
   - Local fashion influencer spots

IMPORTANT: Be specific! Name actual stores, brands, and neighborhoods. Give price ranges. Make it actionable!`;
  }

  // Helper to format image generation prompt
  formatImagePrompt(city, season, styleDescription) {
    return `High-end fashion flat lay photography for ${city} ${season} outfit:
    
    STYLE: Vogue/Kinfolk aesthetic flat lay on marble or wood surface
    LIGHTING: Natural, soft daylight from top-left
    
    OUTFIT PIECES:
    ${styleDescription}
    
    STYLING DETAILS:
    - Clothes neatly folded/arranged with intentional wrinkles
    - Accessories artfully scattered (watch, sunglasses, bag)
    - Small props: coffee cup, city guide book, smartphone
    - Color palette appropriate for ${season} in ${city}
    
    QUALITY: Ultra high-res, professional fashion photography, DSLR quality
    MOOD: Aspirational travel wardrobe, sophisticated yet approachable
    
    NO: People, mannequins, hangers, or messy presentation`;
  }
}

module.exports = BaseAIProvider;