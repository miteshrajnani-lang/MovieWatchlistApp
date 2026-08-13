/**
 * CYBER-DECK MOCK MOVIE DATABASE
 * Used in Demo Mode when no TMDB API key is provided, or as fallback sample data.
 */
const MOCK_MOVIES = [
    {
        id: 507086,
        title: "Blade Runner 2049",
        release_date: "2017-10-04",
        vote_average: 8.5,
        overview: "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who's been missing for thirty years in a dystopian futuristic Los Angeles.",
        poster_path: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80",
        backdrop_path: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
        genres: ["Sci-Fi", "Cyberpunk", "Mystery"]
    },
    {
        id: 603,
        title: "The Matrix",
        release_date: "1999-03-31",
        vote_average: 8.7,
        overview: "Set in the 22nd century, The Matrix tells the story of a computer hacker who learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
        poster_path: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
        backdrop_path: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80",
        genres: ["Action", "Sci-Fi", "Cyberpunk"]
    },
    {
        id: 1052454,
        title: "Cyberpunk: Edgerunners",
        release_date: "2022-09-13",
        vote_average: 8.9,
        overview: "A street kid trying to survive in a technology and body modification-obsessed city of the future. Having everything to lose, he chooses to stay alive by becoming an edgerunner: a mercenary outlaw.",
        poster_path: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80",
        backdrop_path: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
        genres: ["Animation", "Cyberpunk", "Action"]
    },
    {
        id: 157336,
        title: "Interstellar",
        release_date: "2014-11-05",
        vote_average: 8.6,
        overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
        poster_path: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
        backdrop_path: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80",
        genres: ["Sci-Fi", "Adventure", "Drama"]
    },
    {
        id: 27205,
        title: "Inception",
        release_date: "2010-07-15",
        vote_average: 8.4,
        overview: "Cobb, a skilled thief who steals valuable secrets from deep within the subconscious during the dream state, is offered a chance at redemption if he can pull off the impossible: inception.",
        poster_path: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
        backdrop_path: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
        genres: ["Action", "Sci-Fi", "Thriller"]
    },
    {
        id: 438631,
        title: "Dune: Part One",
        release_date: "2021-09-15",
        vote_average: 8.0,
        overview: "Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe to ensure the future of his family and his people.",
        poster_path: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80",
        backdrop_path: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80",
        genres: ["Sci-Fi", "Adventure"]
    },
    {
        id: 569094,
        title: "Spider-Man: Across the Spider-Verse",
        release_date: "2023-05-31",
        vote_average: 8.4,
        overview: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence. When the heroes clash, Miles must redefine what it means to be a hero.",
        poster_path: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80",
        backdrop_path: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
        genres: ["Animation", "Action", "Sci-Fi"]
    },
    {
        id: 149,
        title: "Akira",
        release_date: "1988-07-16",
        vote_average: 8.0,
        overview: "A secret military project endangers Neo-Tokyo when it turns a crazy biker gang member into a rampaging telekinetic psychopath who can only be stopped by a teenager and his gang of friends.",
        poster_path: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80",
        backdrop_path: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
        genres: ["Animation", "Cyberpunk", "Sci-Fi"]
    },
    {
        id: 129,
        title: "Spirited Away",
        release_date: "2001-07-20",
        vote_average: 8.5,
        overview: "A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had to free her family.",
        poster_path: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
        backdrop_path: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
        genres: ["Animation", "Fantasy", "Family"]
    },
    {
        id: 155,
        title: "The Dark Knight",
        release_date: "2008-07-16",
        vote_average: 8.5,
        overview: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
        poster_path: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
        backdrop_path: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1200&q=80",
        genres: ["Action", "Crime", "Drama"]
    }
];

// Pre-seeded initial watchlist sample items for first-time visitors
const INITIAL_WATCHLIST_SAMPLES = [
    {
        id: 507086,
        title: "Blade Runner 2049",
        release_date: "2017-10-04",
        vote_average: 8.5,
        overview: "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard...",
        poster_path: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80",
        genres: ["Sci-Fi", "Cyberpunk"],
        status: "Watching",
        personalRating: 5,
        notes: "Visually breathtaking cinematic masterpiece. Atmospheric synth soundtrack is unmatched!",
        dateAdded: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
        id: 603,
        title: "The Matrix",
        release_date: "1999-03-31",
        vote_average: 8.7,
        overview: "Set in the 22nd century, The Matrix tells the story of a computer hacker who learns from mysterious rebels...",
        poster_path: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
        genres: ["Action", "Cyberpunk"],
        status: "Completed",
        personalRating: 5,
        notes: "Timeless cyberpunk classic. Mind-bending plot and iconic action sequences.",
        dateAdded: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
        id: 1052454,
        title: "Cyberpunk: Edgerunners",
        release_date: "2022-09-13",
        vote_average: 8.9,
        overview: "A street kid trying to survive in a technology and body modification-obsessed city of the future...",
        poster_path: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80",
        genres: ["Animation", "Cyberpunk"],
        status: "Plan to Watch",
        personalRating: 0,
        notes: "Recommended by friends for its incredible Studio Trigger animation.",
        dateAdded: new Date().toISOString()
    }
];
