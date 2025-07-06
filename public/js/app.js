// Popular travel destinations for autocomplete
const popularCities = [
    'Paris, France', 'London, UK', 'New York, USA', 'Tokyo, Japan',
    'Barcelona, Spain', 'Rome, Italy', 'Amsterdam, Netherlands',
    'Berlin, Germany', 'Sydney, Australia', 'Dubai, UAE',
    'Singapore', 'Hong Kong', 'Los Angeles, USA', 'San Francisco, USA',
    'Miami, USA', 'Seoul, South Korea', 'Bangkok, Thailand',
    'Istanbul, Turkey', 'Prague, Czech Republic', 'Vienna, Austria'
];

// DOM Elements
const form = document.getElementById('styleForm');
const cityInput = document.getElementById('city');
const seasonSelect = document.getElementById('season');
const submitBtn = document.getElementById('submitBtn');
const results = document.getElementById('results');
const adviceContainer = document.getElementById('adviceContainer');
const citySuggestions = document.getElementById('citySuggestions');
const newSearchBtn = document.getElementById('newSearchBtn');
const providerSwitch = document.getElementById('providerSwitch');
const providerModal = document.getElementById('providerModal');
const modalClose = document.getElementById('modalClose');
const currentProviderSpan = document.getElementById('currentProvider');

// Current style data
let currentStyleData = null;

// City autocomplete
cityInput.addEventListener('input', (e) => {
    const value = e.target.value.toLowerCase();
    if (value.length < 2) {
        citySuggestions.style.display = 'none';
        return;
    }

    const matches = popularCities.filter(city => 
        city.toLowerCase().includes(value)
    );

    if (matches.length === 0) {
        citySuggestions.style.display = 'none';
        return;
    }

    citySuggestions.innerHTML = matches
        .slice(0, 5)
        .map(city => `<div class="suggestion-item">${city}</div>`)
        .join('');
    
    citySuggestions.style.display = 'block';
});

citySuggestions.addEventListener('click', (e) => {
    if (e.target.classList.contains('suggestion-item')) {
        cityInput.value = e.target.textContent;
        citySuggestions.style.display = 'none';
    }
});

document.addEventListener('click', (e) => {
    if (!cityInput.contains(e.target) && !citySuggestions.contains(e.target)) {
        citySuggestions.style.display = 'none';
    }
});

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const city = cityInput.value.trim();
    const season = seasonSelect.value;
    
    if (!city || !season) return;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    results.style.display = 'none';
    
    // Show progressive loading messages
    results.style.display = 'block';
    // Set the location and season immediately so it's not empty
    document.getElementById('resultCity').textContent = city;
    document.getElementById('resultSeason').textContent = season;
    adviceContainer.innerHTML = '<div class="loading-status">🔍 Initializing fashion consultant...</div>';
    document.getElementById('outfitSection').style.display = 'none';
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Create EventSource for streaming
    let eventSource = null;
    let outfitImages = [];
    
    // Reset current style data for this request
    currentStyleData = { advice: null };
    
    try {
        // First, we need to get a session ID by initiating the request
        const response = await fetch('/api/style-advice-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ city, season })
        });
        
        // Check if response is SSE
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/event-stream')) {
            // We need to use EventSource with a different approach
            // Since EventSource doesn't support POST, we'll use the fetch response directly
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            let buffer = '';
            
            const processEvent = (data) => {
                try {
                    const event = JSON.parse(data);
                    
                    // Ignore keepalive messages - they're just to prevent timeout
                    if (event.status === 'keepalive') {
                        return;
                    }
                    
                    // Update loading status based on event
                    // Only update if we haven't displayed the advice yet
                    if ((event.status === 'starting' || event.status === 'searching' || 
                        event.status === 'processing') && !currentStyleData.advice) {
                        adviceContainer.innerHTML = `<div class="loading-status">${event.message}</div>`;
                    }
                    
                    // Don't overwrite advice with image generation messages
                    if ((event.status === 'generating_image' || event.status === 'image_failed') && 
                        currentStyleData.advice) {
                        // Update only the specific image placeholder, not the advice
                        const placeholders = document.querySelectorAll('.outfit-placeholder p');
                        if (placeholders[event.imageIndex]) {
                            placeholders[event.imageIndex].textContent = event.message.replace(/[🎨✅⚠️]/g, '').trim();
                        }
                        
                        // If image failed, update the placeholder to show error
                        if (event.status === 'image_failed') {
                            const cards = document.querySelectorAll('.outfit-image-card.placeholder');
                            if (cards[event.imageIndex]) {
                                cards[event.imageIndex].innerHTML = `
                                    <div class="outfit-placeholder">
                                        <p style="color: #999;">Unable to generate this outfit</p>
                                    </div>
                                `;
                            }
                        }
                    }
                    
                    // Handle advice completion - display immediately!
                    if (event.status === 'advice_complete') {
                        currentStyleData = {
                            advice: event.advice,
                            city: city,
                            season: season,
                            outfitImages: []
                        };
                        // Display the advice immediately
                        displayResults(currentStyleData);
                        
                        // Show placeholder for images
                        const outfitSection = document.getElementById('outfitSection');
                        outfitSection.innerHTML = `
                            <h3>Outfit Inspiration</h3>
                            <div class="outfit-images-grid">
                                <div class="outfit-image-card placeholder">
                                    <div class="outfit-placeholder">
                                        <div class="loading-spinner"></div>
                                        <p>Generating outfit 1...</p>
                                    </div>
                                </div>
                                <div class="outfit-image-card placeholder">
                                    <div class="outfit-placeholder">
                                        <div class="loading-spinner"></div>
                                        <p>Generating outfit 2...</p>
                                    </div>
                                </div>
                                <div class="outfit-image-card placeholder">
                                    <div class="outfit-placeholder">
                                        <div class="loading-spinner"></div>
                                        <p>Generating outfit 3...</p>
                                    </div>
                                </div>
                            </div>
                        `;
                        outfitSection.style.display = 'block';
                    }
                    
                    // Handle image completion - update specific image
                    if (event.status === 'image_complete' && event.imageUrl) {
                        console.log(`Received image_complete event for image ${event.imageIndex + 1}:`, event);
                        outfitImages.push({ url: event.imageUrl });
                        
                        // Update the specific image placeholder
                        const placeholders = document.querySelectorAll('.outfit-image-card.placeholder');
                        console.log(`Found ${placeholders.length} placeholders, updating index ${event.imageIndex}`);
                        if (placeholders[event.imageIndex]) {
                            placeholders[event.imageIndex].classList.remove('placeholder');
                            placeholders[event.imageIndex].innerHTML = `
                                <img src="${event.imageUrl}" alt="Outfit ${event.imageIndex + 1}" loading="lazy">
                                <p class="outfit-caption">${getOutfitCaption(event.imageIndex)}</p>
                            `;
                            console.log(`Successfully updated image placeholder ${event.imageIndex}`);
                        } else {
                            console.error(`Could not find placeholder for image index ${event.imageIndex}`);
                        }
                    }
                    
                    // Handle final completion
                    if (event.status === 'complete' && event.result) {
                        currentStyleData = event.result;
                        // Images are already displayed progressively, so we're done!
                    }
                    
                    // Handle errors
                    if (event.status === 'error') {
                        throw new Error(event.error || 'Failed to get style advice');
                    }
                } catch (e) {
                    console.error('Error processing event:', e);
                }
            };
            
            // Read the stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data.trim()) {
                            processEvent(data);
                        }
                    } else if (line.startsWith('event: close')) {
                        break;
                    }
                }
            }
        } else {
            // Fallback to regular response
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to get style advice');
            }
            currentStyleData = data;
            displayResults(data);
        }
        
    } catch (error) {
        console.error('Error:', error);
        
        // Check if it's a rate limit error
        if (error.message && error.message.includes('429')) {
            RateLimitHandler.showRateLimitError({ error: error.message });
        } else {
            alert(error.message || 'Failed to get style advice. Please try again.');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        if (eventSource) {
            eventSource.close();
        }
    }
});

// Display results
function displayResults(data) {
    document.getElementById('resultCity').textContent = data.city;
    document.getElementById('resultSeason').textContent = data.season;
    
    // Format the advice with proper HTML
    const formattedAdvice = formatAdvice(data.advice);
    adviceContainer.innerHTML = formattedAdvice;
    
    // Display outfit images if they were generated
    if (data.outfitImages && data.outfitImages.length > 0) {
        displayOutfitImages(data.outfitImages);
    }
    
    // Show results
    results.style.display = 'block';
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Display outfit images
function displayOutfitImages(images) {
    const outfitSection = document.getElementById('outfitSection');
    outfitSection.innerHTML = `
        <h3>Outfit Inspiration</h3>
        <div class="outfit-images-grid">
            ${images.map((img, index) => `
                <div class="outfit-image-card">
                    <img src="${img.url}" alt="Outfit ${index + 1}" loading="lazy">
                    <p class="outfit-caption">${getOutfitCaption(index)}</p>
                </div>
            `).join('')}
        </div>
    `;
    outfitSection.style.display = 'block';
}

// Get caption for outfit based on index
function getOutfitCaption(index) {
    const captions = [
        'Everyday Casual',
        'Smart Casual',
        'Active & Outdoors'
    ];
    return captions[index] || `Outfit ${index + 1}`;
}

// Format advice text into HTML using markdown
function formatAdvice(text) {
    // Configure marked options for better rendering
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
        pedantic: false,
        smartypants: false
    });
    
    // Clean up any formatting issues before parsing
    // Ensure headers have proper spacing
    text = text.replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2');
    // Remove any zero-width spaces or special characters that might interfere
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    // Parse markdown to HTML
    const html = marked.parse(text);
    
    // Wrap in a div with proper styling classes
    return `<div class="markdown-content">${html}</div>`;
}


// New search
newSearchBtn.addEventListener('click', () => {
    form.reset();
    results.style.display = 'none';
    document.getElementById('outfitSection').style.display = 'none';
    currentStyleData = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Provider switching
providerSwitch.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/providers');
        const data = await response.json();
        
        displayProviderModal(data);
    } catch (error) {
        console.error('Error fetching providers:', error);
    }
});

function displayProviderModal(data) {
    const providerList = document.getElementById('providerList');
    
    providerList.innerHTML = Object.entries(data.available).map(([key, provider]) => {
        const isSelected = key === data.current;
        return `
            <div class="provider-option ${isSelected ? 'selected' : ''}" data-provider="${key}">
                <div class="provider-name">${provider.name}</div>
                <div class="provider-description">${provider.description}</div>
                <small>Supports images: ${provider.supportsImages ? 'Yes' : 'No'}</small>
            </div>
        `;
    }).join('');
    
    providerModal.classList.add('show');
}

modalClose.addEventListener('click', () => {
    providerModal.classList.remove('show');
});

// Update current provider display
async function updateProviderDisplay() {
    try {
        const response = await fetch('/api/providers');
        const data = await response.json();
        
        const currentProvider = data.available[data.current];
        currentProviderSpan.textContent = currentProvider.name;
    } catch (error) {
        console.error('Error checking provider:', error);
    }
}

// Initialize
updateProviderDisplay();