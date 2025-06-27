// Export TMDB constants
export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Enhanced cache with different durations for different types of data
const cache = new Map();
const CACHE_DURATIONS = {
  LIST: 30 * 60 * 1000,    // 30 minutes for list data
  DETAILS: 60 * 60 * 1000, // 60 minutes for detailed data
  IMAGES: 24 * 60 * 60 * 1000 // 24 hours for images
};

// Request queue with priority and rate limiting
const requestQueue = [];
let isProcessingQueue = false;
const MAX_CONCURRENT_REQUESTS = 2;
let activeRequests = 0;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 250; // Minimum time between requests in ms

// Process the request queue with rate limiting
const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const request = requestQueue.shift();
    activeRequests++;
    
    try {
      // Ensure minimum time between requests
      const timeSinceLastRequest = Date.now() - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }
      
      await request();
      lastRequestTime = Date.now();
    } catch (error) {
      console.error('Error processing queued request:', error);
    } finally {
      activeRequests--;
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  isProcessingQueue = false;
};

// Add a request to the queue with priority and rate limiting
const queueRequest = async (request, priority = false) => {
  return new Promise((resolve, reject) => {
    const wrappedRequest = async () => {
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    if (priority) {
      requestQueue.unshift(wrappedRequest);
    } else {
      requestQueue.push(wrappedRequest);
    }
    processQueue();
  });
};

// Enhanced cache management
const getCachedData = (key, type = 'LIST') => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATIONS[type]) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data, type = 'LIST') => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    type
  });
};

// Optimized fetch with better error handling and retries
export const fetchWithCache = async (url, options = {}, type = 'LIST') => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      if (!TMDB_API_KEY) {
        throw new Error('TMDB API key is not set');
      }

      const urlWithKey = url.includes('api_key=') ? url : `${url}${url.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`;
      const cacheKey = `${urlWithKey}-${JSON.stringify(options)}`;
      
      // Determine cache type based on URL
      const cacheType = url.includes('/movie/') || url.includes('/tv/') ? 'DETAILS' : 'LIST';
      const cachedData = getCachedData(cacheKey, cacheType);
      if (cachedData) {
        return cachedData;
      }

      // Ensure minimum time between requests
      const timeSinceLastRequest = Date.now() - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      }

      const response = await fetch(urlWithKey, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Resource not found, return null
          return null;
        }
        if ((response.status === 503 || response.status === 429) && attempt < MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.log(`Attempt ${attempt} failed with ${response.status}, retrying in ${delay}ms...`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data) throw new Error('Empty API response');

      setCachedData(cacheKey, data, cacheType);
      lastRequestTime = Date.now();
      return data;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
      await sleep(delay);
      return fetchWithRetry(url, attempt + 1);
    }
  };

  return fetchWithRetry(url);
};

// Batch fetch function for multiple requests with rate limiting
const batchFetch = async (requests) => {
  const results = [];
  for (const req of requests) {
    try {
      const result = await fetchWithCache(req.url, req.options);
      results.push(result);
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error in batch fetch:', error);
      results.push(null);
    }
  }
  return results;
};

// Helper function to transform movie data
export const transformMovieData = (movie) => {
  if (!movie) return null;
  
  // Get genre names from genre_ids if available
  const genreNames = movie.genre_ids ? movie.genre_ids.map(id => {
    const genreMap = {
      28: 'Action',
      12: 'Adventure',
      16: 'Animation',
      35: 'Comedy',
      80: 'Crime',
      99: 'Documentary',
      18: 'Drama',
      10751: 'Family',
      14: 'Fantasy',
      36: 'History',
      27: 'Horror',
      10402: 'Music',
      9648: 'Mystery',
      10749: 'Romance',
      878: 'Science Fiction',
      10770: 'TV Movie',
      53: 'Thriller',
      10752: 'War',
      37: 'Western'
    };
    return genreMap[id] || `Genre ${id}`;
  }) : [];

  return {
    id: movie.id,
    title: movie.title || movie.name,
    overview: movie.overview || '',
    poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${movie.poster_path}` : null,
    backdrop: movie.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${movie.backdrop_path}` : null,
    rating: movie.vote_average ? movie.vote_average.toFixed(1) : '0.0',
    year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
    duration: movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null,
    runtime: movie.runtime || 0,
    genres: genreNames,
    genre_ids: movie.genre_ids || [],
    type: movie.media_type || 'movie',
    trailer: null,
    releaseDate: movie.release_date || null,
    status: movie.status || 'Released',
    voteCount: movie.vote_count || 0,
    popularity: movie.popularity || 0,
    originalLanguage: movie.original_language || 'en',
    originalTitle: movie.original_title || movie.original_name || movie.title || movie.name,
    director: null,
    cast: null
  };
};

// Helper function to transform TV data
export const transformTVData = (tv) => {
  if (!tv) return null;
  
  // Get genre names from genre_ids if available
  const genreNames = tv.genre_ids ? tv.genre_ids.map(id => {
    const genreMap = {
      10759: 'Action & Adventure',
      16: 'Animation',
      35: 'Comedy',
      80: 'Crime',
      99: 'Documentary',
      18: 'Drama',
      10751: 'Family',
      10762: 'Kids',
      9648: 'Mystery',
      10763: 'News',
      10764: 'Reality',
      10765: 'Sci-Fi & Fantasy',
      10766: 'Soap',
      10767: 'Talk',
      10768: 'War & Politics',
      37: 'Western'
    };
    return genreMap[id] || `Genre ${id}`;
  }) : [];

  return {
    id: tv.id,
    title: tv.name,
    overview: tv.overview || '',
    poster: tv.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${tv.poster_path}` : null,
    backdrop: tv.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${tv.backdrop_path}` : null,
    rating: tv.vote_average ? tv.vote_average.toFixed(1) : '0.0',
    year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : null,
    duration: tv.episode_run_time?.[0] ? `${Math.floor(tv.episode_run_time[0] / 60)}h ${tv.episode_run_time[0] % 60}m` : null,
    genres: genreNames,
    genre_ids: tv.genre_ids || [],
    type: 'tv',
    trailer: null,
    network: tv.networks?.[0]?.name || null,
    networks: tv.networks?.map(network => ({
      id: network.id,
      name: network.name,
      logo_path: network.logo_path ? `${TMDB_IMAGE_BASE_URL}/w185${network.logo_path}` : null,
      origin_country: network.origin_country
    })) || [],
    seasons: tv.number_of_seasons || 0,
    episodes: tv.number_of_episodes || 0,
    status: tv.status || 'Unknown',
    lastAirDate: tv.last_air_date || null,
    nextEpisodeDate: tv.next_episode_to_air?.air_date || null,
    voteCount: tv.vote_count || 0,
    popularity: tv.popularity || 0,
    originalLanguage: tv.original_language || 'en',
    originalTitle: tv.original_name || tv.name,
    director: null,
    cast: null
  };
};

// Optimized fetch movies function
const fetchMovies = async (endpoint, page = 1) => {
  try {
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&page=${page}`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response');
    }
    
    return {
      movies: data.results.map(transformMovieData).filter(Boolean),
      totalPages: data.total_pages || 1,
      currentPage: data.page || 1,
      totalResults: data.total_results || 0
    };
  } catch (error) {
    console.error('Error fetching movies:', error);
    throw error;
  }
};

// Optimized getMovieDetails function
export const getMovieDetails = async (id, type = 'movie') => {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}/${endpoint}/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,similar,images&include_image_language=en,null`
    );

    if (!data) {
      return null; // Not found
    }

    const baseData = type === 'movie' ? transformMovieData(data) : transformTVData(data);
    if (!baseData) {
      throw new Error('Failed to transform data');
    }

    // Get the English logo
    const logo = data.images?.logos?.find(logo => logo.iso_639_1 === 'en') || data.images?.logos?.[0];
    const logoUrl = logo ? `${TMDB_IMAGE_BASE_URL}/w300${logo.file_path}` : null;

    // Get backdrop with appropriate size
    const backdrop = data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/w1280${data.backdrop_path}` : null;

    const trailer = data.videos?.results?.find(video => 
      video.type === 'Trailer' && video.site === 'YouTube'
    )?.key;

    const cast = data.credits?.cast?.slice(0, 6).map(person => ({
      name: person.name,
      character: person.character,
      image: person.profile_path ? `${TMDB_IMAGE_BASE_URL}/w185${person.profile_path}` : null
    })) || [];

    const director = data.credits?.crew?.find(person => person.job === 'Director')?.name;

    const similar = data.similar?.results?.slice(0, 6).map(item => 
      type === 'movie' ? transformMovieData(item) : transformTVData(item)
    ).filter(Boolean) || [];

    // Transform production companies
    const productionCompanies = data.production_companies?.map(company => ({
      id: company.id,
      name: company.name,
      logo_path: company.logo_path ? `${TMDB_IMAGE_BASE_URL}/w185${company.logo_path}` : null,
      origin_country: company.origin_country
    })) || [];

    // Transform spoken languages
    const spokenLanguages = data.spoken_languages?.map(lang => ({
      iso_639_1: lang.iso_639_1,
      name: lang.name,
      english_name: lang.english_name
    })) || [];

    // Transform genres
    const genres = data.genres?.map(genre => ({
      id: genre.id,
      name: genre.name
    })) || [];

    return {
      ...baseData,
      logo: logoUrl,
      backdrop,
      trailer,
      cast,
      director,
      similar,
      production_companies: productionCompanies,
      spoken_languages: spokenLanguages,
      genres,
      budget: data.budget,
      revenue: data.revenue,
      runtime: data.runtime,
      status: data.status,
      homepage: data.homepage,
      release_date: data.release_date || data.first_air_date,
      last_air_date: data.last_air_date,
      number_of_seasons: data.number_of_seasons,
      number_of_episodes: data.number_of_episodes,
      networks: data.networks?.map(network => ({
        id: network.id,
        name: network.name,
        logo_path: network.logo_path ? `${TMDB_IMAGE_BASE_URL}/w185${network.logo_path}` : null,
        origin_country: network.origin_country
      })) || [],
      created_by: data.created_by,
      episode_run_time: data.episode_run_time,
      next_episode_to_air: data.next_episode_to_air,
      seasons: data.seasons
    };
  } catch (error) {
    console.error('Error fetching movie details:', error);
    throw error;
  }
};

// Optimized getMovieCredits function
export const getMovieCredits = async (id, type = 'movie') => {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}/${endpoint}/${id}/credits?api_key=${TMDB_API_KEY}&language=en-US`
    );
    if (!data) return null; // Not found
    return data;
  } catch (error) {
    console.error('Error fetching credits:', error);
    throw error;
  }
};

// Optimized getMovieVideos function
export const getMovieVideos = async (id, type = 'movie') => {
  if (!id) return null;
  const url = `${TMDB_BASE_URL}/${type}/${id}/videos`;
  const data = await fetchWithCache(url, {}, 'DETAILS');
  if (!data) return null; // Not found
  return data;
};

// Optimized getSimilarMovies function
export const getSimilarMovies = async (id, type = 'movie', page = 1) => {
  if (!id) return null;
  const url = `${TMDB_BASE_URL}/${type}/${id}/recommendations?page=${page}`;
  const data = await fetchWithCache(url, {}, 'LIST');
  if (!data) return null; // Not found
  return data;
};

// Optimized getTrendingMovies function with better retry logic
export const getTrendingMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 503 && attempt < MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.log(`Attempt ${attempt} failed with 503, retrying in ${delay}ms...`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // First, get trending content with retry logic
    const trendingData = await fetchWithRetry(
      `${TMDB_BASE_URL}/trending/all/week?page=${page}&api_key=${TMDB_API_KEY}`
    );

    if (!trendingData?.results) {
      throw new Error('Invalid trending movies response');
    }

    // Use a Map to ensure uniqueness by ID
    const uniqueMoviesMap = new Map();

    // Transform trending content first
    trendingData.results.forEach(item => {
      if (!uniqueMoviesMap.has(item.id)) {
        const transformed = item.media_type === 'movie' 
          ? transformMovieData(item)
          : transformTVData(item);
        if (transformed) {
          uniqueMoviesMap.set(item.id, transformed);
        }
      }
    });

    // Convert Map to array
    const uniqueMovies = Array.from(uniqueMoviesMap.values());

    // Get initial set of movies (first 6)
    const initialMovies = uniqueMovies.slice(0, 6);
    const remainingMovies = uniqueMovies.slice(6);

    // Fetch details for initial movies with delay between requests
    const initialMoviesWithDetails = [];
    for (const movie of initialMovies) {
      try {
        const details = await getMovieDetails(movie.id, movie.type);
        initialMoviesWithDetails.push({
          ...movie,
          director: details.director,
          cast: details.cast?.slice(0, 3),
          genres: details.genres || movie.genres,
          duration: movie.type === 'movie' 
            ? details.runtime 
              ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
              : null
            : details.episode_run_time?.[0]
              ? `${Math.floor(details.episode_run_time[0] / 60)}h ${details.episode_run_time[0] % 60}m`
              : null,
          network: details.networks?.[0]?.name || null,
          seasons: details.number_of_seasons || null,
          episodes: details.number_of_episodes || null,
          status: details.status || null,
          nextEpisodeDate: details.next_episode_to_air?.air_date || null,
          logo: details.logo || movie.logo
        });
        // Add a small delay between requests
        await sleep(100);
      } catch (error) {
        console.error(`Error fetching details for ${movie.title}:`, error);
        initialMoviesWithDetails.push(movie);
      }
    }

    // Combine initial detailed movies with remaining basic movies
    const moviesWithDetails = [...initialMoviesWithDetails, ...remainingMovies];

    // Queue additional content requests with lower priority and longer delays
    const additionalContent = [
      { network: 'Netflix', id: 213 },
      { network: 'HBO', id: 49 },
      { network: 'Prime', id: 1024 },
      { network: 'Disney+', id: 2739 },
      { network: 'Apple TV+', id: 2552 },
      { network: 'Hulu', id: 453 }
    ];

    // Queue each network request with lower priority and increasing delays
    additionalContent.forEach(({ network, id }, index) => {
      queueRequest(async () => {
        try {
          // Add increasing delay based on index
          await sleep(200 * (index + 1));
          const data = await fetchWithRetry(
            `${TMDB_BASE_URL}/discover/tv?with_networks=${id}&sort_by=popularity.desc&page=${page}&api_key=${TMDB_API_KEY}`
          );
          
          if (data?.results) {
            const networkMovies = data.results
              .map(item => {
                if (!uniqueMoviesMap.has(item.id)) {
                  const transformed = transformTVData(item);
                  if (transformed) {
                    uniqueMoviesMap.set(item.id, transformed);
                    return transformed;
                  }
                }
                return null;
              })
              .filter(Boolean);

            moviesWithDetails.push(...networkMovies);
          }
        } catch (error) {
          console.error(`Error fetching ${network} content:`, error);
        }
      }, false);
    });

    return {
      movies: moviesWithDetails,
      totalPages: trendingData.total_pages || 1,
      currentPage: page,
      totalResults: moviesWithDetails.length
    };
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      error: error.message
    };
  }
};

export const getPopularMovies = async (page = 1) => {
  try {
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`
    );
    return {
      movies: data.results.map(transformMovieData),
      totalPages: data.total_pages
    };
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    throw error;
  }
};

export const getTopRatedMovies = async (page = 1) => {
  try {
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}`
    );
    return {
      movies: data.results.map(transformMovieData),
      totalPages: data.total_pages
    };
  } catch (error) {
    console.error('Error fetching top rated movies:', error);
    throw error;
  }
};

export const getUpcomingMovies = async (page = 1) => {
  try {
    // Fetch multiple pages to get more upcoming movies
    const pagesToFetch = 3; // Fetch 3 pages at once
    const allMovies = [];
    
    for (let i = 0; i < pagesToFetch; i++) {
      try {
        const response = await fetch(
          `${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&page=${page + i}`
        );
        
        if (!response.ok) {
          console.warn(`Failed to fetch page ${page + i}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (data?.results && Array.isArray(data.results)) {
          allMovies.push(...data.results);
        } else {
          console.warn(`Invalid data format for page ${page + i}`);
        }
      } catch (error) {
        console.warn(`Error fetching page ${page + i}:`, error);
        continue;
      }
    }
    
    // Filter out movies that have already been released
    const today = new Date();
    const upcomingMovies = allMovies.filter(movie => {
      if (!movie?.release_date) return false;
      const releaseDate = new Date(movie.release_date);
      return releaseDate > today;
    });

    // Sort by release date (closest to today first)
    upcomingMovies.sort((a, b) => {
      const dateA = new Date(a.release_date);
      const dateB = new Date(b.release_date);
      return dateA - dateB;
    });

    // Remove duplicates based on movie ID
    const uniqueMovies = upcomingMovies.filter((movie, index, self) =>
      index === self.findIndex((m) => m.id === movie.id)
    );

    // Transform the movies using the existing transformMovieData function
    const transformedMovies = uniqueMovies.map(movie => transformMovieData(movie)).filter(Boolean);

    return {
      movies: transformedMovies,
      totalPages: Math.ceil(uniqueMovies.length / 20), // Adjust total pages based on unique movies
      totalResults: uniqueMovies.length,
      currentPage: page
    };
  } catch (error) {
    console.error('Error fetching upcoming movies:', error);
    // Return a default response instead of throwing
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      error: error.message
    };
  }
};

// Get all movie genres
export const getGenres = async () => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
    );
    return await response.json();
  } catch (error) {
    console.error('Error fetching genres:', error);
    throw error;
  }
};

export const getMoviesByGenre = async (genreId, page = 1) => {
  try {
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`
    );

    // Get initial movies with basic info
    const initialMovies = data.results.map(transformMovieData).filter(Boolean);

    // Fetch details for the first 6 movies to get runtime
    const moviesWithDetails = await Promise.all(
      initialMovies.slice(0, 6).map(async (movie) => {
        try {
          const details = await getMovieDetails(movie.id, 'movie');
          return {
            ...movie,
            runtime: details.runtime || 0,
            duration: details.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : null
          };
        } catch (error) {
          console.error(`Error fetching details for movie ${movie.id}:`, error);
          return movie;
        }
      })
    );

    // Combine detailed movies with remaining basic movies
    const allMovies = [...moviesWithDetails, ...initialMovies.slice(6)];

    return {
      movies: allMovies,
      totalPages: data.total_pages
    };
  } catch (error) {
    console.error(`Error fetching movies for genre ${genreId}:`, error);
    throw error;
  }
};

export const getActionMovies = async (page = 1) => {
  return getMoviesByGenre(28, page); // Action genre ID
};

export const getComedyMovies = async (page = 1) => {
  return getMoviesByGenre(35, page); // Comedy genre ID
};

export const getDramaMovies = async (page = 1) => {
  return getMoviesByGenre(18, page); // Drama genre ID
};

export const getHorrorMovies = async (page = 1) => {
  return getMoviesByGenre(27, page); // Horror genre ID
};

export const getSciFiMovies = async (page = 1) => {
  return getMoviesByGenre(878, page); // Sci-Fi genre ID
};

export const getDocumentaryMovies = async (page = 1) => {
  return getMoviesByGenre(99, page); // Documentary genre ID
};

export const getFamilyMovies = async (page = 1) => {
  return getMoviesByGenre(10751, page); // Family genre ID
};

export const getAnimationMovies = async (page = 1) => {
  return getMoviesByGenre(16, page); // Animation genre ID
};

export const getAwardWinningMovies = async (page = 1) => {
  try {
    // Use fetchWithCache instead of direct fetch for better caching and error handling
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}/discover/movie?page=${page}&language=en-US&sort_by=vote_average.desc&vote_count.gte=1000&include_adult=true`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response for award winning movies');
    }

    // Transform the results using the existing transformMovieData function
    const movies = data.results
      .map(transformMovieData)
      .filter(Boolean); // Remove any null results

    return {
      movies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || 1,
      totalResults: data.total_results || movies.length
    };
  } catch (error) {
    console.error('Error fetching award winning movies:', error);
    // Return a default response instead of throwing
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      error: error.message
    };
  }
};

export const getLatestMovies = async (page = 1) => {
  try {
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&page=${page}&language=en-US`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response');
    }

    return {
      movies: data.results.map(transformMovieData).filter(Boolean),
      totalPages: data.total_pages || 1,
      currentPage: data.page || 1,
      totalResults: data.total_results || 0
    };
  } catch (error) {
    console.error('Error fetching latest movies:', error);
    // Return a default response instead of throwing
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      error: error.message
    };
  }
};

// Helper function to format runtime in minutes to hours and minutes
const formatRuntime = (minutes) => {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 
    ? `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`
    : `${remainingMinutes}m`;
};

// Get movies by category (popular, top_rated, upcoming)
export const getMoviesByCategory = async (category) => {
  try {
    // Ensure category is lowercase and properly formatted
    const formattedCategory = category.toLowerCase().replace(' ', '_');
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${formattedCategory}?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching movies by category:', error);
    throw error;
  }
};

// Discover movies with filters
export const discoverMovies = async ({ with_genres, primary_release_year, sort_by = 'popularity.desc' }) => {
  try {
    let url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=${sort_by}`;
    
    if (with_genres) {
      url += `&with_genres=${with_genres}`;
    }
    
    if (primary_release_year) {
      url += `&primary_release_year=${primary_release_year}`;
    }

    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error discovering movies:', error);
    throw error;
  }
};

// Search movies with retry logic and proper error handling
export const searchMovies = async (query, page = 1) => {
  const MAX_RETRIES = 5; // Increased retries
  const INITIAL_RETRY_DELAY = 2000; // Increased initial delay
  const MAX_RETRY_DELAY = 10000; // Increased max delay
  const RESULTS_PER_PAGE = 20;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // Resource not found, return null
          return null;
        }
        if ((response.status === 503 || response.status === 429) && attempt < MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.log(`Search attempt ${attempt} failed with ${response.status}, retrying in ${delay}ms...`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.results)) {
        throw new Error('Invalid response format');
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request timed out');
      }

      if (attempt < MAX_RETRIES) {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.log(`Search attempt ${attempt} failed: ${error.message}, retrying in ${delay}ms...`);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    if (!query || typeof query !== 'string') {
      return {
        results: [],
        page: 1,
        total_pages: 0,
        total_results: 0
      };
    }

    // First try multi search
    try {
      const multiResponse = await fetchWithRetry(
        `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=${page}&include_adult=true`
      );

      if (multiResponse && Array.isArray(multiResponse.results)) {
        const transformedResults = multiResponse.results
          .filter(item => item && (item.media_type === 'movie' || item.media_type === 'tv'))
          .map(item => {
            try {
              const transformed = item.media_type === 'movie' 
                ? transformMovieData(item)
                : transformTVData(item);

              return {
                ...transformed,
                type: item.media_type,
                image: item.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${item.poster_path}` : null,
                backdrop: item.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${item.backdrop_path}` : null,
                year: item.release_date || item.first_air_date 
                  ? new Date(item.release_date || item.first_air_date).getFullYear() 
                  : null,
                rating: item.vote_average || 0,
                title: item.title || item.name || 'Unknown Title',
                popularity: item.popularity || 0
              };
            } catch (error) {
              console.warn('Error transforming search result:', error);
              return null;
            }
          })
          .filter(Boolean);

        return {
          results: transformedResults,
          page: page,
          total_pages: multiResponse.total_pages || 1,
          total_results: multiResponse.total_results || transformedResults.length,
          has_more: page < (multiResponse.total_pages || 1)
        };
      }
    } catch (multiError) {
      console.warn('Multi search failed, falling back to separate searches:', multiError);
    }

    // Fallback to separate movie and TV searches
    const [movieResponse, tvResponse] = await Promise.all([
      fetchWithRetry(
        `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=${page}&include_adult=true`
      ).catch(error => {
        console.warn('Movie search failed:', error);
        return { results: [], total_results: 0 };
      }),
      fetchWithRetry(
        `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=${page}&include_adult=true`
      ).catch(error => {
        console.warn('TV search failed:', error);
        return { results: [], total_results: 0 };
      })
    ]);

    // Combine and sort results
    const allResults = [
      ...(movieResponse?.results || []).map(item => ({ ...item, media_type: 'movie' })),
      ...(tvResponse?.results || []).map(item => ({ ...item, media_type: 'tv' }))
    ].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    const transformedResults = allResults
      .filter(item => item && (item.media_type === 'movie' || item.media_type === 'tv'))
      .map(item => {
        try {
          const transformed = item.media_type === 'movie' 
            ? transformMovieData(item)
            : transformTVData(item);

          return {
            ...transformed,
            type: item.media_type,
            image: item.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${item.poster_path}` : null,
            backdrop: item.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${item.backdrop_path}` : null,
            year: item.release_date || item.first_air_date 
              ? new Date(item.release_date || item.first_air_date).getFullYear() 
              : null,
            rating: item.vote_average || 0,
            title: item.title || item.name || 'Unknown Title',
            popularity: item.popularity || 0
          };
        } catch (error) {
          console.warn('Error transforming search result:', error);
          return null;
        }
      })
      .filter(Boolean);

    const totalMovieResults = movieResponse?.total_results || 0;
    const totalTVResults = tvResponse?.total_results || 0;
    const totalResults = totalMovieResults + totalTVResults;
    const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);

    return {
      results: transformedResults,
      page: page,
      total_pages: totalPages,
      total_results: totalResults,
      has_more: page < totalPages
    };
  } catch (error) {
    console.error('Error searching movies:', error);
    return {
      results: [],
      page: page,
      total_pages: 0,
      total_results: 0,
      error: error.message
    };
  }
};

export const getAiringTodayTVShows = async (page = 1) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/airing_today?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
    );
    const data = await response.json();
    return {
      movies: data.results.map(transformTVData),
      totalPages: data.total_pages,
      currentPage: data.page
    };
  } catch (error) {
    console.error('Error fetching airing today TV shows:', error);
    throw error;
  }
};

export const getNowPlayingMovies = async (page = 1) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
    );
    const data = await response.json();
    return {
      movies: data.results.map(transformMovieData),
      totalPages: data.total_pages,
      currentPage: data.page
    };
  } catch (error) {
    console.error('Error fetching now playing movies:', error);
    throw error;
  }
};

export const getPopularTVShows = async (page = 1) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
    );
    const data = await response.json();
    return {
      movies: data.results.map(transformTVData),
      totalPages: data.total_pages,
      currentPage: data.page
    };
  } catch (error) {
    console.error('Error fetching popular TV shows:', error);
    throw error;
  }
};

export const getTopRatedTVShows = async (page = 1) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
    );
    const data = await response.json();
    return {
      movies: data.results.map(transformTVData),
      totalPages: data.total_pages,
      currentPage: data.page
    };
  } catch (error) {
    console.error('Error fetching top rated TV shows:', error);
    throw error;
  }
};

export const getNetflixOriginals = async (page = 1) => {
  try {
    const response = await fetchWithCache(
      `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_networks=213&page=${page}`
    );
    return {
      movies: response.results.map(transformTVData),
      totalPages: response.total_pages,
      currentPage: response.page
    };
  } catch (error) {
    console.error('Error fetching Netflix originals:', error);
    throw error;
  }
};

export const getNetflixOriginalsByGenre = async (genreId, page = 1) => {
  try {
    const response = await fetchWithCache(
      `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_networks=213&with_genres=${genreId}&page=${page}`
    );
    return {
      movies: response.results.map(transformTVData),
      totalPages: response.total_pages,
      currentPage: response.page
    };
  } catch (error) {
    console.error('Error fetching Netflix originals by genre:', error);
    throw error;
  }
};

// Get movies by year
export const getMoviesByYear = async (year, page = 1) => {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const url = `${TMDB_BASE_URL}/discover/movie?primary_release_date.gte=${startDate}&primary_release_date.lte=${endDate}&page=${page}&sort_by=popularity.desc`;
  const data = await fetchWithCache(url);
  return {
    ...data,
    results: data.results.map(transformMovieData)
  };
};

// Get movies by streaming service (e.g., Netflix)
export const getNetflixMovies = async (page = 1) => {
  const url = `${TMDB_BASE_URL}/discover/movie?with_watch_providers=8&watch_region=US&page=${page}&sort_by=popularity.desc`;
  const data = await fetchWithCache(url);
  return {
    ...data,
    results: data.results.map(transformMovieData)
  };
};

// Get Netflix movies by genre
export const getNetflixMoviesByGenre = async (genreId, page = 1) => {
  const url = `${TMDB_BASE_URL}/discover/movie?with_watch_providers=8&watch_region=US&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`;
  const data = await fetchWithCache(url);
  return {
    ...data,
    results: data.results.map(transformMovieData)
  };
};

// TV Series API functions
export const getPopularTV = async (page = 1) => {
  try {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY;
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}&page=${page}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching popular TV series:', error);
    throw error;
  }
};

export const getTopRatedTV = async (page = 1) => {
  try {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY;
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/top_rated?api_key=${apiKey}&page=${page}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching top rated TV series:', error);
    throw error;
  }
};

export const getAiringTodayTV = async (page = 1) => {
  try {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY;
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/airing_today?api_key=${apiKey}&page=${page}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching airing today TV series:', error);
    throw error;
  }
};

export const getTVSeriesByNetwork = async (networkId) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_networks=${networkId}&language=en-US&sort_by=popularity.desc&page=1`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching TV series by network:', error);
    throw error;
  }
};
