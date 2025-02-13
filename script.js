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

// Optimized scroll handling
let lastScrollY = window.scrollY;
const handleScroll = debounce(() => {
    requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        if (window.innerWidth <= 768) {
            elements.header.classList.toggle('header-hidden', 
                currentScrollY > lastScrollY && currentScrollY > 100);
        }
        lastScrollY = currentScrollY;
    });
}, 10);

window.addEventListener('scroll', handleScroll, { passive: true });

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

// NewsAPI configuration
const NEWS_API_KEY = '63813e5fa5964d109b55ec71994b39a6';
const BASE_URL = 'https://newsapi.org/v2';

// Category specific search terms
const CATEGORY_QUERIES = {
    'ai-ml': 'artificial intelligence OR machine learning OR AI OR ML',
    'startups': 'tech startup OR technology company',
    'innovations': 'technology innovation OR tech breakthrough',
    'latest': 'technology OR tech news'
};

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
        
        // Add cors-anywhere proxy for development
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const apiUrl = 'https://newsapi.org/v2/everything';
        
        const params = new URLSearchParams({
            apiKey: NEWS_API_KEY,
            language: 'en',
            pageSize: 20,
            q: searchQuery || 'technology news',
            sortBy: 'publishedAt'
        });

        const url = `${proxyUrl}${apiUrl}?${params.toString()}`;
        console.log('Fetching news from:', url);

        const response = await fetch(url, {
            headers: {
                'Origin': window.location.origin
            }
        });
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('API rate limit reached. Please try again later.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.status === 'error') {
            throw new Error(data.message || 'API Error occurred');
        }
        
        if (data.articles && data.articles.length > 0) {
            return data.articles.map(article => ({
                title: article.title,
                category: getCategoryLabel(category),
                summary: article.description,
                source: article.source.name,
                date: new Date(article.publishedAt).toLocaleDateString(),
                url: article.url,
                image: article.urlToImage || 'https://via.placeholder.com/400x200?text=No+Image'
            }));
        } else {
            throw new Error('No articles found for the selected category. Try a different search term.');
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        elements.newsFeed.innerHTML = `
            <div class="error-message">
                <p>😕 Unable to load news</p>
                <p class="error-details">${error.message}</p>
                <button onclick="retryFetch('${category}', '${query}')" class="retry-button">
                    Try Again
                </button>
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

// Rest of your existing code...