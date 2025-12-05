

/**
 * Object containing TMDB API endpoints for fetching movies and TV shows.
 * These paths are appended to the base URL defined in the tmdb axios instance.
 */
const requests = {
    fetchTrending: `/trending/all/week`,
    fetchRecommendations: `/recommendations`,
    fetchNetflixOriginals: `/discover/tv?with_networks=213`,
    fetchTopRated: `/movie/top_rated`,
    fetchActionMovies: `/discover/movie?with_genres=28`,
    fetchComedyMovies: `/discover/movie?with_genres=35`,
    fetchHorrorMovies: `/discover/movie?with_genres=27`,
    fetchRomanceMovies: `/discover/movie?with_genres=10749`,
    fetchDocumentaries: `/discover/movie?with_genres=99`,
    // Movies Page
    fetchTrendingMovies: `/trending/movie/week`,
    // Series Page
    fetchTrendingTV: `/trending/tv/week`,
    fetchTopRatedTV: `/tv/top_rated`,
    fetchActionTV: `/discover/tv?with_genres=10759`,
    fetchComedyTV: `/discover/tv?with_genres=35`,
    fetchCrimeTV: `/discover/tv?with_genres=80`,
    fetchDramaTV: `/discover/tv?with_genres=18`,
    fetchMysteryTV: `/discover/tv?with_genres=9648`,
    fetchMysteryTV: `/discover/tv?with_genres=9648`,
    fetchSciFiTV: `/discover/tv?with_genres=10765`,
    // Feeds
    fetchHomeFeed: `/feed/home`,
    fetchMoviesFeed: `/feed/movies`,
    fetchSeriesFeed: `/feed/series`,
};

export default requests;
