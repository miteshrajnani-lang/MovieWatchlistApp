// ==========================================================================
// CONFIGURATION & CONSTANTS MODULE
// ==========================================================================

const CONFIG = {
    DEFAULT_API_KEY: '7f631300a2ef07bafe2c64d6214f99c2',
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE_W500: 'https://image.tmdb.org/t/p/w500',
    IMAGE_BASE_W1280: 'https://image.tmdb.org/t/p/w1280',
    FALLBACK_POSTER: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
    DEFAULT_DISCOVER_TITLE: 'Popular & Trending Selection'
};

const STORAGE_KEYS = {
    USERS_DB: 'cyber_users_db',
    CURRENT_USER: 'cyber_current_user',
    WATCHLIST: 'cyber_watchlist',
    API_KEY: 'cyber_tmdb_api_key'
};

const TMDB_GENRES = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western"
};

const FILTER_OPTIONS = {
    GENRES: ['ALL', 'Sci-Fi', 'Action', 'Animation', 'Drama', 'Adventure', 'Thriller', 'Comedy', 'Horror', 'Romance'],
    RATINGS: [
        { val: 0, label: 'Any' },
        { val: 6, label: '6+' },
        { val: 7, label: '7+' },
        { val: 7.5, label: '7.5+' },
        { val: 8, label: '8+' },
        { val: 9, label: '9+' }
    ],
    DECADES: ['ALL', '2020s', '2010s', '2000s', '1990s', 'Older'],
    SORTS: [
        { value: 'default', label: '<i class="fa-solid fa-fire-flame-curved"></i> Popular' },
        { value: 'rating', label: '<i class="fa-solid fa-star"></i> Top Rated' },
        { value: 'newest', label: '<i class="fa-solid fa-calendar-days"></i> Newest' },
        { value: 'oldest', label: '<i class="fa-regular fa-calendar"></i> Oldest' },
        { value: 'title', label: '<i class="fa-solid fa-arrow-down-a-z"></i> A – Z' }
    ]
};

// Global Exposure for full backward compatibility
window.CONFIG = CONFIG;
window.STORAGE_KEYS = STORAGE_KEYS;
window.TMDB_GENRES = TMDB_GENRES;
window.FILTER_OPTIONS = FILTER_OPTIONS;

