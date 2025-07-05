// Test endpoint to add to server/index.js temporarily
app.post('/api/style-advice-test', async (req, res) => {
  try {
    const { city, season } = req.body;
    
    if (!city || !season) {
      return res.status(400).json({ error: 'City and season are required' });
    }
    
    // Return a simple test response
    res.json({
      advice: "Test advice - if you see this, the basic API is working",
      weather: { temp: 72, condition: "sunny" },
      stores: ["Test Store 1", "Test Store 2"],
      outfitImages: [] // No images for now
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});