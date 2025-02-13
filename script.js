// DOM Elements - Cache all frequently used elements
const elements = {
    newsFeed: document.getElementById('newsFeed'),
    searchInput: document.getElementById('searchInput'),
    categoryFilter: document.getElementById('categoryFilter'),
    navLinks: document.querySelectorAll('.main-nav a'),
    currentYear: document.getElementById('currentYear'),
    bootAnimation: document.querySelector('.boot-animation'),
    header: document.querySelector('.main-header'),
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeToggle').querySelector('.material-icons-round')
};

// Performance optimization - Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Theme handling - Optimized
function setTheme(isDark) {
    requestAnimationFrame(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        elements.themeIcon.textContent = isDark ? 'dark_mode' : 'light_mode';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// Initialize theme
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme === 'dark');

// Optimized theme toggle
elements.themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'light';
    setTheme(isDark);
});

// NewsAPI configuration
const NEWS_API_KEY = 'da5b35d587f033e63bea8af794b12ec6';
const BASE_URL = 'https://gnews.io/api/v4';

// Add GitHub Pages specific configuration
const IS_GITHUB_PAGES = window.location.hostname.includes('github.io');
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

// Detect Safari browser
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Category specific search terms
const CATEGORY_QUERIES = {
    'ai-ml': 'artificial intelligence OR machine learning OR AI technology',
    'startups': '(tech startup OR technology company OR tech funding OR startup funding)',
    'innovations': '(tech innovation OR technology breakthrough OR new technology OR tech advancement)',
    'latest': 'technology news'
};

// Optimized scroll handling with better performance
let lastScrollY = window.scrollY;
let ticking = false;

function handleScroll() {
    lastScrollY = window.scrollY;
    if (!ticking) {
        window.requestAnimationFrame(() => {
            if (window.innerWidth <= 768) {
                const shouldHide = lastScrollY > 100 && lastScrollY > lastScrollPosition;
                elements.header.style.transform = shouldHide ? 'translateY(-100%)' : 'translateY(0)';
                elements.header.style.transition = 'transform 0.3s ease';
            } else {
                elements.header.style.transform = 'translateY(0)';
            }
            lastScrollPosition = lastScrollY;
            ticking = false;
        });
        ticking = true;
    }
}

let lastScrollPosition = 0;
window.addEventListener('scroll', handleScroll, { passive: true });
window.addEventListener('resize', handleScroll, { passive: true });

// Fetch news from API with timeout
async function fetchNews(category = '', query = '') {
    // Show loading state
    elements.newsFeed.innerHTML = `
        <div class="loading-placeholder">
            <div class="loading-indicator"></div>
            <p>Loading latest tech news...</p>
        </div>
    `;

    try {
        let searchQuery = query;
        
        // If no specific search query but category is selected
        if (!query && category) {
            searchQuery = CATEGORY_QUERIES[category] || 'technology';
        }

        // Construct the base URL with parameters
        const params = new URLSearchParams({
            token: NEWS_API_KEY,
            q: searchQuery || 'technology news',
            lang: 'en',
            max: '12',
            sortby: 'publishedAt',
            in: 'title,description'  // Search in both title and description
        });

        const apiUrl = `${BASE_URL}/search?${params}`;
        
        // Use different CORS handling for Safari on GitHub Pages
        let finalUrl = apiUrl;
        if (IS_GITHUB_PAGES) {
            finalUrl = isSafari ? 
                `${CORS_PROXY}${apiUrl}` : 
                `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
        }

        console.log('Fetching news from:', finalUrl);

        const response = await fetch(finalUrl, {
            headers: isSafari ? {
                'Origin': window.location.origin
            } : {}
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        if (!data.articles || data.articles.length === 0) {
            throw new Error('No articles found for the selected category.');
        }

        return data.articles.map(article => ({
            title: article.title,
            category: getCategoryLabel(category),
            summary: article.description,
            source: article.source.name,
            date: new Date(article.publishedAt).toLocaleDateString(),
            url: article.url,
            image: article.image || 'https://via.placeholder.com/400x200?text=No+Image+Available'
        }));
    } catch (error) {
        console.error('Error fetching news:', error);
        let errorMessage = error.message;
        let errorTip = '';

        if (!navigator.onLine) {
            errorMessage = 'No internet connection detected.';
            errorTip = 'Please check your internet connection and try again.';
        } else if (error.message.includes('403')) {
            errorMessage = 'API key is invalid or expired. Please check your Gnews API key.';
            errorTip = 'Make sure your API key is valid and not expired. You may need to register for a new key at gnews.io.';
        } else if (error.message.includes('429')) {
            errorMessage = 'Daily quota exceeded. Please try again tomorrow.';
            errorTip = 'You have reached the daily limit for news requests. The free tier allows 100 requests per day.';
        } else if (error.message.includes('No articles found')) {
            errorTip = 'Try broadening your search terms or selecting a different category.';
        } else {
            errorMessage = 'Failed to fetch news. Please try again.';
            errorTip = 'If the error persists, try refreshing the page or checking your internet connection.';
        }

        elements.newsFeed.innerHTML = `
            <div class="error-message">
                <p>😕 Unable to load news</p>
                <p class="error-details">${errorMessage}</p>
                <div class="error-actions">
                    <button onclick="retryFetch('${category}', '${query}')" class="retry-button">
                        Try Again
                    </button>
                    <p class="error-tip">${errorTip}</p>
                </div>
            </div>
        `;
        return [];
    }
}

// Get user-friendly category label
function getCategoryLabel(category) {
    const labels = {
        'ai-ml': 'AI & ML',
        'startups': 'Startups',
        'innovations': 'Innovations',
        'latest': 'Latest News'
    };
    return labels[category] || 'Tech News';
}

// Retry function
function retryFetch(category, query) {
    fetchAndDisplayNews(category, query);
}

// Fetch and display news with loading state handling
async function fetchAndDisplayNews(category, searchTerm = '') {
    try {
        const articles = await fetchNews(category, searchTerm);
        if (articles.length > 0) {
            displayNews(articles);
        }
    } catch (error) {
        console.error('Error displaying news:', error);
    }
}

// Initialize news feed on page load
document.addEventListener('DOMContentLoaded', () => {
    // Get the default category (latest)
    const defaultCategory = document.querySelector('.main-nav a.active').getAttribute('data-category');
    fetchAndDisplayNews(defaultCategory);

    // Add click event listeners to navigation links
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active class from all links
            elements.navLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            link.classList.add('active');
            // Fetch news for the selected category
            fetchAndDisplayNews(link.getAttribute('data-category'));
        });
    });
});

// Optimized news card creation
const createNewsCard = (() => {
    const template = document.createElement('template');
    
    return (article) => {
        template.innerHTML = `
            <article class="news-card">
                <div class="news-content">
                    ${article.image ? `<img loading="lazy" src="${article.image}" alt="${article.title}" class="news-image">` : ''}
                    <span class="category">${article.category}</span>
                    <h2><a href="${article.url}" target="_blank">${article.title}</a></h2>
                    <p>${article.summary || 'No description available'}</p>
                    <div class="news-meta">
                        <span>${article.source}</span>
                        <span>${article.date}</span>
                    </div>
                </div>
            </article>
        `;
        return template.content.firstElementChild.cloneNode(true);
    };
})();

// Optimized news display
function displayNews(articles) {
    const fragment = document.createDocumentFragment();
    if (articles.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No articles found';
        fragment.appendChild(noResults);
    } else {
        articles.forEach(article => {
            fragment.appendChild(createNewsCard(article));
        });
    }
    elements.newsFeed.innerHTML = '';
    elements.newsFeed.appendChild(fragment);
}

// Optimized search handling
const handleSearch = debounce(() => {
    const activeCategory = document.querySelector('.main-nav a.active').getAttribute('data-category');
    fetchAndDisplayNews(activeCategory, elements.searchInput.value);
}, 400);

elements.searchInput.addEventListener('input', handleSearch);

// Optimized boot animation
window.addEventListener('load', () => {
    setTimeout(() => {
        elements.bootAnimation.style.opacity = '0';
        setTimeout(() => {
            elements.bootAnimation.remove(); // Use remove instead of display none
        }, 300);
    }, 1500); // Reduced time
});

// Set current year
elements.currentYear.textContent = new Date().getFullYear();

// Rest of your existing code...