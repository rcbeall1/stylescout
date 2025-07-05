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
    adviceContainer.innerHTML = '<div class="loading-status">🔍 Searching for current weather in ' + city + '...</div>';
    document.getElementById('outfitSection').style.display = 'none';
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Progressive status updates with more steps
    const loadingSteps = [
        { delay: 2000, icon: '🛍️', text: 'Finding trending stores and boutiques in ' + city + '...' },
        { delay: 3500, icon: '📍', text: 'Checking local Instagram fashion accounts...' },
        { delay: 5000, icon: '👗', text: 'Analyzing current fashion trends for ' + season + '...' },
        { delay: 6500, icon: '🌡️', text: 'Reviewing weather patterns and humidity levels...' },
        { delay: 8000, icon: '💰', text: 'Researching local price ranges and deals...' },
        { delay: 9500, icon: '✨', text: 'Creating your personalized style guide...' },
        { delay: 11000, icon: '🎨', text: 'Generating outfit inspirations...' },
        { delay: 13000, icon: '📝', text: 'Finalizing recommendations...' }
    ];
    
    // Store timeouts so we can cancel them if response comes early
    const timeouts = [];
    
    loadingSteps.forEach(step => {
        const timeout = setTimeout(() => {
            const currentStatus = document.querySelector('.loading-status');
            if (currentStatus) {
                adviceContainer.innerHTML = '<div class="loading-status">' + step.icon + ' ' + step.text + '</div>';
            }
        }, step.delay);
        timeouts.push(timeout);
    });
    
    // Add a cycling dots animation after the last step
    setTimeout(() => {
        const currentStatus = document.querySelector('.loading-status');
        if (currentStatus) {
            let dots = 0;
            const dotInterval = setInterval(() => {
                if (document.querySelector('.loading-status')) {
                    dots = (dots + 1) % 4;
                    const dotText = '.'.repeat(dots);
                    const baseText = currentStatus.textContent.replace(/\.+$/, '');
                    currentStatus.textContent = baseText + dotText;
                } else {
                    clearInterval(dotInterval);
                }
            }, 500);
        }
    }, 14000);
    
    try {
        const response = await fetch('/api/style-advice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ city, season })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get style advice');
        }
        
        // Store current data
        currentStyleData = data;
        
        // Display results
        displayResults(data);
        
    } catch (error) {
        console.error('Error:', error);
        
        // Check if it's a rate limit error
        if (response && response.status === 429) {
            const errorData = await response.json();
            RateLimitHandler.showRateLimitError(errorData);
        } else {
            alert(error.message || 'Failed to get style advice. Please try again.');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
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