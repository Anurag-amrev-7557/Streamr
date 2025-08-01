// Enhanced Similar Content Service with Intelligent Recommendations
import advancedCache from './advancedCacheService.js';

// Import genre mapping from tmdbService
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
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics'
};

// Helper function to get genre names from IDs
const getGenreNames = (genreIds) => {
  if (!genreIds || !Array.isArray(genreIds)) return [];
  return genreIds
    .map(id => genreMap[id] || `Unknown Genre (${id})`)
    .filter(Boolean);
};

class EnhancedSimilarContentService {
  constructor() {
    this.cache = advancedCache;
    this.relevanceWeights = {
      genre: 0.50, // Increased genre weight for better relevance
      cast: 0.20,  // Reduced cast weight
      crew: 0.15,  // Kept crew weight
      year: 0.10,  // Kept year weight
      rating: 0.03, // Reduced rating weight to avoid generic popular content
      popularity: 0.02 // Reduced popularity weight to avoid generic popular content
    };
    this.minRelevanceScore = 0.3;
    // Removed maxResults limit to support infinite loading
  }

  // Calculate similarity score between two content items
  calculateSimilarityScore(item1, item2) {
    let score = 0;
    
    // Genre similarity (weighted by importance)
    if (item1.genres && item2.genres) {
      const genreOverlap = this.calculateGenreOverlap(item1.genres, item2.genres);
      score += genreOverlap * this.relevanceWeights.genre;
    }
    
    // Cast similarity
    if (item1.cast && item2.cast) {
      const castOverlap = this.calculateCastOverlap(item1.cast, item2.cast);
      score += castOverlap * this.relevanceWeights.cast;
    }
    
    // Crew similarity (director, writer, etc.)
    if (item1.crew && item2.crew) {
      const crewOverlap = this.calculateCrewOverlap(item1.crew, item2.crew);
      score += crewOverlap * this.relevanceWeights.crew;
    }
    
    // Year similarity (closer years get higher scores)
    if (item1.year && item2.year) {
      const yearDiff = Math.abs(item1.year - item2.year);
      const yearScore = Math.max(0, 1 - (yearDiff / 20)); // Decay over 20 years
      score += yearScore * this.relevanceWeights.year;
    }
    
    // Rating similarity
    if (item1.vote_average && item2.vote_average) {
      const ratingDiff = Math.abs(item1.vote_average - item2.vote_average);
      const ratingScore = Math.max(0, 1 - (ratingDiff / 5)); // Decay over 5 rating points
      score += ratingScore * this.relevanceWeights.rating;
    }
    
    // Popularity similarity
    if (item1.popularity && item2.popularity) {
      const popularityDiff = Math.abs(item1.popularity - item2.popularity);
      const popularityScore = Math.max(0, 1 - (popularityDiff / 100));
      score += popularityScore * this.relevanceWeights.popularity;
    }
    
    return Math.min(1, Math.max(0, score));
  }

  // Calculate genre overlap
  calculateGenreOverlap(genres1, genres2) {
    if (!genres1 || !genres2) return 0;
    
    const genreIds1 = new Set(genres1.map(g => typeof g === 'object' ? g.id : g));
    const genreIds2 = new Set(genres2.map(g => typeof g === 'object' ? g.id : g));
    
    const intersection = new Set([...genreIds1].filter(x => genreIds2.has(x)));
    const union = new Set([...genreIds1, ...genreIds2]);
    
    return intersection.size / union.size;
  }

  // Calculate cast overlap
  calculateCastOverlap(cast1, cast2) {
    if (!cast1 || !cast2) return 0;
    
    const castIds1 = new Set(cast1.slice(0, 10).map(c => c.id));
    const castIds2 = new Set(cast2.slice(0, 10).map(c => c.id));
    
    const intersection = new Set([...castIds1].filter(x => castIds2.has(x)));
    const union = new Set([...castIds1, ...castIds2]);
    
    return intersection.size / union.size;
  }

  // Calculate crew overlap
  calculateCrewOverlap(crew1, crew2) {
    if (!crew1 || !crew2) return 0;
    
    const director1 = crew1.find(c => c.job === 'Director')?.id;
    const director2 = crew2.find(c => c.job === 'Director')?.id;
    
    const writer1 = crew1.find(c => c.job === 'Writer')?.id;
    const writer2 = crew2.find(c => c.job === 'Writer')?.id;
    
    let score = 0;
    if (director1 && director2 && director1 === director2) score += 0.5;
    if (writer1 && writer2 && writer1 === writer2) score += 0.3;
    
    return Math.min(1, score);
  }

  // Enhanced similar content fetching with infinite loading support
  async getEnhancedSimilarContent(contentId, contentType = 'movie', options = {}) {
    const {
      limit = 200, // Increased default limit for faster loading
      minScore = 0.2, // Increased threshold for better relevance
      includeDetails = true,
      forceRefresh = false,
      page = 1, // Support for pagination
      infiniteLoading = false // New flag for infinite loading
    } = options;

    const cacheKey = `enhanced_similar_${contentType}_${contentId}_${page}`;
    
    // Check cache first (but not for infinite loading to ensure fresh content)
    if (!forceRefresh && !infiniteLoading) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached.slice(0, limit);
      }
    }

    try {
      // Validate API key
      if (!import.meta.env.VITE_TMDB_API_KEY) {
        if (import.meta.env.DEV) {
          console.debug('TMDB API key not found');
        }
        return [];
      }

      // Use a more focused approach to get actual similar content
      let allResults = [];
      
      // For infinite loading, fetch from more sources in parallel
      const fetchPromises = [];
      
      // Start with recommendations (most reliable for actual similar content)
      fetchPromises.push(
        this.fetchRecommendations(contentId, contentType, page).catch(error => {
          if (import.meta.env.DEV) {
            console.debug('Failed to fetch recommendations:', error);
          }
          return [];
        })
      );

      // Add similar content (also reliable for actual similar content)
      fetchPromises.push(
        this.fetchSimilar(contentId, contentType, page).catch(error => {
          if (import.meta.env.DEV) {
            console.debug('Failed to fetch similar content:', error);
          }
          return [];
        })
      );

      // Add genre-based content (more focused on actual similarity)
      fetchPromises.push(
        this.fetchGenreBased(contentId, contentType, page).catch(error => {
          if (import.meta.env.DEV) {
            console.debug('Failed to fetch genre-based content:', error);
          }
          return [];
        })
      );

      // Only add trending/popular content for infinite loading to avoid generic results
      if (infiniteLoading && page > 1) {
        // Add trending content for variety (but with lower priority)
        fetchPromises.push(
          this.fetchTrendingContent(contentType, page).catch(error => {
            if (import.meta.env.DEV) {
              console.debug('Failed to fetch trending content:', error);
            }
            return [];
          })
        );

        // Add popular content for more variety (but with lower priority)
        fetchPromises.push(
          this.fetchPopularContent(contentType, page).catch(error => {
            if (import.meta.env.DEV) {
              console.debug('Failed to fetch popular content:', error);
            }
            return [];
          })
        );

        // Add top rated content (but with lower priority)
        fetchPromises.push(
          this.fetchTopRatedContent(contentType, page).catch(error => {
            if (import.meta.env.DEV) {
              console.debug('Failed to fetch top rated content:', error);
            }
            return [];
          })
        );

        // Add upcoming content (but with lower priority)
        fetchPromises.push(
          this.fetchUpcomingContent(contentType, page).catch(error => {
            if (import.meta.env.DEV) {
              console.debug('Failed to fetch upcoming content:', error);
            }
            return [];
          })
        );

        // Add now playing content (but with lower priority)
        fetchPromises.push(
          this.fetchNowPlayingContent(contentType, page).catch(error => {
            if (import.meta.env.DEV) {
              console.debug('Failed to fetch now playing content:', error);
            }
            return [];
          })
        );
      }

      // Execute all fetch promises in parallel for faster loading
      const results = await Promise.all(fetchPromises);
      
      // Combine all results and remove duplicates
      const existingIds = new Set();
      results.forEach(resultArray => {
        if (Array.isArray(resultArray)) {
          resultArray.forEach(item => {
            if (item && item.id && !existingIds.has(item.id)) {
              existingIds.add(item.id);
              allResults.push(item);
            }
          });
        }
      });

      // If no results from any source, return empty array
      if (allResults.length === 0) {
        if (import.meta.env.DEV) {
          console.debug('No enhanced similar content found, returning empty array');
        }
        return [];
      }

      // For infinite loading, don't limit the number of items to process
      const limitedResults = infiniteLoading ? allResults : allResults.slice(0, 30); // Increased from 20 to 30

      // Get detailed information for scoring (with rate limiting)
      const detailedResults = await this.getDetailedContent(limitedResults, contentType);
      
      // Get the original content details for comparison
      const originalContentDetails = await this.getOriginalContentDetails(contentId, contentType);
      
      // Calculate similarity scores by comparing with the original content
      const scoredResults = detailedResults.map(item => {
        let similarityScore = 0;
        
        if (originalContentDetails) {
          similarityScore = this.calculateSimilarityScore(originalContentDetails, item);
        } else {
          // Fallback scoring if we can't get original details
          similarityScore = item.vote_average ? item.vote_average / 10 : 0.1;
        }
        
        return {
          ...item,
          similarityScore: Math.min(1, Math.max(0, similarityScore))
        };
      });

      // Filter and sort by relevance with higher minimum score for better quality
      let filteredResults = scoredResults
        .filter(item => item.similarityScore >= minScore)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, infiniteLoading ? allResults.length : limit);
      
      // If we don't have enough results, include some lower-scored items
      if (filteredResults.length < 8 && scoredResults.length > 0) {
        const additionalResults = scoredResults
          .filter(item => item.similarityScore >= minScore * 0.5) // Lower threshold for fallback
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .slice(0, 8 - filteredResults.length);
        
        filteredResults = [...filteredResults, ...additionalResults];
      }

      // Cache the results (but not for infinite loading to ensure fresh content)
      if (!infiniteLoading) {
        this.cache.set(cacheKey, filteredResults, {
          ttl: 30 * 60 * 1000, // 30 minutes
          priority: 'high',
          namespace: 'similar_content'
        });
      }

      // Debug log to verify different content for different movies
      if (import.meta.env.DEV) {
        console.log(`[EnhancedSimilarContentService] Returning ${filteredResults.length} similar items for ${contentType} ${contentId} (page ${page}):`, 
          filteredResults.slice(0, 3).map(item => ({ 
            id: item.id, 
            title: item.title || item.name, 
            score: item.similarityScore,
            genres: item.genres?.slice(0, 2).map(g => g.name || g) || []
          }))
        );
        
        if (originalContentDetails) {
          console.log(`[EnhancedSimilarContentService] Original content:`, {
            id: originalContentDetails.id,
            title: originalContentDetails.title,
            genres: originalContentDetails.genres?.slice(0, 3).map(g => g.name || g) || []
          });
        }
      }

      return filteredResults;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('Error fetching enhanced similar content:', error);
      }
      return [];
    }
  }

  // Fetch recommendations from TMDB
  async fetchRecommendations(contentId, contentType, page) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/${contentId}/recommendations?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit for recommendations');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('Error fetching recommendations:', error);
      }
      return [];
    }
  }

  // Fetch similar content from TMDB
  async fetchSimilar(contentId, contentType, page) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/${contentId}/similar?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit for similar content');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('Error fetching similar content:', error);
      }
      return [];
    }
  }

  // Fetch genre-based content
  async fetchGenreBased(contentId, contentType, page) {
    try {
      // First get the content details to extract genres
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/${contentId}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&append_to_response=credits`
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit for genre-based content');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentDetails = await response.json();
      
      if (!contentDetails.genres || contentDetails.genres.length === 0) {
        return [];
      }

      // Get multiple genres for better relevance
      const genreIds = contentDetails.genres.slice(0, 3).map(g => g.id);
      
      // Add delay before second request
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch content by genres, sorted by vote average for better quality
      const genreResponse = await fetch(
        `https://api.themoviedb.org/3/discover/${contentType}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&sort_by=vote_average.desc&with_genres=${genreIds.join(',')}&vote_count.gte=100&page=${page}`
      );
      
      if (!genreResponse.ok) {
        if (genreResponse.status === 429) {
          console.warn('Rate limit hit for genre discovery');
          return [];
        }
        throw new Error(`HTTP ${genreResponse.status}: ${genreResponse.statusText}`);
      }
      
      const genreData = await genreResponse.json();
      
      return genreData.results || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('Error fetching genre-based content:', error);
      }
      return [];
    }
  }

  // Fetch trending content
  async fetchTrendingContent(contentType, page) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/trending/${contentType}/week?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit for trending content');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('Error fetching trending content:', error);
      }
      return [];
    }
  }

  // Fetch popular content
  async fetchPopularContent(contentType, page) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/popular?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit for popular content');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('Error fetching popular content:', error);
      }
      return [];
    }
  }

  // Fetch top rated content
  async fetchTopRatedContent(contentType, page) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/top_rated?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`
      );
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit for top rated content');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('Error fetching top rated content:', error);
      }
      return [];
    }
  }

  // Fetch upcoming content
  async fetchUpcomingContent(contentType, page) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/upcoming?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`
      );
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit for upcoming content');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('Error fetching upcoming content:', error);
      }
      return [];
    }
  }

  // Fetch now playing content
  async fetchNowPlayingContent(contentType, page) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/now_playing?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`
      );
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit for now playing content');
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('Error fetching now playing content:', error);
      }
      return [];
    }
  }

  // Get original content details for comparison
  async getOriginalContentDetails(contentId, contentType) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/${contentId}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&append_to_response=credits`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract year from release date
      const year = data.release_date ? new Date(data.release_date).getFullYear() : 
                   data.first_air_date ? new Date(data.first_air_date).getFullYear() : null;
      
      return {
        id: data.id,
        title: data.title || data.name,
        genres: data.genres || [],
        year: year,
        vote_average: data.vote_average,
        popularity: data.popularity,
        cast: data.credits?.cast || [],
        crew: data.credits?.crew || [],
        overview: data.overview,
        original_language: data.original_language
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('Error fetching original content details:', error);
      }
      return null;
    }
  }

  // Get detailed content information with rate limiting
  async getDetailedContent(contentList, contentType) {
    // For infinite loading, limit the number of detailed requests to avoid rate limiting
    const limitedList = contentList.slice(0, 12); // Increased from 8 to 12 for more content
    
    const detailedPromises = limitedList.map(async (item, index) => {
      try {
        // Add delay between requests to respect rate limits (reduced delay for faster loading)
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 200ms to 100ms
        }
        
        const response = await fetch(
          `https://api.themoviedb.org/3/${contentType}/${item.id}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&append_to_response=credits`
        );
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('Rate limit hit, skipping detailed fetch for item:', item.id);
            return item;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const details = await response.json();
        
        return {
          ...item,
          genres: details.genres || [],
          cast: details.credits?.cast || [],
          crew: details.credits?.crew || [],
          year: new Date(item.release_date || item.first_air_date).getFullYear(),
          vote_average: item.vote_average,
          popularity: item.popularity
        };
      } catch (error) {
        console.error(`Error fetching details for ${item.id}:`, error);
        return item;
      }
    });

    const detailedResults = await Promise.all(detailedPromises);
    
    // Add remaining items without detailed info (increased for more content)
    const remainingItems = contentList.slice(12).map(item => ({
      ...item,
      genres: item.genre_ids ? item.genre_ids.map(id => ({ 
        id, 
        name: genreMap[id] || `Unknown Genre (${id})` 
      })) : [],
      cast: [],
      crew: [],
      year: new Date(item.release_date || item.first_air_date).getFullYear(),
      vote_average: item.vote_average,
      popularity: item.popularity
    }));
    
    return [...detailedResults, ...remainingItems];
  }

  // Get personalized recommendations based on user behavior
  async getPersonalizedRecommendations(userId, contentType = 'movie', options = {}) {
    const {
      limit = 50,
      includeWatchHistory = true,
      includePreferences = true,
      strategy = 'hybrid' // 'hybrid', 'collaborative', 'content-based', 'mood-based'
    } = options;

    try {
      let recommendations = [];
      
      switch (strategy) {
        case 'collaborative':
          recommendations = await this.getCollaborativeRecommendations(userId, contentType, limit);
          break;
        case 'content-based':
          recommendations = await this.getContentBasedRecommendations(userId, contentType, limit);
          break;
        case 'mood-based':
          recommendations = await this.getMoodBasedRecommendations('excited', contentType, { limit });
          break;
        case 'hybrid':
        default:
          recommendations = await this.getHybridRecommendations(userId, contentType, limit);
          break;
      }
      
      return recommendations;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  // Hybrid recommendation system combining multiple strategies
  async getHybridRecommendations(userId, contentType = 'movie', limit = 50) {
    const recommendations = [];
    
    // Get recommendations from multiple sources
    const [collaborative, contentBased, moodBased] = await Promise.allSettled([
      this.getCollaborativeRecommendations(userId, contentType, Math.ceil(limit / 3)),
      this.getContentBasedRecommendations(userId, contentType, Math.ceil(limit / 3)),
      this.getMoodBasedRecommendations('excited', contentType, { limit: Math.ceil(limit / 3) })
    ]);
    
    // Combine and deduplicate recommendations
    const allRecs = [
      ...(collaborative.status === 'fulfilled' ? collaborative.value : []),
      ...(contentBased.status === 'fulfilled' ? contentBased.value : []),
      ...(moodBased.status === 'fulfilled' ? moodBased.value : [])
    ];
    
    // Remove duplicates and limit results
    const uniqueRecs = this.removeDuplicates(allRecs);
    return uniqueRecs.slice(0, limit);
  }

  // Collaborative filtering recommendations
  async getCollaborativeRecommendations(userId, contentType = 'movie', limit = 20) {
    try {
      // Simulate collaborative filtering by finding popular content in user's preferred genres
      const userPreferences = await this.getUserPreferences(userId);
      const preferredGenres = userPreferences.genres || [];
      
      if (preferredGenres.length === 0) {
        return this.getPopularContent(contentType, 1, limit);
      }
      
      // Get popular content from preferred genres
      const genrePromises = preferredGenres.slice(0, 3).map(genreId =>
        this.fetchContentByGenre(genreId, contentType, 1)
      );
      
      const genreResults = await Promise.allSettled(genrePromises);
      const allContent = genreResults
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value);
      
      return this.removeDuplicates(allContent).slice(0, limit);
    } catch (error) {
      console.error('Error in collaborative recommendations:', error);
      return [];
    }
  }

  // Content-based filtering recommendations
  async getContentBasedRecommendations(userId, contentType = 'movie', limit = 20) {
    try {
      const userPreferences = await this.getUserPreferences(userId);
      const watchHistory = userPreferences.recentWatched || [];
      
      if (watchHistory.length === 0) {
        return this.getTopRatedContent(contentType, 1, limit);
      }
      
      // Get similar content for recently watched items
      const similarPromises = watchHistory.slice(0, 3).map(item =>
        this.getEnhancedSimilarContent(item.id, contentType, { limit: Math.ceil(limit / 3) })
      );
      
      const similarResults = await Promise.allSettled(similarPromises);
      const allSimilar = similarResults
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value);
      
      return this.removeDuplicates(allSimilar).slice(0, limit);
    } catch (error) {
      console.error('Error in content-based recommendations:', error);
      return [];
    }
  }

  // Get user preferences (simulated - would integrate with actual user data)
  async getUserPreferences(userId) {
    // This would fetch from user database
    // For now, return simulated preferences
    return {
      genres: [28, 12, 35], // Action, Adventure, Comedy
      recentWatched: [
        { id: 550, title: 'Fight Club' },
        { id: 13, title: 'Forrest Gump' },
        { id: 680, title: 'Pulp Fiction' }
      ],
      favoriteActors: [62, 1100, 976], // Actor IDs
      preferredYears: [1990, 2010],
      mood: 'excited'
    };
  }

  // Fetch content by specific genre
  async fetchContentByGenre(genreId, contentType, page = 1) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/${contentType}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&sort_by=vote_average.desc&with_genres=${genreId}&vote_count.gte=100&page=${page}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching content by genre:', error);
      return [];
    }
  }

  // Remove duplicates from recommendation arrays
  removeDuplicates(contentList) {
    const seen = new Set();
    return contentList.filter(item => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  }

  // Get trending similar content
  async getTrendingSimilarContent(contentId, contentType = 'movie', options = {}) {
    const {
      limit = 50, // Default limit for trending similar content
      timeWindow = 'week'
    } = options;

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/trending/${contentType}/${timeWindow}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=1`
      );
      const data = await response.json();
      
      const trendingContent = data.results || [];
      
      // Calculate similarity scores for trending content
      const scoredTrending = trendingContent.map(item => {
        let score = 0;
        
        // Rating-based scoring
        if (item.vote_average && item.vote_average >= 7.0) {
          score += 0.4;
        } else if (item.vote_average && item.vote_average >= 6.0) {
          score += 0.3;
        } else {
          score += 0.2;
        }
        
        // Popularity bonus
        if (item.popularity && item.popularity > 100) {
          score += 0.3;
        } else if (item.popularity && item.popularity > 50) {
          score += 0.2;
        } else {
          score += 0.1;
        }
        
        // Recency bonus
        const year = new Date(item.release_date || item.first_air_date).getFullYear();
        if (year >= 2020) {
          score += 0.2;
        } else if (year >= 2010) {
          score += 0.1;
        }
        
        return {
          ...item,
          similarityScore: Math.min(1, Math.max(0, score))
        };
      });

      return scoredTrending
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching trending similar content:', error);
      return [];
    }
  }

  // Get recommendations by mood/tone
  async getMoodBasedRecommendations(mood, contentType = 'movie', options = {}) {
    const {
      limit = 50, // Default limit for mood-based recommendations
      genres = []
    } = options;

    const moodGenreMap = {
      'uplifting': [35, 10751], // Comedy, Family
      'dark': [27, 53], // Horror, Thriller
      'romantic': [10749], // Romance
      'adventurous': [12, 28], // Adventure, Action
      'thoughtful': [18, 9648], // Drama, Mystery
      'funny': [35], // Comedy
      'scary': [27], // Horror
      'action': [28], // Action
      'drama': [18] // Drama
    };

    const targetGenres = moodGenreMap[mood] || genres;
    
    if (targetGenres.length === 0) {
      return [];
    }

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/${contentType}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&with_genres=${targetGenres.join(',')}&page=1`
      );
      const data = await response.json();
      
      return data.results?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error fetching mood-based recommendations:', error);
      return [];
    }
  }

  // Get contextual recommendations based on time, weather, etc.
  async getContextualRecommendations(context, contentType = 'movie', options = {}) {
    const {
      limit = 30,
      timeOfDay = 'evening',
      season = 'any',
      weather = 'any'
    } = options;

    try {
      let recommendations = [];
      
      // Time-based recommendations
      if (timeOfDay === 'morning') {
        recommendations = await this.getMoodBasedRecommendations('uplifting', contentType, { limit: Math.ceil(limit / 2) });
      } else if (timeOfDay === 'afternoon') {
        recommendations = await this.getMoodBasedRecommendations('adventurous', contentType, { limit: Math.ceil(limit / 2) });
      } else if (timeOfDay === 'evening') {
        recommendations = await this.getMoodBasedRecommendations('romantic', contentType, { limit: Math.ceil(limit / 2) });
      } else if (timeOfDay === 'night') {
        recommendations = await this.getMoodBasedRecommendations('dark', contentType, { limit: Math.ceil(limit / 2) });
      }
      
      // Season-based recommendations
      if (season !== 'any') {
        const seasonalContent = await this.getSeasonalRecommendations(season, contentType, { limit: Math.ceil(limit / 2) });
        recommendations = [...recommendations, ...seasonalContent];
      }
      
      return this.removeDuplicates(recommendations).slice(0, limit);
    } catch (error) {
      console.error('Error getting contextual recommendations:', error);
      return [];
    }
  }

  // Get seasonal recommendations
  async getSeasonalRecommendations(season, contentType = 'movie', options = {}) {
    const {
      limit = 20
    } = options;

    const seasonalGenres = {
      'spring': [10749, 35, 16], // Romance, Comedy, Animation
      'summer': [12, 28, 10751], // Adventure, Action, Family
      'autumn': [18, 9648, 99], // Drama, Mystery, Documentary
      'winter': [14, 878, 37], // Fantasy, Sci-Fi, Western
      'christmas': [10751, 35, 16], // Family, Comedy, Animation
      'halloween': [27, 53, 9648] // Horror, Thriller, Mystery
    };
    
    const genres = seasonalGenres[season] || [28, 12, 35];
    const recommendations = [];
    
    for (const genreId of genres) {
      const genreContent = await this.fetchContentByGenre(genreId, contentType, 1);
      recommendations.push(...genreContent);
    }
    
    return this.removeDuplicates(recommendations).slice(0, limit);
  }

  // Get diversity-focused recommendations
  async getDiverseRecommendations(contentType = 'movie', options = {}) {
    const {
      limit = 30,
      includeInternational = true,
      includeIndie = true,
      includeClassics = true
    } = options;

    try {
      const recommendations = [];
      
      // International content
      if (includeInternational) {
        const internationalContent = await this.fetchInternationalContent(contentType, Math.ceil(limit / 3));
        recommendations.push(...internationalContent);
      }
      
      // Indie content
      if (includeIndie) {
        const indieContent = await this.fetchIndieContent(contentType, Math.ceil(limit / 3));
        recommendations.push(...indieContent);
      }
      
      // Classic content
      if (includeClassics) {
        const classicContent = await this.fetchClassicContent(contentType, Math.ceil(limit / 3));
        recommendations.push(...classicContent);
      }
      
      return this.removeDuplicates(recommendations).slice(0, limit);
    } catch (error) {
      console.error('Error getting diverse recommendations:', error);
      return [];
    }
  }

  // Fetch international content
  async fetchInternationalContent(contentType, limit = 10) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/${contentType}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&sort_by=vote_average.desc&with_original_language=ko,ja,fr,de,es,it&vote_count.gte=50&page=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error fetching international content:', error);
      return [];
    }
  }

  // Get language-specific recommendations
  async getLanguageSpecificRecommendations(language, contentType = 'movie', options = {}) {
    const {
      limit = 30,
      includeSubtitles = true,
      quality = 'high' // high, medium, low
    } = options;

    try {
      const languageMap = {
        'english': 'en',
        'spanish': 'es',
        'french': 'fr',
        'german': 'de',
        'italian': 'it',
        'portuguese': 'pt',
        'russian': 'ru',
        'chinese': 'zh',
        'japanese': 'ja',
        'korean': 'ko',
        'hindi': 'hi',
        'arabic': 'ar',
        'turkish': 'tr',
        'dutch': 'nl',
        'swedish': 'sv',
        'norwegian': 'no',
        'danish': 'da',
        'finnish': 'fi',
        'polish': 'pl',
        'czech': 'cs',
        'hungarian': 'hu',
        'romanian': 'ro',
        'bulgarian': 'bg',
        'greek': 'el',
        'hebrew': 'he',
        'thai': 'th',
        'vietnamese': 'vi',
        'indonesian': 'id',
        'malay': 'ms',
        'filipino': 'tl'
      };

      const langCode = languageMap[language.toLowerCase()] || language;
      
      let queryParams = new URLSearchParams({
        api_key: import.meta.env.VITE_TMDB_API_KEY,
        language: 'en-US',
        sort_by: 'vote_average.desc',
        with_original_language: langCode,
        page: '1'
      });

      // Add quality filters
      if (quality === 'high') {
        queryParams.append('vote_count.gte', '100');
        queryParams.append('vote_average.gte', '7.0');
      } else if (quality === 'medium') {
        queryParams.append('vote_count.gte', '50');
        queryParams.append('vote_average.gte', '6.0');
      }

      const response = await fetch(
        `https://api.themoviedb.org/3/discover/${contentType}?${queryParams.toString()}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error fetching language-specific content:', error);
      return [];
    }
  }

  // Get region-specific recommendations
  async getRegionSpecificRecommendations(region, contentType = 'movie', options = {}) {
    const {
      limit = 30,
      includeLocalProductions = true,
      includeCoProductions = true
    } = options;

    try {
      const regionMap = {
        'north-america': ['US', 'CA', 'MX'],
        'europe': ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'RO', 'BG', 'GR'],
        'asia': ['JP', 'KR', 'CN', 'IN', 'TH', 'VN', 'ID', 'MY', 'PH', 'SG', 'TW', 'HK'],
        'latin-america': ['BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'MX'],
        'middle-east': ['TR', 'IL', 'AE', 'SA', 'EG', 'IR'],
        'africa': ['ZA', 'NG', 'EG', 'KE', 'GH'],
        'oceania': ['AU', 'NZ'],
        'eastern-europe': ['RU', 'UA', 'BY', 'MD', 'GE', 'AM', 'AZ'],
        'scandinavia': ['SE', 'NO', 'DK', 'FI', 'IS'],
        'balkans': ['RS', 'HR', 'SI', 'BA', 'ME', 'MK', 'AL'],
        'baltic': ['EE', 'LV', 'LT'],
        'benelux': ['BE', 'NL', 'LU'],
        'iberia': ['ES', 'PT'],
        'central-europe': ['DE', 'AT', 'CH', 'LI'],
        'mediterranean': ['IT', 'GR', 'CY', 'MT']
      };

      const countries = regionMap[region.toLowerCase()] || [region];
      const recommendations = [];

      for (const country of countries.slice(0, 3)) { // Limit to 3 countries per region
        try {
          const response = await fetch(
            `https://api.themoviedb.org/3/discover/${contentType}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&sort_by=vote_average.desc&with_origin_country=${country}&vote_count.gte=20&page=1`
          );
          
          if (response.ok) {
            const data = await response.json();
            recommendations.push(...(data.results || []));
          }
        } catch (error) {
          console.warn(`Failed to fetch content for country ${country}:`, error);
        }
      }

      return this.removeDuplicates(recommendations).slice(0, limit);
    } catch (error) {
      console.error('Error fetching region-specific content:', error);
      return [];
    }
  }

  // Get cultural recommendations based on language and region
  async getCulturalRecommendations(culture, contentType = 'movie', options = {}) {
    const {
      limit = 30,
      includeClassics = true,
      includeContemporary = true
    } = options;

    const culturalMap = {
      'bollywood': { language: 'hi', region: 'asia', genres: [10749, 35, 18] }, // Hindi cinema
      'korean-wave': { language: 'ko', region: 'asia', genres: [18, 10749, 35] }, // K-dramas
      'anime': { language: 'ja', region: 'asia', genres: [16, 878, 14] }, // Japanese animation
      'nollywood': { language: 'en', region: 'africa', genres: [18, 35, 10749] }, // Nigerian cinema
      'telenovelas': { language: 'es', region: 'latin-america', genres: [10749, 18, 35] }, // Spanish soap operas
      'european-arthouse': { language: 'fr', region: 'europe', genres: [18, 9648, 99] }, // European art films
      'scandinavian-noir': { language: 'sv', region: 'scandinavia', genres: [53, 9648, 18] }, // Nordic crime
      'french-new-wave': { language: 'fr', region: 'europe', genres: [18, 9648, 35] }, // French cinema
      'italian-neorealism': { language: 'it', region: 'europe', genres: [18, 36, 99] }, // Italian cinema
      'german-expressionism': { language: 'de', region: 'europe', genres: [27, 53, 18] }, // German cinema
      'russian-literary': { language: 'ru', region: 'eastern-europe', genres: [18, 36, 9648] }, // Russian adaptations
      'chinese-wuxia': { language: 'zh', region: 'asia', genres: [28, 14, 12] }, // Chinese martial arts
      'japanese-samurai': { language: 'ja', region: 'asia', genres: [28, 36, 18] }, // Japanese period films
      'korean-thrillers': { language: 'ko', region: 'asia', genres: [53, 27, 9648] }, // Korean thrillers
      'turkish-drama': { language: 'tr', region: 'middle-east', genres: [18, 10749, 35] }, // Turkish dramas
      'brazilian-cinema': { language: 'pt', region: 'latin-america', genres: [18, 35, 10749] }, // Brazilian films
      'mexican-cinema': { language: 'es', region: 'latin-america', genres: [18, 35, 27] }, // Mexican films
      'australian-cinema': { language: 'en', region: 'oceania', genres: [18, 35, 53] }, // Australian films
      'canadian-cinema': { language: 'en', region: 'north-america', genres: [18, 35, 99] }, // Canadian films
      'british-cinema': { language: 'en', region: 'europe', genres: [18, 35, 36] } // British films
    };

    const cultureConfig = culturalMap[culture.toLowerCase()];
    if (!cultureConfig) {
      return [];
    }

    try {
      const recommendations = [];
      
      // Get language-specific content
      const languageContent = await this.getLanguageSpecificRecommendations(
        cultureConfig.language, 
        contentType, 
        { limit: Math.ceil(limit / 2) }
      );
      recommendations.push(...languageContent);

      // Get region-specific content
      const regionContent = await this.getRegionSpecificRecommendations(
        cultureConfig.region, 
        contentType, 
        { limit: Math.ceil(limit / 2) }
      );
      recommendations.push(...regionContent);

      return this.removeDuplicates(recommendations).slice(0, limit);
    } catch (error) {
      console.error('Error fetching cultural content:', error);
      return [];
    }
  }

  // Fetch indie content
  async fetchIndieContent(contentType, limit = 10) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/${contentType}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&sort_by=vote_average.desc&vote_count.gte=10&vote_count.lte=1000&page=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error fetching indie content:', error);
      return [];
    }
  }

  // Fetch classic content
  async fetchClassicContent(contentType, limit = 10) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/${contentType}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&sort_by=vote_average.desc&primary_release_date.gte=1950-01-01&primary_release_date.lte=1990-12-31&vote_count.gte=100&page=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error fetching classic content:', error);
      return [];
    }
  }

  // Get recommendations by content characteristics
  async getCharacteristicBasedRecommendations(characteristics, contentType = 'movie', options = {}) {
    const {
      limit = 50, // Default limit for characteristic-based recommendations
      minRating = 0,
      maxYear = new Date().getFullYear(),
      minYear = 1900
    } = options;

    const queryParams = new URLSearchParams({
      api_key: import.meta.env.VITE_TMDB_API_KEY,
      language: 'en-US',
      sort_by: 'popularity.desc',
      'vote_average.gte': minRating,
      'primary_release_date.gte': `${minYear}-01-01`,
      'primary_release_date.lte': `${maxYear}-12-31`,
      page: '1'
    });

    // Add genre filters if specified
    if (characteristics.genres && characteristics.genres.length > 0) {
      queryParams.append('with_genres', characteristics.genres.join(','));
    }

    // Add cast filters if specified
    if (characteristics.cast && characteristics.cast.length > 0) {
      queryParams.append('with_cast', characteristics.cast.join(','));
    }

    // Add crew filters if specified
    if (characteristics.crew && characteristics.crew.length > 0) {
      queryParams.append('with_crew', characteristics.crew.join(','));
    }

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/${contentType}?${queryParams.toString()}`
      );
      const data = await response.json();
      
      return data.results?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error fetching characteristic-based recommendations:', error);
      return [];
    }
  }

  // Clear cache for specific content
  clearCache(contentId, contentType = 'movie') {
    const cacheKey = `enhanced_similar_${contentType}_${contentId}`;
    this.cache.delete(cacheKey);
    
    // Also clear related cache keys for different pages
    for (let page = 1; page <= 5; page++) {
      const pageCacheKey = `enhanced_similar_${contentType}_${contentId}_${page}`;
      this.cache.delete(pageCacheKey);
    }
  }

  // Clear all similar content cache
  clearAllSimilarContentCache() {
    // Get all keys from the cache
    const cacheKeys = this.cache.getKeys();
    
    // Filter keys that contain 'enhanced_similar_' and delete them
    cacheKeys.forEach(key => {
      if (key.includes('enhanced_similar_')) {
        this.cache.delete(key);
      }
    });
  }

  // Get cache statistics
  getCacheStats() {
    return this.cache.getStats();
  }
}

// Create singleton instance
const enhancedSimilarContentService = new EnhancedSimilarContentService();

// Export the service
export default enhancedSimilarContentService;

// Export utility functions for easy access
export const similarContentUtils = {
  // Get enhanced similar content
  getSimilarContent: (contentId, contentType, options) => 
    enhancedSimilarContentService.getEnhancedSimilarContent(contentId, contentType, options),

  // Get personalized recommendations
  getPersonalizedRecommendations: (userId, contentType, options) =>
    enhancedSimilarContentService.getPersonalizedRecommendations(userId, contentType, options),

  // Get hybrid recommendations
  getHybridRecommendations: (userId, contentType, limit) =>
    enhancedSimilarContentService.getHybridRecommendations(userId, contentType, limit),

  // Get collaborative recommendations
  getCollaborativeRecommendations: (userId, contentType, limit) =>
    enhancedSimilarContentService.getCollaborativeRecommendations(userId, contentType, limit),

  // Get content-based recommendations
  getContentBasedRecommendations: (userId, contentType, limit) =>
    enhancedSimilarContentService.getContentBasedRecommendations(userId, contentType, limit),

  // Get trending similar content
  getTrendingSimilar: (contentId, contentType, options) =>
    enhancedSimilarContentService.getTrendingSimilarContent(contentId, contentType, options),

  // Get mood-based recommendations
  getMoodBasedRecommendations: (mood, contentType, options) =>
    enhancedSimilarContentService.getMoodBasedRecommendations(mood, contentType, options),

  // Get contextual recommendations
  getContextualRecommendations: (context, contentType, options) =>
    enhancedSimilarContentService.getContextualRecommendations(context, contentType, options),

  // Get seasonal recommendations
  getSeasonalRecommendations: (season, contentType, options) =>
    enhancedSimilarContentService.getSeasonalRecommendations(season, contentType, options),

  // Get diverse recommendations
  getDiverseRecommendations: (contentType, options) =>
    enhancedSimilarContentService.getDiverseRecommendations(contentType, options),

  // Get language-specific recommendations
  getLanguageSpecificRecommendations: (language, contentType, options) =>
    enhancedSimilarContentService.getLanguageSpecificRecommendations(language, contentType, options),

  // Get region-specific recommendations
  getRegionSpecificRecommendations: (region, contentType, options) =>
    enhancedSimilarContentService.getRegionSpecificRecommendations(region, contentType, options),

  // Get cultural recommendations
  getCulturalRecommendations: (culture, contentType, options) =>
    enhancedSimilarContentService.getCulturalRecommendations(culture, contentType, options),

  // Get characteristic-based recommendations
  getCharacteristicBasedRecommendations: (characteristics, contentType, options) =>
    enhancedSimilarContentService.getCharacteristicBasedRecommendations(characteristics, contentType, options),

  // Get user preferences
  getUserPreferences: (userId) =>
    enhancedSimilarContentService.getUserPreferences(userId),

  // Clear cache
  clearCache: (contentId, contentType) =>
    enhancedSimilarContentService.clearCache(contentId, contentType),

  // Clear all similar content cache
  clearAllSimilarContentCache: () =>
    enhancedSimilarContentService.clearAllSimilarContentCache(),

  // Get cache stats
  getCacheStats: () => enhancedSimilarContentService.getCacheStats()
}; 