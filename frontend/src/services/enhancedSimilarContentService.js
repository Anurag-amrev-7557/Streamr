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
      genre: 0.22, // Reduced from 0.25 to make room for enhanced cultural factors
      cast: 0.16,  // Actor/director influence (reduced from 0.18)
      crew: 0.10,  // Director/writer importance (reduced from 0.12)
      franchise: 0.12, // Franchise/collection importance (reduced from 0.15)
      language: 0.15, // Language preference (increased from 0.08) - ENHANCED
      region: 0.15,   // Regional/cultural preference (increased from 0.08) - ENHANCED
      year: 0.06,  // Temporal relevance (reduced from 0.08)
      rating: 0.05, // Quality indicator (reduced from 0.06)
      popularity: 0.04, // Cultural relevance (unchanged)
      runtime: 0.02, // Duration preference (unchanged)
      budget: 0.02, // Production value (unchanged)
      productionCompany: 0.01 // Production company preference (reduced from 0.02)
    };
    this.minRelevanceScore = 0.20; // Lower threshold for more diverse recommendations
    this.userProfiles = new Map(); // User behavior tracking
    this.contentProfiles = new Map(); // Content feature vectors
    this.interactionMatrix = new Map(); // User-item interactions
    
    // NEW: Enhanced cultural preferences tracking
    this.userCulturalPreferences = new Map(); // User language/region preferences
    this.regionalContentBoost = new Map(); // Regional content popularity
    this.languageContentBoost = new Map(); // Language content popularity
    
    // FIXED: Add cleanup method for memory management
    this.maxCacheSize = 1000; // Limit cache size to prevent memory leaks
    this.lastCleanup = Date.now();
    this.cleanupInterval = 300000; // 5 minutes
    
    // NEW: Cultural context weights for different regions
    this.culturalContextWeights = {
      'north-america': { language: 0.20, region: 0.18, genre: 0.20 },
      'europe': { language: 0.18, region: 0.20, genre: 0.18 },
      'asia': { language: 0.25, region: 0.22, genre: 0.15 },
      'latin-america': { language: 0.22, region: 0.20, genre: 0.16 },
      'middle-east': { language: 0.20, region: 0.22, genre: 0.16 },
      'africa': { language: 0.18, region: 0.20, genre: 0.18 },
      'oceania': { language: 0.16, region: 0.18, genre: 0.20 }
    };
    
    this.recommendationStrategies = {
      collaborative: this.collaborativeFiltering.bind(this),
      contentBased: this.contentBasedFiltering.bind(this),
      hybrid: this.hybridRecommendation.bind(this),
      contextual: this.contextualRecommendation.bind(this),
      deepLearning: this.deepLearningRecommendation.bind(this),
      reinforcement: this.reinforcementLearningRecommendation.bind(this),
      cultural: this.culturalRecommendation.bind(this) // NEW: Cultural recommendation strategy
    };
  }

  // Enhanced similarity score calculation with franchise, language, region, and other factors
  calculateSimilarityScore(item1, item2, userContext = null) {
    // FIXED: Perform memory cleanup periodically
    this.performMemoryCleanup();
    
    let score = 0;
    
    // Get user's cultural context for dynamic weighting
    const userRegion = userContext?.region || 'global';
    const userLanguage = userContext?.preferredLanguage || 'en';
    const culturalWeights = this.culturalContextWeights[userRegion] || this.relevanceWeights;
    
    // Genre similarity (weighted by cultural context)
    if (item1.genres && item2.genres) {
      const genreOverlap = this.calculateGenreOverlap(item1.genres, item2.genres);
      score += genreOverlap * culturalWeights.genre;
    }
    
    // Cast similarity with role importance
    if (item1.cast && item2.cast) {
      const castOverlap = this.calculateCastOverlap(item1.cast, item2.cast);
      score += castOverlap * this.relevanceWeights.cast;
    }
    
    // Crew similarity (director, writer, etc.)
    if (item1.crew && item2.crew) {
      const crewOverlap = this.calculateCrewOverlap(item1.crew, item2.crew);
      score += crewOverlap * this.relevanceWeights.crew;
    }
    
    // Franchise/Collection similarity
    if (item1.belongs_to_collection && item2.belongs_to_collection) {
      const franchiseSimilarity = this.calculateFranchiseSimilarity(item1.belongs_to_collection, item2.belongs_to_collection);
      score += franchiseSimilarity * this.relevanceWeights.franchise;
    }
    
    // ENHANCED: Language similarity with cultural considerations and user preferences
    if (item1.original_language && item2.original_language) {
      const languageSimilarity = this.calculateLanguageSimilarity(item1.original_language, item2.original_language);
      let languageWeight = culturalWeights.language;
      
      // Boost for user's preferred language
      if (userLanguage && (item1.original_language === userLanguage || item2.original_language === userLanguage)) {
        languageWeight *= 1.5; // 50% boost for preferred language
      }
      
      // Boost for regional language preferences
      const regionalLanguageBoost = this.getRegionalLanguageBoost(item1.original_language, userRegion);
      languageWeight *= (1 + regionalLanguageBoost);
      
      score += languageSimilarity * languageWeight;
    }
    
    // ENHANCED: Regional similarity with cultural context
    if (item1.production_countries && item2.production_countries) {
      const regionSimilarity = this.calculateRegionSimilarity(item1.production_countries, item2.production_countries);
      let regionWeight = culturalWeights.region;
      
      // Boost for user's preferred region
      if (userRegion && this.isContentFromRegion(item1, userRegion) || this.isContentFromRegion(item2, userRegion)) {
        regionWeight *= 1.4; // 40% boost for preferred region
      }
      
      // Cultural affinity boost
      const culturalAffinity = this.calculateCulturalAffinity(item1, item2, userRegion);
      regionWeight *= (1 + culturalAffinity);
      
      score += regionSimilarity * regionWeight;
    }
    
    // Year similarity with temporal decay
    if (item1.year && item2.year) {
      const yearDiff = Math.abs(item1.year - item2.year);
      const yearScore = Math.max(0, 1 - (yearDiff / 15)); // Faster decay for better relevance
      score += yearScore * this.relevanceWeights.year;
    }
    
    // Rating similarity with quality threshold
    if (item1.vote_average && item2.vote_average) {
      const ratingDiff = Math.abs(item1.vote_average - item2.vote_average);
      const ratingScore = Math.max(0, 1 - (ratingDiff / 4)); // Tighter rating similarity
      score += ratingScore * this.relevanceWeights.rating;
    }
    
    // Popularity similarity with cultural relevance
    if (item1.popularity && item2.popularity) {
      const popularityDiff = Math.abs(item1.popularity - item2.popularity);
      const popularityScore = Math.max(0, 1 - (popularityDiff / 80)); // Tighter popularity range
      score += popularityScore * this.relevanceWeights.popularity;
    }
    
    // Runtime similarity (for movies)
    if (item1.runtime && item2.runtime) {
      const runtimeDiff = Math.abs(item1.runtime - item2.runtime);
      const runtimeScore = Math.max(0, 1 - (runtimeDiff / 30)); // 30-minute tolerance
      score += runtimeScore * this.relevanceWeights.runtime;
    }
    
    // Budget similarity (production value)
    if (item1.budget && item2.budget) {
      const budgetDiff = Math.abs(item1.budget - item2.budget);
      const budgetScore = Math.max(0, 1 - (budgetDiff / 50000000)); // $50M tolerance
      score += budgetScore * this.relevanceWeights.budget;
    }
    
    // Production company similarity
    if (item1.production_companies && item2.production_companies) {
      const companySimilarity = this.calculateProductionCompanySimilarity(item1.production_companies, item2.production_companies);
      score += companySimilarity * this.relevanceWeights.productionCompany;
    }
    
    // Content maturity similarity
    if (item1.adult !== undefined && item2.adult !== undefined) {
      if (item1.adult === item2.adult) {
        score += 0.02; // Small boost for matching content maturity
      }
    }
    
    // NEW: Cultural content type similarity
    const culturalSimilarity = this.calculateCulturalContentSimilarity(item1, item2, userRegion);
    score += culturalSimilarity * 0.05; // Small but important cultural boost
    
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

  // NEW: Calculate franchise/collection similarity
  calculateFranchiseSimilarity(collection1, collection2) {
    if (!collection1 || !collection2) return 0;
    
    // Exact match
    if (collection1.id === collection2.id) {
      return 1.0;
    }
    
    // Name similarity (for collections with similar names)
    const name1 = collection1.name?.toLowerCase() || '';
    const name2 = collection2.name?.toLowerCase() || '';
    
    if (name1 === name2) {
      return 1.0;
    }
    
    // Partial name match (e.g., "Marvel" vs "Marvel Cinematic Universe")
    if (name1.includes(name2) || name2.includes(name1)) {
      return 0.8;
    }
    
    // Check for common franchise keywords
    const franchiseKeywords = ['marvel', 'dc', 'star wars', 'star trek', 'james bond', 'harry potter', 'lord of the rings', 'fast and furious', 'mission impossible', 'transformers', 'pirates of the caribbean', 'indiana jones', 'terminator', 'alien', 'predator', 'x-men', 'spider-man', 'batman', 'superman', 'avengers', 'justice league'];
    
    const hasCommonKeyword = franchiseKeywords.some(keyword => 
      name1.includes(keyword) && name2.includes(keyword)
    );
    
    if (hasCommonKeyword) {
      return 0.6;
    }
    
    return 0;
  }

  // NEW: Enhanced language similarity with regional considerations
  calculateLanguageSimilarity(lang1, lang2) {
    if (!lang1 || !lang2) return 0;
    
    // Exact match
    if (lang1 === lang2) {
      return 1.0;
    }
    
    // Language family groupings
    const languageGroups = {
      'english': ['en', 'eng'],
      'spanish': ['es', 'spa'],
      'french': ['fr', 'fra'],
      'german': ['de', 'ger'],
      'italian': ['it', 'ita'],
      'portuguese': ['pt', 'por'],
      'russian': ['ru', 'rus'],
      'chinese': ['zh', 'chi', 'cmn'],
      'japanese': ['ja', 'jpn'],
      'korean': ['ko', 'kor'],
      'hindi': ['hi', 'hin'],
      'arabic': ['ar', 'ara'],
      'turkish': ['tr', 'tur'],
      'dutch': ['nl', 'nld'],
      'swedish': ['sv', 'swe'],
      'norwegian': ['no', 'nor'],
      'danish': ['da', 'dan'],
      'finnish': ['fi', 'fin'],
      'polish': ['pl', 'pol'],
      'czech': ['cs', 'ces'],
      'hungarian': ['hu', 'hun'],
      'romanian': ['ro', 'ron'],
      'bulgarian': ['bg', 'bul'],
      'greek': ['el', 'ell'],
      'hebrew': ['he', 'heb'],
      'thai': ['th', 'tha'],
      'vietnamese': ['vi', 'vie'],
      'indonesian': ['id', 'ind'],
      'malay': ['ms', 'msa'],
      'filipino': ['tl', 'fil']
    };
    
    // Find language groups
    let group1 = null;
    let group2 = null;
    
    for (const [groupName, codes] of Object.entries(languageGroups)) {
      if (codes.includes(lang1)) group1 = groupName;
      if (codes.includes(lang2)) group2 = groupName;
    }
    
    // Same language family
    if (group1 && group2 && group1 === group2) {
      return 0.8;
    }
    
    // Related language families (e.g., Romance languages)
    const relatedFamilies = {
      'romance': ['spanish', 'french', 'italian', 'portuguese', 'romanian'],
      'germanic': ['english', 'german', 'dutch', 'swedish', 'norwegian', 'danish'],
      'slavic': ['russian', 'polish', 'czech', 'bulgarian'],
      'scandinavian': ['swedish', 'norwegian', 'danish'],
      'chinese': ['chinese'],
      'japanese': ['japanese'],
      'korean': ['korean']
    };
    
    for (const [family, languages] of Object.entries(relatedFamilies)) {
      if (languages.includes(group1) && languages.includes(group2)) {
        return 0.6;
      }
    }
    
    return 0;
  }

  // NEW: Calculate regional similarity
  calculateRegionSimilarity(countries1, countries2) {
    if (!countries1 || !countries2) return 0;
    
    const countryCodes1 = new Set(countries1.map(c => typeof c === 'object' ? c.iso_3166_1 : c));
    const countryCodes2 = new Set(countries2.map(c => typeof c === 'object' ? c.iso_3166_1 : c));
    
    // Exact country match
    const intersection = new Set([...countryCodes1].filter(x => countryCodes2.has(x)));
    if (intersection.size > 0) {
      return Math.min(1, intersection.size / Math.min(countryCodes1.size, countryCodes2.size));
    }
    
    // Regional groupings
    const regions = {
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
    
    // Find regions for each country
    const regions1 = new Set();
    const regions2 = new Set();
    
    for (const countryCode of countryCodes1) {
      for (const [region, countries] of Object.entries(regions)) {
        if (countries.includes(countryCode)) {
          regions1.add(region);
          break;
        }
      }
    }
    
    for (const countryCode of countryCodes2) {
      for (const [region, countries] of Object.entries(regions)) {
        if (countries.includes(countryCode)) {
          regions2.add(region);
          break;
        }
      }
    }
    
    // Same region
    const regionIntersection = new Set([...regions1].filter(x => regions2.has(x)));
    if (regionIntersection.size > 0) {
      return 0.7;
    }
    
    // Related regions (e.g., European regions)
    const relatedRegions = {
      'european': ['europe', 'scandinavia', 'balkans', 'baltic', 'benelux', 'iberia', 'central-europe', 'mediterranean', 'eastern-europe'],
      'asian': ['asia'],
      'american': ['north-america', 'latin-america'],
      'african': ['africa', 'middle-east']
    };
    
    for (const [family, regionList] of Object.entries(relatedRegions)) {
      const hasRegion1 = regions1.size > 0 && regions1.size === new Set([...regions1].filter(x => regionList.includes(x))).size;
      const hasRegion2 = regions2.size > 0 && regions2.size === new Set([...regions2].filter(x => regionList.includes(x))).size;
      
      if (hasRegion1 && hasRegion2) {
        return 0.5;
      }
    }
    
    return 0;
  }

  // NEW: Calculate production company similarity
  calculateProductionCompanySimilarity(companies1, companies2) {
    if (!companies1 || !companies2) return 0;
    
    const companyIds1 = new Set(companies1.map(c => typeof c === 'object' ? c.id : c));
    const companyIds2 = new Set(companies2.map(c => typeof c === 'object' ? c.id : c));
    
    const intersection = new Set([...companyIds1].filter(x => companyIds2.has(x)));
    const union = new Set([...companyIds1, ...companyIds2]);
    
    return intersection.size / union.size;
  }

  // Enhanced similar content fetching with infinite loading support
  async getEnhancedSimilarContent(contentId, contentType = 'movie', options = {}) {
    const {
      limit = 200, // Increased default limit for faster loading
      minScore = 0.2, // Increased threshold for better relevance
      includeDetails = true,
      forceRefresh = false,
      page = 1, // Support for pagination
      infiniteLoading = false, // New flag for infinite loading
      userId = null, // NEW: User ID for cultural context
      useCulturalContext = true, // NEW: Enable cultural context awareness
      signal = undefined // NEW: AbortController signal for cancellable fetches
    } = options;

    // FIXED: Check if signal is already aborted before proceeding
    if (signal?.aborted) {
      console.debug('Request aborted before processing enhanced similar content');
      return [];
    }

    const cacheKey = `enhanced_similar_${contentType}_${contentId}_${page}_${userId || 'global'}`;
    
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

      // NEW: Get user cultural context for enhanced recommendations
      let userContext = null;
      if (useCulturalContext && userId) {
        try {
          // FIXED: Check abort signal before user context fetch
          if (signal?.aborted) {
            console.debug('Request aborted during user context fetch');
            return [];
          }

          const userPreferences = await this.detectUserCulturalPreferences(userId);
          const topLanguage = Array.from(userPreferences.preferredLanguages.entries())
            .sort((a, b) => b[1] - a[1])[0];
          const topRegion = Array.from(userPreferences.preferredRegions.entries())
            .sort((a, b) => b[1] - a[1])[0];
          
          userContext = {
            preferredLanguage: topLanguage ? topLanguage[0] : 'en',
            region: topRegion ? topRegion[0] : 'global',
            preferences: userPreferences
          };
        } catch (error) {
          console.warn('Failed to get user cultural context:', error);
        }
      }

      // Use a more focused approach to get actual similar content
      let allResults = [];
      
      // For infinite loading, fetch from more sources in parallel
      const fetchPromises = [];
      
      // Start with recommendations (most reliable for actual similar content)
      fetchPromises.push(
        this.fetchRecommendations(contentId, contentType, page, { signal }).catch(error => {
          if (import.meta.env.DEV) {
            console.debug('Failed to fetch recommendations:', error);
          }
          return [];
        })
      );

      // Add similar content (also reliable for actual similar content)
      fetchPromises.push(
        this.fetchSimilar(contentId, contentType, page, { signal }).catch(error => {
          if (import.meta.env.DEV) {
            console.debug('Failed to fetch similar content:', error);
          }
          return [];
        })
      );

      // Add genre-based content (more focused on actual similarity)
      fetchPromises.push(
        this.fetchGenreBased(contentId, contentType, page, { signal }).catch(error => {
          if (import.meta.env.DEV) {
            console.debug('Failed to fetch genre-based content:', error);
          }
          return [];
        })
      );

      // NEW: Add cultural recommendations if user context is available
      if (userContext && userContext.preferences) {
        fetchPromises.push(
          this.culturalRecommendation(userId, contentType, { 
            limit: Math.ceil(limit / 4),
            useUserPreferences: true,
            includeRegionalContent: true,
            includeLanguageSpecific: true,
            signal
          }).catch(error => {
            if (import.meta.env.DEV) {
              console.debug('Failed to fetch cultural recommendations:', error);
            }
            return [];
          })
        );
      }

      // Only add trending/popular content for infinite loading to avoid generic results
      if (infiniteLoading && page > 1) {
        // Add trending content for variety (but with lower priority)
        fetchPromises.push(
          this.fetchTrendingContent(contentType, page, { signal }).catch(error => {
            if (import.meta.env.DEV) {
              console.debug('Failed to fetch trending content:', error);
            }
            return [];
          })
        );

        // Add popular content for more variety (but with lower priority)
        fetchPromises.push(
          this.fetchPopularContent(contentType, page, { signal }).catch(error => {
            if (import.meta.env.DEV) {
              console.debug('Failed to fetch popular content:', error);
            }
            return [];
          })
        );

        // Add top rated content (but with lower priority)
        fetchPromises.push(
          this.fetchTopRatedContent(contentType, page, { signal }).catch(error => {
            if (import.meta.env.DEV) {
              console.debug('Failed to fetch top rated content:', error);
            }
            return [];
          })
        );

        // Add upcoming content (but with lower priority)
        fetchPromises.push(
          this.fetchUpcomingContent(contentType, page, { signal }).catch(error => {
            if (import.meta.env.DEV) {
              console.debug('Failed to fetch upcoming content:', error);
            }
            return [];
          })
        );

        // Add now playing content (but with lower priority)
        fetchPromises.push(
          this.fetchNowPlayingContent(contentType, page, { signal }).catch(error => {
            if (import.meta.env.DEV) {
              console.debug('Failed to fetch now playing content:', error);
            }
            return [];
          })
        );
      }

      // Execute all fetch promises in parallel for faster loading
      // FIXED: Check abort signal before executing promises
      if (signal?.aborted) {
        console.debug('Request aborted before executing fetch promises');
        return [];
      }
      
      const results = await Promise.all(fetchPromises);
      
      // Combine all results and remove duplicates using enhanced strategy
      results.forEach(resultArray => {
        if (Array.isArray(resultArray)) {
          allResults.push(...resultArray.filter(item => item && item.id));
        }
      });

      // Enhanced duplicate removal with smart strategy
      allResults = this.removeDuplicates(allResults, {
        strategy: 'smart',
        keepBestScore: true,
        preserveOrder: false
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

      // FIXED: Check abort signal before detailed content fetching
      if (signal?.aborted) {
        console.debug('Request aborted before detailed content fetching');
        return [];
      }

      // Get detailed information for scoring (with rate limiting)
      const detailedResults = await this.getDetailedContent(limitedResults, contentType, { signal });
      
      // FIXED: Check abort signal before original content details fetching
      if (signal?.aborted) {
        console.debug('Request aborted before original content details fetching');
        return [];
      }
      
      // Get the original content details for comparison
      const originalContentDetails = await this.getOriginalContentDetails(contentId, contentType, { signal });
      
      // Calculate similarity scores by comparing with the original content
      const scoredResults = detailedResults.map(item => {
        let similarityScore = 0;
        
        if (originalContentDetails) {
          // ENHANCED: Use cultural context for similarity calculation
          similarityScore = this.calculateSimilarityScore(originalContentDetails, item, userContext);
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

      // NEW: Apply cultural diversity boost if user context is available
      if (userContext && userContext.preferences) {
        filteredResults = this.applyCulturalDiversityBoost(filteredResults, userContext);
      }

      // Cache the results (but not for infinite loading to ensure fresh content)
      if (!infiniteLoading) {
        this.cache.set(cacheKey, filteredResults, {
          ttl: 30 * 60 * 1000, // 30 minutes
          priority: 'high',
          namespace: 'similar_content'
        });
      }

      // FIXED: Reduced debug logging to prevent memory issues
      if (import.meta.env.DEV && Math.random() < 0.1) { // Only log 10% of the time
        console.log(`[EnhancedSimilarContentService] Returning ${filteredResults.length} similar items for ${contentType} ${contentId} (page ${page}):`, 
          filteredResults.slice(0, 2).map(item => ({ 
            id: item.id, 
            title: item.title || item.name, 
            score: item.similarityScore
          }))
        );
      }

      return filteredResults;
    } catch (error) {
      // FIXED: Handle AbortError gracefully
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.debug('Request aborted in enhanced similar content:', error.message);
        return [];
      }
      
      if (import.meta.env.DEV) {
        console.debug('Error fetching enhanced similar content:', error);
      }
      return [];
    }
  }

  // Fetch recommendations from TMDB
  async fetchRecommendations(contentId, contentType, page, { signal } = {}) {
    try {
      // FIXED: Check if signal is already aborted before making the request
      if (signal?.aborted) {
        console.debug('Request aborted before fetch for recommendations');
        return [];
      }

      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/${contentId}/recommendations?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`,
        { signal }
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit for recommendations');
          return [];
        }
        // FIXED: Handle 404 errors gracefully for non-existent content
        if (response.status === 404) {
          console.debug(`Content ${contentId} not found (404) for recommendations`);
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      // FIXED: Handle AbortError gracefully
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.debug('Request aborted for recommendations:', error.message);
        return [];
      }
      
      if (import.meta.env.DEV) {
        console.debug('Error fetching recommendations:', error);
      }
      return [];
    }
  }

  // Fetch similar content from TMDB
  async fetchSimilar(contentId, contentType, page, { signal } = {}) {
    try {
      // FIXED: Check if signal is already aborted before making the request
      if (signal?.aborted) {
        console.debug('Request aborted before fetch for similar content');
        return [];
      }

      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/${contentId}/similar?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`,
        { signal }
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit for similar content');
          return [];
        }
        // FIXED: Handle 404 errors gracefully for non-existent content
        if (response.status === 404) {
          console.debug(`Content ${contentId} not found (404) for similar content`);
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      // FIXED: Handle AbortError gracefully
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.debug('Request aborted for similar content:', error.message);
        return [];
      }
      
      if (import.meta.env.DEV) {
        console.debug('Error fetching similar content:', error);
      }
      return [];
    }
  }

  // Fetch genre-based content
  async fetchGenreBased(contentId, contentType, page, { signal } = {}) {
    try {
      // First get the content details to extract genres
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/${contentId}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&append_to_response=credits`,
        { signal }
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
        `https://api.themoviedb.org/3/discover/${contentType}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&sort_by=vote_average.desc&with_genres=${genreIds.join(',')}&vote_count.gte=100&page=${page}`,
        { signal }
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
  async fetchTrendingContent(contentType, page, { signal } = {}) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/trending/${contentType}/week?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`,
        { signal }
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
  async fetchPopularContent(contentType, page, { signal } = {}) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/popular?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`,
        { signal }
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
  async fetchTopRatedContent(contentType, page, { signal } = {}) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/top_rated?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`,
        { signal }
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
  async fetchUpcomingContent(contentType, page, { signal } = {}) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/upcoming?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`,
        { signal }
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
  async fetchNowPlayingContent(contentType, page, { signal } = {}) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/now_playing?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=${page}`,
        { signal }
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

  // Get original content details for comparison with enhanced metadata
  async getOriginalContentDetails(contentId, contentType, { signal } = {}) {
    try {
      // FIXED: Check if signal is already aborted before making the request
      if (signal?.aborted) {
        console.debug('Request aborted before fetch for original content details');
        return null;
      }

      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/${contentId}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&append_to_response=credits`,
        { signal }
      );
      
      if (!response.ok) {
        // FIXED: Handle 404 errors gracefully for non-existent content
        if (response.status === 404) {
          console.debug(`Content ${contentId} not found (404) for original content details`);
          return null;
        }
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
        original_language: data.original_language,
        // NEW: Enhanced metadata for better recommendations
        belongs_to_collection: data.belongs_to_collection || null,
        production_countries: data.production_countries || [],
        production_companies: data.production_companies || [],
        budget: data.budget,
        revenue: data.revenue,
        runtime: data.runtime,
        spoken_languages: data.spoken_languages || [],
        status: data.status,
        adult: data.adult
      };
    } catch (error) {
      // FIXED: Handle AbortError gracefully
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.debug('Request aborted for original content details:', error.message);
        return null;
      }
      
      if (import.meta.env.DEV) {
        console.debug('Error fetching original content details:', error);
      }
      return null;
    }
  }

  // Get detailed content information with rate limiting
  async getDetailedContent(contentList, contentType, { signal } = {}) {
    // For infinite loading, limit the number of detailed requests to avoid rate limiting
    const limitedList = contentList.slice(0, 12); // Increased from 8 to 12 for more content
    
    const detailedPromises = limitedList.map(async (item, index) => {
      try {
        // FIXED: Check if signal is already aborted before making the request
        if (signal?.aborted) {
          console.debug('Request aborted before fetch for detailed content');
          return item;
        }

        // Add delay between requests to respect rate limits (reduced delay for faster loading)
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 200ms to 100ms
        }
        
        const response = await fetch(
          `https://api.themoviedb.org/3/${contentType}/${item.id}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&append_to_response=credits`,
          { signal }
        );
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('Rate limit hit, skipping detailed fetch for item:', item.id);
            return item;
          }
          // FIXED: Handle 404 errors gracefully for non-existent content
          if (response.status === 404) {
            console.debug(`Content ${item.id} not found (404) for detailed content`);
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
          popularity: item.popularity,
          // NEW: Enhanced metadata for better recommendations
          belongs_to_collection: details.belongs_to_collection || null,
          production_countries: details.production_countries || [],
          production_companies: details.production_companies || [],
          budget: details.budget,
          revenue: details.revenue,
          runtime: details.runtime,
          spoken_languages: details.spoken_languages || [],
          status: details.status,
          adult: details.adult
        };
      } catch (error) {
        // FIXED: Handle AbortError gracefully
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          console.debug(`Request aborted for detailed content ${item.id}:`, error.message);
          return item;
        }
        
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
      popularity: item.popularity,
      // NEW: Enhanced metadata for better recommendations
      belongs_to_collection: null,
      production_countries: [],
      production_companies: [],
      budget: null,
      revenue: null,
      runtime: null,
      spoken_languages: [],
      status: null,
      adult: null
    }));
    
    return [...detailedResults, ...remainingItems];
  }

  // Netflix-level personalized recommendations with advanced strategies
  async getPersonalizedRecommendations(userId, contentType = 'movie', options = {}) {
    const {
      limit = 50,
      includeWatchHistory = true,
      includePreferences = true,
      strategy = 'hybrid', // 'hybrid', 'collaborative', 'content-based', 'mood-based', 'deep-learning', 'reinforcement'
      useContextual = true,
      useDiversity = true,
      useFreshness = true
    } = options;

    try {
      let recommendations = [];
      
      switch (strategy) {
        case 'collaborative':
          recommendations = await this.collaborativeFiltering(userId, contentType, { limit });
          break;
        case 'content-based':
          recommendations = await this.contentBasedFiltering(userId, contentType, { limit });
          break;
        case 'deep-learning':
          recommendations = await this.deepLearningRecommendation(userId, contentType, { limit });
          break;
        case 'reinforcement':
          recommendations = await this.reinforcementLearningRecommendation(userId, contentType, { limit });
          break;
        case 'contextual':
          recommendations = await this.contextualRecommendation(userId, contentType, { limit });
          break;
        case 'mood-based':
          recommendations = await this.getMoodBasedRecommendations('excited', contentType, { limit });
          break;
        case 'hybrid':
        default:
          recommendations = await this.hybridRecommendation(userId, contentType, { limit });
          break;
      }
      
      // Apply Netflix-style post-processing
      if (useContextual) {
        recommendations = await this.applyContextualBoost(recommendations, userId);
      }
      
      if (useDiversity) {
        recommendations = this.applyDiversityBoost(recommendations);
      }
      
      if (useFreshness) {
        recommendations = this.applyFreshnessBoost(recommendations);
      }
      
      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  // Netflix-level hybrid recommendation system with advanced algorithms
  async hybridRecommendation(userId, contentType = 'movie', options = {}) {
    const {
      limit = 50,
      collaborativeWeight = 0.4,
      contentWeight = 0.3,
      contextualWeight = 0.2,
      diversityWeight = 0.1
    } = options;

    try {
      // Get recommendations from multiple advanced strategies
      const [collaborative, contentBased, contextual, deepLearning] = await Promise.allSettled([
        this.collaborativeFiltering(userId, contentType, { limit: Math.ceil(limit * 1.5) }),
        this.contentBasedFiltering(userId, contentType, { limit: Math.ceil(limit * 1.5) }),
        this.contextualRecommendation(userId, contentType, { limit: Math.ceil(limit * 1.5) }),
        this.deepLearningRecommendation(userId, contentType, { limit: Math.ceil(limit * 1.5) })
      ]);

      // Combine recommendations with sophisticated weighting
      const combinedRecommendations = new Map();

      // Add collaborative recommendations with weight
      if (collaborative.status === 'fulfilled') {
        for (const rec of collaborative.value) {
          const currentScore = combinedRecommendations.get(rec.id) || 0;
          combinedRecommendations.set(rec.id, currentScore + rec.score * collaborativeWeight);
        }
      }

      // Add content-based recommendations with weight
      if (contentBased.status === 'fulfilled') {
        for (const rec of contentBased.value) {
          const currentScore = combinedRecommendations.get(rec.id) || 0;
          combinedRecommendations.set(rec.id, currentScore + rec.score * contentWeight);
        }
      }

      // Add contextual recommendations with weight
      if (contextual.status === 'fulfilled') {
        for (const rec of contextual.value) {
          const currentScore = combinedRecommendations.get(rec.id) || 0;
          combinedRecommendations.set(rec.id, currentScore + rec.score * contextualWeight);
        }
      }

      // Add deep learning recommendations with weight
      if (deepLearning.status === 'fulfilled') {
        for (const rec of deepLearning.value) {
          const currentScore = combinedRecommendations.get(rec.id) || 0;
          combinedRecommendations.set(rec.id, currentScore + rec.score * diversityWeight);
        }
      }

      // Convert to array and sort by combined score
      const recommendations = Array.from(combinedRecommendations.entries())
        .map(([id, score]) => ({ id, score }))
        .sort((a, b) => b.score - a.score);

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Hybrid recommendation error:', error);
      return this.getFallbackRecommendations(contentType, limit);
    }
  }

  // Netflix-level collaborative filtering with matrix factorization
  async collaborativeFiltering(userId, contentType = 'movie', options = {}) {
    const {
      limit = 50,
      minSimilarity = 0.3,
      useMatrixFactorization = true,
      useNeuralNetwork = false
    } = options;

    try {
      // Get user interaction history
      const userHistory = await this.getUserInteractionHistory(userId);
      const similarUsers = await this.findSimilarUsers(userId, userHistory);
      
      if (similarUsers.length === 0) {
        return this.getFallbackRecommendations(contentType, limit);
      }

      let recommendations = [];

      if (useMatrixFactorization) {
        // Matrix Factorization approach (like Netflix's algorithm)
        recommendations = await this.matrixFactorizationRecommendation(
          userId, 
          similarUsers, 
          contentType, 
          limit
        );
      } else if (useNeuralNetwork) {
        // Neural Network approach
        recommendations = await this.neuralNetworkRecommendation(
          userId, 
          userHistory, 
          contentType, 
          limit
        );
      } else {
        // Traditional collaborative filtering
        recommendations = await this.traditionalCollaborativeFiltering(
          userId, 
          similarUsers, 
          contentType, 
          limit
        );
      }

      return this.postProcessRecommendations(recommendations, userId, contentType);
    } catch (error) {
      console.error('Collaborative filtering error:', error);
      return this.getFallbackRecommendations(contentType, limit);
    }
  }

  // Matrix Factorization (Netflix Prize approach)
  async matrixFactorizationRecommendation(userId, similarUsers, contentType, limit) {
    const userItemMatrix = await this.buildUserItemMatrix(similarUsers);
    const latentFactors = 20; // Number of latent factors
    
    // Simplified matrix factorization
    const userFactors = new Map();
    const itemFactors = new Map();
    
    // Initialize factors randomly
    for (const user of similarUsers) {
      userFactors.set(user.id, Array.from({length: latentFactors}, () => Math.random()));
    }
    
    // Get items from similar users
    const items = new Set();
    for (const user of similarUsers) {
      const userItems = await this.getUserRatedItems(user.id);
      userItems.forEach(item => items.add(item.id));
    }
    
    for (const itemId of items) {
      itemFactors.set(itemId, Array.from({length: latentFactors}, () => Math.random()));
    }
    
    // Gradient descent optimization (simplified)
    const learningRate = 0.01;
    const iterations = 50;
    
    for (let iter = 0; iter < iterations; iter++) {
      for (const user of similarUsers) {
        const userItems = await this.getUserRatedItems(user.id);
        
        for (const item of userItems) {
          const actualRating = item.rating;
          const predictedRating = this.dotProduct(
            userFactors.get(user.id), 
            itemFactors.get(item.id)
          );
          
          const error = actualRating - predictedRating;
          
          // Update factors
          const userFactor = userFactors.get(user.id);
          const itemFactor = itemFactors.get(item.id);
          
          for (let i = 0; i < latentFactors; i++) {
            userFactor[i] += learningRate * error * itemFactor[i];
            itemFactor[i] += learningRate * error * userFactor[i];
          }
        }
      }
    }
    
    // Generate recommendations for target user
    const targetUserFactor = userFactors.get(userId) || 
      Array.from({length: latentFactors}, () => Math.random());
    
    const recommendations = [];
    for (const [itemId, itemFactor] of itemFactors) {
      const score = this.dotProduct(targetUserFactor, itemFactor);
      recommendations.push({ id: itemId, score });
    }
    
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Neural Network Recommendation (Deep Learning approach)
  async neuralNetworkRecommendation(userId, userHistory, contentType, limit) {
    // Simplified neural network for recommendation
    const inputFeatures = await this.extractUserFeatures(userId, userHistory);
    const network = this.buildRecommendationNetwork();
    
    const recommendations = [];
    const candidateItems = await this.getCandidateItems(contentType, 1000);
    
    for (const item of candidateItems) {
      const itemFeatures = await this.extractItemFeatures(item);
      const combinedFeatures = [...inputFeatures, ...itemFeatures];
      
      const prediction = this.forwardPass(network, combinedFeatures);
      recommendations.push({ id: item.id, score: prediction });
    }
    
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Build neural network for recommendations
  buildRecommendationNetwork() {
    return {
      layers: [
        { type: 'input', size: 50 },
        { type: 'hidden', size: 100, activation: 'relu' },
        { type: 'hidden', size: 50, activation: 'relu' },
        { type: 'output', size: 1, activation: 'sigmoid' }
      ],
      weights: this.initializeWeights([50, 100, 50, 1])
    };
  }

  // Initialize neural network weights
  initializeWeights(layerSizes) {
    const weights = [];
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const layer = [];
      for (let j = 0; j < layerSizes[i + 1]; j++) {
        const neuron = [];
        for (let k = 0; k < layerSizes[i]; k++) {
          neuron.push(Math.random() * 2 - 1);
        }
        layer.push(neuron);
      }
      weights.push(layer);
    }
    return weights;
  }

  // Forward pass through neural network
  forwardPass(network, input) {
    let currentLayer = input;
    
    for (let i = 0; i < network.weights.length; i++) {
      const newLayer = [];
      for (let j = 0; j < network.weights[i].length; j++) {
        let sum = 0;
        for (let k = 0; k < network.weights[i][j].length; k++) {
          sum += currentLayer[k] * network.weights[i][j][k];
        }
        newLayer.push(this.activate(sum, 'relu'));
      }
      currentLayer = newLayer;
    }
    
    return currentLayer[0];
  }

  // Activation function
  activate(x, type) {
    switch (type) {
      case 'relu':
        return Math.max(0, x);
      case 'sigmoid':
        return 1 / (1 + Math.exp(-x));
      default:
        return x;
    }
  }

  // Traditional collaborative filtering
  async traditionalCollaborativeFiltering(userId, similarUsers, contentType, limit) {
    const recommendations = new Map();
    
    for (const similarUser of similarUsers) {
      const userItems = await this.getUserRatedItems(similarUser.id);
      
      for (const item of userItems) {
        const currentScore = recommendations.get(item.id) || 0;
        recommendations.set(item.id, currentScore + item.rating * similarUser.similarity);
      }
    }
    
    return Array.from(recommendations.entries())
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Netflix-level content-based filtering with advanced feature engineering
  async contentBasedFiltering(userId, contentType = 'movie', options = {}) {
    const {
      limit = 50,
      useTFIDF = true,
      useWordEmbeddings = false,
      useDeepFeatures = false
    } = options;

    try {
      const userProfile = await this.buildUserProfile(userId);
      const candidateItems = await this.getCandidateItems(contentType, 500);
      
      let recommendations = [];

      if (useDeepFeatures) {
        recommendations = await this.deepFeatureMatching(userProfile, candidateItems, limit);
      } else if (useWordEmbeddings) {
        recommendations = await this.wordEmbeddingRecommendation(userProfile, candidateItems, limit);
      } else if (useTFIDF) {
        recommendations = await this.tfidfRecommendation(userProfile, candidateItems, limit);
      } else {
        recommendations = await this.traditionalContentBasedFiltering(userProfile, candidateItems, limit);
      }

      return this.postProcessRecommendations(recommendations, userId, contentType);
    } catch (error) {
      console.error('Content-based filtering error:', error);
      return this.getFallbackRecommendations(contentType, limit);
    }
  }

  // TF-IDF based recommendation
  async tfidfRecommendation(userProfile, candidateItems, limit) {
    const userTFIDF = this.calculateTFIDF(userProfile);
    const recommendations = [];

    for (const item of candidateItems) {
      const itemTFIDF = this.calculateTFIDF(item);
      const similarity = this.cosineSimilarity(userTFIDF, itemTFIDF);
      recommendations.push({ id: item.id, score: similarity });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Calculate TF-IDF for content
  calculateTFIDF(content) {
    const tfidf = new Map();
    const words = this.extractWords(content);
    const wordCount = new Map();

    // Calculate term frequency
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }

    // Calculate TF-IDF
    for (const [word, count] of wordCount) {
      const tf = count / words.length;
      const idf = this.calculateIDF(word);
      tfidf.set(word, tf * idf);
    }

    return tfidf;
  }

  // Calculate Inverse Document Frequency
  calculateIDF(word) {
    // Simplified IDF calculation
    const totalDocs = 10000; // Approximate total documents
    const docsWithWord = 100; // Approximate documents containing word
    return Math.log(totalDocs / docsWithWord);
  }

  // Cosine similarity between two TF-IDF vectors
  cosineSimilarity(tfidf1, tfidf2) {
    const allWords = new Set([...tfidf1.keys(), ...tfidf2.keys()]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const word of allWords) {
      const val1 = tfidf1.get(word) || 0;
      const val2 = tfidf2.get(word) || 0;
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Traditional content-based filtering
  async traditionalContentBasedFiltering(userProfile, candidateItems, limit) {
    const recommendations = [];

    for (const item of candidateItems) {
      const similarity = this.calculateContentSimilarity(userProfile, item);
      recommendations.push({ id: item.id, score: similarity });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Calculate content similarity
  calculateContentSimilarity(userProfile, item) {
    let similarity = 0;

    // Genre similarity
    if (userProfile.genres && item.genres) {
      const genreOverlap = this.calculateGenreOverlap(userProfile.genres, item.genres);
      similarity += genreOverlap * this.relevanceWeights.genre;
    }

    // Cast similarity
    if (userProfile.favoriteActors && item.cast) {
      const actorOverlap = this.calculateActorOverlap(userProfile.favoriteActors, item.cast);
      similarity += actorOverlap * this.relevanceWeights.cast;
    }

    // Year similarity
    if (userProfile.preferredYears && item.year) {
      const yearSimilarity = this.calculateYearSimilarity(userProfile.preferredYears, item.year);
      similarity += yearSimilarity * this.relevanceWeights.year;
    }

    return similarity;
  }

  // Deep feature matching
  async deepFeatureMatching(userProfile, candidateItems, limit) {
    const userEmbedding = await this.getUserEmbedding(userProfile);
    const recommendations = [];

    for (const item of candidateItems) {
      const itemEmbedding = await this.getItemEmbedding(item.id);
      const similarity = this.cosineSimilarity(userEmbedding, itemEmbedding);
      recommendations.push({ id: item.id, score: similarity });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Word embedding recommendation
  async wordEmbeddingRecommendation(userProfile, candidateItems, limit) {
    const userEmbedding = this.getWordEmbedding(userProfile);
    const recommendations = [];

    for (const item of candidateItems) {
      const itemEmbedding = this.getWordEmbedding(item);
      const similarity = this.cosineSimilarity(userEmbedding, itemEmbedding);
      recommendations.push({ id: item.id, score: similarity });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Get word embedding (simplified)
  getWordEmbedding(content) {
    // Simplified word embedding
    const embedding = new Array(50).fill(0);
    const words = this.extractWords(content);
    
    for (let i = 0; i < Math.min(words.length, 50); i++) {
      embedding[i] = words[i].length / 10; // Simple hash-based embedding
    }
    
    return embedding;
  }

  // Extract words from content
  extractWords(content) {
    if (typeof content === 'string') {
      return content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2);
    }
    return [];
  }

  // Netflix-level user preference management
  async getUserPreferences(userId) {
    // This would fetch from user database
    // For now, return simulated preferences with advanced features
    return {
      genres: [28, 12, 35], // Action, Adventure, Comedy
      recentWatched: [
        { id: 550, title: 'Fight Club', rating: 5, timestamp: Date.now() - 86400000 },
        { id: 13, title: 'Forrest Gump', rating: 4, timestamp: Date.now() - 172800000 },
        { id: 680, title: 'Pulp Fiction', rating: 5, timestamp: Date.now() - 259200000 }
      ],
      favoriteActors: [62, 1100, 976], // Actor IDs
      preferredYears: [1990, 2010],
      mood: 'excited',
      watchPatterns: {
        bingeWatching: 0.3,
        genrePreference: 0.25,
        timeBased: 0.20,
        socialInfluence: 0.15,
        moodBased: 0.10
      },
      contentMaturity: 'adult',
      languagePreference: 'en',
      subtitlePreference: true,
      qualityPreference: 'high'
    };
  }

  // Netflix-level contextual recommendation
  async contextualRecommendation(userId, contentType = 'movie', options = {}) {
    const {
      limit = 50,
      timeOfDay = this.getTimeOfDay(),
      dayOfWeek = this.getDayOfWeek(),
      season = this.getSeason(),
      weather = await this.getWeather(),
      mood = await this.getUserMood(userId)
    } = options;

    try {
      const contextualFactors = {
        timeOfDay,
        dayOfWeek,
        season,
        weather,
        mood
      };

      const recommendations = await this.getContextualRecommendations(contextualFactors, contentType, limit);
      return this.postProcessRecommendations(recommendations, userId, contentType);
    } catch (error) {
      console.error('Contextual recommendation error:', error);
      return this.getFallbackRecommendations(contentType, limit);
    }
  }

  // Deep learning recommendation
  async deepLearningRecommendation(userId, contentType = 'movie', options = {}) {
    const {
      limit = 50,
      useAttention = true,
      useTransformer = false
    } = options;

    try {
      const userEmbedding = await this.getUserEmbedding(userId);
      const candidateItems = await this.getCandidateItems(contentType, 1000);
      
      let recommendations = [];

      if (useTransformer) {
        recommendations = await this.transformerRecommendation(userEmbedding, candidateItems, limit);
      } else if (useAttention) {
        recommendations = await this.attentionBasedRecommendation(userEmbedding, candidateItems, limit);
      } else {
        recommendations = await this.deepNeuralRecommendation(userEmbedding, candidateItems, limit);
      }

      return this.postProcessRecommendations(recommendations, userId, contentType);
    } catch (error) {
      console.error('Deep learning recommendation error:', error);
      return this.getFallbackRecommendations(contentType, limit);
    }
  }

  // Reinforcement learning recommendation
  async reinforcementLearningRecommendation(userId, contentType = 'movie', options = {}) {
    const {
      limit = 50,
      explorationRate = 0.1,
      useMultiArmedBandit = true
    } = options;

    try {
      let recommendations = [];

      if (useMultiArmedBandit) {
        recommendations = await this.multiArmedBanditRecommendation(userId, contentType, limit, explorationRate);
      } else {
        recommendations = await this.qLearningRecommendation(userId, contentType, limit);
      }

      return this.postProcessRecommendations(recommendations, userId, contentType);
    } catch (error) {
      console.error('Reinforcement learning recommendation error:', error);
      return this.getFallbackRecommendations(contentType, limit);
    }
  }

  // Multi-armed bandit recommendation
  async multiArmedBanditRecommendation(userId, contentType, limit, explorationRate) {
    const userProfile = await this.getUserProfile(userId);
    const candidateItems = await this.getCandidateItems(contentType, 200);
    
    // UCB (Upper Confidence Bound) algorithm
    const recommendations = [];
    
    for (const item of candidateItems) {
      const exploitation = userProfile.getExpectedReward(item.id) || 0;
      const exploration = Math.sqrt(Math.log(userProfile.getTotalPlays()) / (userProfile.getItemPlays(item.id) || 1));
      const ucbScore = exploitation + explorationRate * exploration;
      
      recommendations.push({ id: item.id, score: ucbScore });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Attention-based recommendation
  async attentionBasedRecommendation(userEmbedding, candidateItems, limit) {
    const recommendations = [];

    for (const item of candidateItems) {
      const itemEmbedding = await this.getItemEmbedding(item.id);
      const attentionScore = this.calculateAttentionScore(userEmbedding, itemEmbedding);
      recommendations.push({ id: item.id, score: attentionScore });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Calculate attention score
  calculateAttentionScore(userEmbedding, itemEmbedding) {
    // Simplified attention mechanism
    const query = userEmbedding;
    const key = itemEmbedding;
    const value = itemEmbedding;

    const attentionWeight = this.dotProduct(query, key) / Math.sqrt(query.length);
    const attentionScore = this.softmax(attentionWeight) * this.dotProduct(attentionWeight, value);

    return attentionScore;
  }

  // Softmax function
  softmax(x) {
    return Math.exp(x) / (1 + Math.exp(x));
  }

  // Apply contextual boost
  async applyContextualBoost(recommendations, userId) {
    const contextualFactors = {
      timeOfDay: this.getTimeOfDay(),
      dayOfWeek: this.getDayOfWeek(),
      season: this.getSeason(),
      weather: await this.getWeather(),
      mood: await this.getUserMood(userId)
    };

    return recommendations.map(rec => {
      let contextualScore = rec.score;
      
      // Time-based boost
      if (contextualFactors.timeOfDay === 'night' && rec.genres?.includes('Horror')) {
        contextualScore += 0.1;
      }
      
      // Mood-based boost
      if (contextualFactors.mood === 'excited' && rec.genres?.includes('Action')) {
        contextualScore += 0.1;
      }
      
      return { ...rec, score: contextualScore };
    }).sort((a, b) => b.score - a.score);
  }

  // Apply diversity boost
  applyDiversityBoost(recommendations) {
    const diverseRecommendations = [];
    const usedGenres = new Set();
    const usedYears = new Set();

    for (const rec of recommendations) {
      const item = this.getItemDetails(rec.id);
      let diversityScore = rec.score;

      // Boost diversity for different genres
      if (item.genres && !item.genres.some(genre => usedGenres.has(genre))) {
        diversityScore += 0.05;
        item.genres.forEach(genre => usedGenres.add(genre));
      }

      // Boost diversity for different years
      if (item.year && !usedYears.has(item.year)) {
        diversityScore += 0.03;
        usedYears.add(item.year);
      }

      diverseRecommendations.push({ ...rec, score: diversityScore });
    }

    return diverseRecommendations.sort((a, b) => b.score - a.score);
  }

  // Apply freshness boost
  applyFreshnessBoost(recommendations) {
    const currentYear = new Date().getFullYear();
    
    return recommendations.map(rec => {
      let freshScore = rec.score;
      
      // Boost recent content
      if (rec.year && rec.year >= currentYear - 2) {
        freshScore += 0.05;
      }
      
      return { ...rec, score: freshScore };
    }).sort((a, b) => b.score - a.score);
  }

  // Post-process recommendations
  async postProcessRecommendations(recommendations, userId, contentType) {
    // Add diversity
    const diverseRecommendations = this.applyDiversityBoost(recommendations);
    
    // Add personalization
    const personalizedRecommendations = await this.addPersonalization(diverseRecommendations, userId);
    
    // Add freshness (new content boost)
    const freshRecommendations = this.applyFreshnessBoost(personalizedRecommendations);
    
    return freshRecommendations;
  }

  // Add personalization
  async addPersonalization(recommendations, userId) {
    const userPreferences = await this.getUserPreferences(userId);
    
    return recommendations.map(rec => {
      let personalizedScore = rec.score;
      
      // Boost based on user preferences
      if (userPreferences.genres && rec.genres) {
        const genreOverlap = rec.genres.filter(genre => 
          userPreferences.genres.includes(genre)
        ).length;
        personalizedScore += genreOverlap * 0.1;
      }
      
      return { ...rec, score: personalizedScore };
    }).sort((a, b) => b.score - a.score);
  }

  // Get user profile for RL
  async getUserProfile(userId) {
    return {
      getExpectedReward: (itemId) => Math.random(),
      getTotalPlays: () => 100,
      getItemPlays: (itemId) => Math.floor(Math.random() * 10)
    };
  }

  // Contextual factors
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  getDayOfWeek() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  }

  getSeason() {
    const month = new Date().getMonth();
    if (month < 3) return 'winter';
    if (month < 6) return 'spring';
    if (month < 9) return 'summer';
    return 'autumn';
  }

  async getWeather() {
    // This would fetch weather data
    return 'sunny';
  }

  async getUserMood(userId) {
    // This would analyze user behavior to determine mood
    return 'excited';
  }

  // Get user interaction history
  async getUserInteractionHistory(userId) {
    // This would fetch from database
    // For now, return simulated data
    return [
      { itemId: 550, rating: 5, timestamp: Date.now() - 86400000 },
      { itemId: 13, rating: 4, timestamp: Date.now() - 172800000 },
      { itemId: 680, rating: 5, timestamp: Date.now() - 259200000 }
    ];
  }

  // Find similar users
  async findSimilarUsers(userId, userHistory) {
    // This would use collaborative filtering to find similar users
    // For now, return simulated similar users
    return [
      { id: 'user2', similarity: 0.8 },
      { id: 'user3', similarity: 0.7 },
      { id: 'user4', similarity: 0.6 }
    ];
  }

  // Get user rated items
  async getUserRatedItems(userId) {
    // This would fetch from database
    return [
      { id: 550, rating: 5 },
      { id: 13, rating: 4 },
      { id: 680, rating: 5 }
    ];
  }

  // Build user-item matrix
  async buildUserItemMatrix(users) {
    const matrix = new Map();
    
    for (const user of users) {
      const userItems = await this.getUserRatedItems(user.id);
      matrix.set(user.id, userItems);
    }
    
    return matrix;
  }

  // Dot product for vectors
  dotProduct(vec1, vec2) {
    return vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  }

  // Extract user features
  async extractUserFeatures(userId, userHistory) {
    // Extract features from user history
    const features = new Array(25).fill(0);
    
    // Genre preferences
    const genreCounts = new Map();
    for (const item of userHistory) {
      const itemDetails = await this.getItemDetails(item.itemId);
      if (itemDetails.genres) {
        for (const genre of itemDetails.genres) {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        }
      }
    }
    
    // Convert to feature vector
    let featureIndex = 0;
    for (const [genre, count] of genreCounts) {
      if (featureIndex < 15) {
        features[featureIndex] = count;
        featureIndex++;
      }
    }
    
    // Add rating patterns
    features[15] = userHistory.reduce((sum, item) => sum + item.rating, 0) / userHistory.length;
    features[16] = userHistory.length;
    
    // Add time-based features
    const recentItems = userHistory.filter(item => 
      Date.now() - item.timestamp < 7 * 24 * 60 * 60 * 1000
    );
    features[17] = recentItems.length;
    
    return features;
  }

  // Extract item features
  async extractItemFeatures(item) {
    const features = new Array(25).fill(0);
    
    // Genre features
    if (item.genres) {
      for (let i = 0; i < Math.min(item.genres.length, 15); i++) {
        features[i] = 1;
      }
    }
    
    // Rating and popularity
    features[15] = item.vote_average || 0;
    features[16] = item.popularity || 0;
    
    // Year feature
    const year = new Date(item.release_date || item.first_air_date).getFullYear();
    features[17] = (year - 1900) / 200; // Normalized year
    
    return features;
  }

  // Get candidate items
  async getCandidateItems(contentType, limit) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/popular?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.results?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error fetching candidate items:', error);
      return [];
    }
  }

  // Build user profile
  async buildUserProfile(userId) {
    const userHistory = await this.getUserInteractionHistory(userId);
    const profile = new Map();
    
    for (const item of userHistory) {
      const itemDetails = await this.getItemDetails(item.itemId);
      if (itemDetails.genres) {
        for (const genre of itemDetails.genres) {
          const currentScore = profile.get(genre) || 0;
          profile.set(genre, currentScore + item.rating);
        }
      }
    }
    
    return profile;
  }

  // Get item details
  async getItemDetails(itemId) {
    // This would fetch from cache or API
    // For now, return simulated data
    return {
      id: itemId,
      genres: ['Action', 'Drama'],
      vote_average: 8.5,
      popularity: 100,
      release_date: '1999-01-01'
    };
  }

  // Get user embedding
  async getUserEmbedding(userId) {
    // This would use a trained model to generate user embeddings
    // For now, return random embedding
    return Array.from({length: 50}, () => Math.random());
  }

  // Get item embedding
  async getItemEmbedding(itemId) {
    // This would use a trained model to generate item embeddings
    // For now, return random embedding
    return Array.from({length: 50}, () => Math.random());
  }

  // Get fallback recommendations
  async getFallbackRecommendations(contentType, limit) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${contentType}/popular?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.results?.slice(0, limit).map(item => ({ id: item.id, score: 0.5 })) || [];
    } catch (error) {
      console.error('Error fetching fallback recommendations:', error);
      return [];
    }
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
  // Enhanced duplicate removal with multiple strategies
  removeDuplicates(contentList, options = {}) {
    const {
      strategy = 'id', // 'id', 'title', 'strict', 'smart'
      preserveOrder = true,
      keepBestScore = true
    } = options;

    if (!Array.isArray(contentList) || contentList.length === 0) {
      return [];
    }

    switch (strategy) {
      case 'strict':
        return this.removeDuplicatesStrict(contentList, { preserveOrder, keepBestScore });
      case 'title':
        return this.removeDuplicatesByTitle(contentList, { preserveOrder, keepBestScore });
      case 'smart':
        return this.removeDuplicatesSmart(contentList, { preserveOrder, keepBestScore });
      case 'id':
      default:
        return this.removeDuplicatesById(contentList, { preserveOrder, keepBestScore });
    }
  }

  // Remove duplicates by ID only (fastest)
  removeDuplicatesById(contentList, options = {}) {
    const { preserveOrder = true, keepBestScore = true } = options;
    const seen = new Map(); // Use Map to store item with best score

    return contentList.filter(item => {
      if (!item || !item.id) return false;

      if (seen.has(item.id)) {
        if (keepBestScore) {
          const existing = seen.get(item.id);
          const currentScore = item.similarityScore || 0;
          const existingScore = existing.similarityScore || 0;
          
          if (currentScore > existingScore) {
            seen.set(item.id, item);
            return true; // Keep this one, filter out the previous
          }
          return false; // Keep the existing one with better score
        }
        return false; // Filter out duplicate
      }
      
      seen.set(item.id, item);
      return true;
    });
  }

  // Remove duplicates by title (handles different IDs for same content)
  removeDuplicatesByTitle(contentList, options = {}) {
    const { preserveOrder = true, keepBestScore = true } = options;
    const seen = new Map();

    return contentList.filter(item => {
      if (!item || !item.title && !item.name) return false;

      const title = (item.title || item.name || '').toLowerCase().trim();
      if (!title) return false;

      if (seen.has(title)) {
        if (keepBestScore) {
          const existing = seen.get(title);
          const currentScore = item.similarityScore || 0;
          const existingScore = existing.similarityScore || 0;
          
          if (currentScore > existingScore) {
            seen.set(title, item);
            return true;
          }
          return false;
        }
        return false;
      }
      
      seen.set(title, item);
      return true;
    });
  }

  // Strict duplicate removal (both ID and title)
  removeDuplicatesStrict(contentList, options = {}) {
    const { preserveOrder = true, keepBestScore = true } = options;
    const seenIds = new Map();
    const seenTitles = new Map();

    return contentList.filter(item => {
      if (!item) return false;

      const id = item.id;
      const title = (item.title || item.name || '').toLowerCase().trim();
      
      // Check if we've seen this ID or title before
      const hasIdDuplicate = id && seenIds.has(id);
      const hasTitleDuplicate = title && seenTitles.has(title);

      if (hasIdDuplicate || hasTitleDuplicate) {
        if (keepBestScore) {
          const currentScore = item.similarityScore || 0;
          
          if (hasIdDuplicate) {
            const existing = seenIds.get(id);
            const existingScore = existing.similarityScore || 0;
            if (currentScore > existingScore) {
              seenIds.set(id, item);
              if (title) seenTitles.set(title, item);
              return true;
            }
          }
          
          if (hasTitleDuplicate && !hasIdDuplicate) {
            const existing = seenTitles.get(title);
            const existingScore = existing.similarityScore || 0;
            if (currentScore > existingScore) {
              seenTitles.set(title, item);
              if (id) seenIds.set(id, item);
              return true;
            }
          }
        }
        return false;
      }
      
      // First time seeing this item
      if (id) seenIds.set(id, item);
      if (title) seenTitles.set(title, item);
      return true;
    });
  }

  // Smart duplicate removal with fuzzy matching
  removeDuplicatesSmart(contentList, options = {}) {
    const { preserveOrder = true, keepBestScore = true, similarityThreshold = 0.9 } = options;
    const uniqueItems = [];

    for (const item of contentList) {
      if (!item) continue;

      const isDuplicate = uniqueItems.some(existingItem => {
        // Check exact ID match
        if (item.id && existingItem.id && item.id === existingItem.id) {
          return true;
        }

        // Check exact title match
        const itemTitle = (item.title || item.name || '').toLowerCase().trim();
        const existingTitle = (existingItem.title || existingItem.name || '').toLowerCase().trim();
        
        if (itemTitle && existingTitle && itemTitle === existingTitle) {
          return true;
        }

        // Check fuzzy title similarity
        if (itemTitle && existingTitle && this.calculateTitleSimilarity(itemTitle, existingTitle) > similarityThreshold) {
          return true;
        }

        return false;
      });

      if (!isDuplicate) {
        uniqueItems.push(item);
      } else if (keepBestScore) {
        // Replace with better scoring item
        const existingIndex = uniqueItems.findIndex(existingItem => {
          if (item.id && existingItem.id && item.id === existingItem.id) return true;
          const itemTitle = (item.title || item.name || '').toLowerCase().trim();
          const existingTitle = (existingItem.title || existingItem.name || '').toLowerCase().trim();
          return itemTitle && existingTitle && itemTitle === existingTitle;
        });

        if (existingIndex !== -1) {
          const existing = uniqueItems[existingIndex];
          const currentScore = item.similarityScore || 0;
          const existingScore = existing.similarityScore || 0;
          
          if (currentScore > existingScore) {
            uniqueItems[existingIndex] = item;
          }
        }
      }
    }

    return uniqueItems;
  }

  // Calculate title similarity using Levenshtein distance
  calculateTitleSimilarity(title1, title2) {
    if (!title1 || !title2) return 0;
    
    const longer = title1.length > title2.length ? title1 : title2;
    const shorter = title1.length > title2.length ? title2 : title1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  // Levenshtein distance calculation
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
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
        `https://api.themoviedb.org/3/discover/${contentType}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&${queryParams.toString()}`
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
      includeContemporary = true,
      useRegionalVariants = true // NEW: Use regional variants for better cultural matching
    } = options;

    const culturalMap = {
      // Asian Cultures
      'bollywood': { language: 'hi', region: 'asia', genres: [10749, 35, 18], countries: ['IN'], variants: ['indian-cinema', 'hindi-films'] },
      'korean-wave': { language: 'ko', region: 'asia', genres: [18, 10749, 35], countries: ['KR'], variants: ['k-drama', 'korean-cinema'] },
      'anime': { language: 'ja', region: 'asia', genres: [16, 878, 14], countries: ['JP'], variants: ['japanese-animation', 'manga-adaptation'] },
      'chinese-cinema': { language: 'zh', region: 'asia', genres: [28, 18, 14], countries: ['CN', 'HK', 'TW'], variants: ['wuxia', 'chinese-drama'] },
      'japanese-cinema': { language: 'ja', region: 'asia', genres: [18, 53, 27], countries: ['JP'], variants: ['japanese-drama', 'samurai-films'] },
      'thai-cinema': { language: 'th', region: 'asia', genres: [35, 18, 10749], countries: ['TH'], variants: ['thai-drama', 'thai-comedy'] },
      'vietnamese-cinema': { language: 'vi', region: 'asia', genres: [18, 10749, 35], countries: ['VN'], variants: ['vietnamese-drama'] },
      
      // European Cultures
      'european-arthouse': { language: 'fr', region: 'europe', genres: [18, 9648, 99], countries: ['FR', 'DE', 'IT'], variants: ['art-house', 'experimental'] },
      'scandinavian-noir': { language: 'sv', region: 'scandinavia', genres: [53, 9648, 18], countries: ['SE', 'NO', 'DK'], variants: ['nordic-noir', 'scandinavian-crime'] },
      'french-new-wave': { language: 'fr', region: 'europe', genres: [18, 9648, 35], countries: ['FR'], variants: ['nouvelle-vague', 'french-cinema'] },
      'italian-neorealism': { language: 'it', region: 'europe', genres: [18, 36, 99], countries: ['IT'], variants: ['neorealismo', 'italian-cinema'] },
      'german-expressionism': { language: 'de', region: 'europe', genres: [27, 53, 18], countries: ['DE'], variants: ['expressionist', 'german-cinema'] },
      'british-cinema': { language: 'en', region: 'europe', genres: [18, 35, 36], countries: ['GB'], variants: ['british-drama', 'british-comedy'] },
      'spanish-cinema': { language: 'es', region: 'europe', genres: [18, 35, 10749], countries: ['ES'], variants: ['spanish-drama', 'spanish-comedy'] },
      
      // Latin American Cultures
      'telenovelas': { language: 'es', region: 'latin-america', genres: [10749, 18, 35], countries: ['MX', 'BR', 'AR'], variants: ['soap-opera', 'latin-drama'] },
      'brazilian-cinema': { language: 'pt', region: 'latin-america', genres: [18, 35, 10749], countries: ['BR'], variants: ['brazilian-drama', 'brazilian-comedy'] },
      'mexican-cinema': { language: 'es', region: 'latin-america', genres: [18, 35, 27], countries: ['MX'], variants: ['mexican-drama', 'mexican-horror'] },
      'argentine-cinema': { language: 'es', region: 'latin-america', genres: [18, 9648, 35], countries: ['AR'], variants: ['argentine-drama', 'argentine-comedy'] },
      
      // Middle Eastern Cultures
      'turkish-drama': { language: 'tr', region: 'middle-east', genres: [18, 10749, 35], countries: ['TR'], variants: ['turkish-soap', 'turkish-drama'] },
      'iranian-cinema': { language: 'fa', region: 'middle-east', genres: [18, 9648, 99], countries: ['IR'], variants: ['iranian-drama', 'iranian-art-house'] },
      'israeli-cinema': { language: 'he', region: 'middle-east', genres: [18, 35, 53], countries: ['IL'], variants: ['israeli-drama', 'israeli-comedy'] },
      
      // African Cultures
      'nollywood': { language: 'en', region: 'africa', genres: [18, 35, 10749], countries: ['NG'], variants: ['nigerian-cinema', 'african-drama'] },
      'south-african-cinema': { language: 'en', region: 'africa', genres: [18, 35, 53], countries: ['ZA'], variants: ['south-african-drama'] },
      'egyptian-cinema': { language: 'ar', region: 'africa', genres: [18, 35, 10749], countries: ['EG'], variants: ['egyptian-drama', 'egyptian-comedy'] },
      
      // North American Cultures
      'american-indie': { language: 'en', region: 'north-america', genres: [18, 35, 9648], countries: ['US'], variants: ['independent-film', 'indie-drama'] },
      'canadian-cinema': { language: 'en', region: 'north-america', genres: [18, 35, 99], countries: ['CA'], variants: ['canadian-drama', 'canadian-comedy'] },
      
      // Oceanian Cultures
      'australian-cinema': { language: 'en', region: 'oceania', genres: [18, 35, 53], countries: ['AU'], variants: ['australian-drama', 'australian-comedy'] },
      'new-zealand-cinema': { language: 'en', region: 'oceania', genres: [18, 35, 12], countries: ['NZ'], variants: ['new-zealand-drama'] }
    };

    const cultureConfig = culturalMap[culture.toLowerCase()];
    if (!cultureConfig) {
      return [];
    }

    try {
      const recommendations = [];
      
      // Get language-specific content with enhanced filtering
      const languageContent = await this.getLanguageSpecificRecommendations(
        cultureConfig.language, 
        contentType, 
        { 
          limit: Math.ceil(limit / 2),
          quality: 'high',
          includeSubtitles: true
        }
      );
      recommendations.push(...languageContent);

      // Get region-specific content with country filtering
      const regionContent = await this.getRegionSpecificRecommendations(
        cultureConfig.region, 
        contentType, 
        { 
          limit: Math.ceil(limit / 2),
          includeLocalProductions: true,
          includeCoProductions: true
        }
      );
      recommendations.push(...regionContent);

      // NEW: Get country-specific content for more precise cultural matching
      if (cultureConfig.countries && cultureConfig.countries.length > 0) {
        for (const country of cultureConfig.countries.slice(0, 2)) {
          try {
            const countryContent = await this.fetchContentByCountry(country, contentType, Math.ceil(limit / 4));
            recommendations.push(...countryContent);
          } catch (error) {
            console.warn(`Failed to fetch content for country ${country}:`, error);
          }
        }
      }

      // NEW: Get genre-specific content for cultural content types
      if (cultureConfig.genres && cultureConfig.genres.length > 0) {
        for (const genreId of cultureConfig.genres.slice(0, 2)) {
          try {
            const genreContent = await this.fetchContentByGenre(genreId, contentType, 1);
            recommendations.push(...genreContent);
          } catch (error) {
            console.warn(`Failed to fetch content for genre ${genreId}:`, error);
          }
        }
      }

      // NEW: Use regional variants for better cultural matching
      if (useRegionalVariants && cultureConfig.variants) {
        for (const variant of cultureConfig.variants.slice(0, 2)) {
          try {
            const variantContent = await this.getCulturalVariantRecommendations(variant, contentType, Math.ceil(limit / 6));
            recommendations.push(...variantContent);
          } catch (error) {
            console.warn(`Failed to fetch content for variant ${variant}:`, error);
          }
        }
      }

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
        `https://api.themoviedb.org/3/discover/${contentType}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&${queryParams.toString()}`
      );
      const data = await response.json();
      
      return data.results?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error fetching characteristic-based recommendations:', error);
      return [];
    }
  }

  // NEW: Get franchise-based recommendations
  async getFranchiseBasedRecommendations(collectionId, contentType = 'movie', options = {}) {
    const {
      limit = 30,
      includeRelatedFranchises = true
    } = options;

    try {
      // Get collection details
      const collectionResponse = await fetch(
        `https://api.themoviedb.org/3/collection/${collectionId}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
      );
      
      if (!collectionResponse.ok) {
        throw new Error(`HTTP ${collectionResponse.status}: ${collectionResponse.statusText}`);
      }
      
      const collectionData = await collectionResponse.json();
      const collectionMovies = collectionData.parts || [];
      
      let recommendations = [...collectionMovies];
      
      // Include related franchises if requested
      if (includeRelatedFranchises) {
        const relatedFranchises = await this.getRelatedFranchises(collectionData.name, contentType, limit);
        recommendations = [...recommendations, ...relatedFranchises];
      }
      
      return this.removeDuplicates(recommendations).slice(0, limit);
    } catch (error) {
      console.error('Error fetching franchise-based recommendations:', error);
      return [];
    }
  }

  // NEW: Get related franchises
  async getRelatedFranchises(franchiseName, contentType = 'movie', limit = 20) {
    try {
      // Search for similar franchise names
      const searchResponse = await fetch(
        `https://api.themoviedb.org/3/search/collection?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(franchiseName)}&page=1`
      );
      
      if (!searchResponse.ok) {
        throw new Error(`HTTP ${searchResponse.status}: ${searchResponse.statusText}`);
      }
      
      const searchData = await searchResponse.json();
      const relatedCollections = searchData.results || [];
      
      const recommendations = [];
      
      for (const collection of relatedCollections.slice(0, 3)) {
        try {
          const collectionResponse = await fetch(
            `https://api.themoviedb.org/3/collection/${collection.id}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
          );
          
          if (collectionResponse.ok) {
            const collectionData = await collectionResponse.json();
            recommendations.push(...(collectionData.parts || []));
          }
        } catch (error) {
          console.warn(`Failed to fetch collection ${collection.id}:`, error);
        }
      }
      
      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error fetching related franchises:', error);
      return [];
    }
  }

  // NEW: Get actor-based recommendations
  async getActorBasedRecommendations(actorId, contentType = 'movie', options = {}) {
    const {
      limit = 30,
      includeCoStars = true,
      includeSimilarActors = true
    } = options;

    try {
      // Get actor's filmography
      const actorResponse = await fetch(
        `https://api.themoviedb.org/3/person/${actorId}/combined_credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
      );
      
      if (!actorResponse.ok) {
        throw new Error(`HTTP ${actorResponse.status}: ${actorResponse.statusText}`);
      }
      
      const actorData = await actorResponse.json();
      const actorMovies = actorData.cast || [];
      
      let recommendations = [...actorMovies];
      
      // Include movies with co-stars if requested
      if (includeCoStars) {
        const coStarMovies = await this.getCoStarRecommendations(actorId, contentType, limit);
        recommendations = [...recommendations, ...coStarMovies];
      }
      
      // Include movies with similar actors if requested
      if (includeSimilarActors) {
        const similarActorMovies = await this.getSimilarActorRecommendations(actorId, contentType, limit);
        recommendations = [...recommendations, ...similarActorMovies];
      }
      
      return this.removeDuplicates(recommendations).slice(0, limit);
    } catch (error) {
      console.error('Error fetching actor-based recommendations:', error);
      return [];
    }
  }

  // NEW: Get co-star recommendations
  async getCoStarRecommendations(actorId, contentType = 'movie', limit = 15) {
    try {
      // Get actor's filmography
      const actorResponse = await fetch(
        `https://api.themoviedb.org/3/person/${actorId}/combined_credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
      );
      
      if (!actorResponse.ok) {
        throw new Error(`HTTP ${actorResponse.status}: ${actorResponse.statusText}`);
      }
      
      const actorData = await actorResponse.json();
      const actorMovies = actorData.cast || [];
      
      // Get co-stars from recent movies
      const coStars = new Set();
      for (const movie of actorMovies.slice(0, 5)) {
        try {
          const movieCredits = await fetch(
            `https://api.themoviedb.org/3/${contentType}/${movie.id}/credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
          );
          
          if (movieCredits.ok) {
            const creditsData = await movieCredits.json();
            const cast = creditsData.cast || [];
            
            // Add co-stars (excluding the original actor)
            cast.forEach(person => {
              if (person.id !== actorId) {
                coStars.add(person.id);
              }
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch credits for movie ${movie.id}:`, error);
        }
      }
      
      // Get movies from co-stars
      const coStarMovies = [];
      for (const coStarId of Array.from(coStars).slice(0, 3)) {
        try {
          const coStarResponse = await fetch(
            `https://api.themoviedb.org/3/person/${coStarId}/combined_credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
          );
          
          if (coStarResponse.ok) {
            const coStarData = await coStarResponse.json();
            coStarMovies.push(...(coStarData.cast || []));
          }
        } catch (error) {
          console.warn(`Failed to fetch filmography for co-star ${coStarId}:`, error);
        }
      }
      
      return coStarMovies.slice(0, limit);
    } catch (error) {
      console.error('Error fetching co-star recommendations:', error);
      return [];
    }
  }

  // NEW: Get similar actor recommendations
  async getSimilarActorRecommendations(actorId, contentType = 'movie', limit = 15) {
    try {
      // Get similar actors
      const similarActorsResponse = await fetch(
        `https://api.themoviedb.org/3/person/${actorId}/similar?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=1`
      );
      
      if (!similarActorsResponse.ok) {
        throw new Error(`HTTP ${similarActorsResponse.status}: ${similarActorsResponse.statusText}`);
      }
      
      const similarActorsData = await similarActorsResponse.json();
      const similarActors = similarActorsData.results || [];
      
      // Get movies from similar actors
      const similarActorMovies = [];
      for (const actor of similarActors.slice(0, 3)) {
        try {
          const actorResponse = await fetch(
            `https://api.themoviedb.org/3/person/${actor.id}/combined_credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
          );
          
          if (actorResponse.ok) {
            const actorData = await actorResponse.json();
            similarActorMovies.push(...(actorData.cast || []));
          }
        } catch (error) {
          console.warn(`Failed to fetch filmography for similar actor ${actor.id}:`, error);
        }
      }
      
      return similarActorMovies.slice(0, limit);
    } catch (error) {
      console.error('Error fetching similar actor recommendations:', error);
      return [];
    }
  }

  // NEW: Get director-based recommendations
  async getDirectorBasedRecommendations(directorId, contentType = 'movie', options = {}) {
    const {
      limit = 30,
      includeSimilarDirectors = true
    } = options;

    try {
      // Get director's filmography
      const directorResponse = await fetch(
        `https://api.themoviedb.org/3/person/${directorId}/combined_credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
      );
      
      if (!directorResponse.ok) {
        throw new Error(`HTTP ${directorResponse.status}: ${directorResponse.statusText}`);
      }
      
      const directorData = await directorResponse.json();
      const directorMovies = directorData.crew?.filter(credit => credit.job === 'Director') || [];
      
      let recommendations = [...directorMovies];
      
      // Include movies from similar directors if requested
      if (includeSimilarDirectors) {
        const similarDirectorMovies = await this.getSimilarDirectorRecommendations(directorId, contentType, limit);
        recommendations = [...recommendations, ...similarDirectorMovies];
      }
      
      return this.removeDuplicates(recommendations).slice(0, limit);
    } catch (error) {
      console.error('Error fetching director-based recommendations:', error);
      return [];
    }
  }

  // NEW: Get similar director recommendations
  async getSimilarDirectorRecommendations(directorId, contentType = 'movie', limit = 15) {
    try {
      // Get similar directors
      const similarDirectorsResponse = await fetch(
        `https://api.themoviedb.org/3/person/${directorId}/similar?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=1`
      );
      
      if (!similarDirectorsResponse.ok) {
        throw new Error(`HTTP ${similarDirectorsResponse.status}: ${similarDirectorsResponse.statusText}`);
      }
      
      const similarDirectorsData = await similarDirectorsResponse.json();
      const similarDirectors = similarDirectorsData.results || [];
      
      // Get movies from similar directors
      const similarDirectorMovies = [];
      for (const director of similarDirectors.slice(0, 3)) {
        try {
          const directorResponse = await fetch(
            `https://api.themoviedb.org/3/person/${director.id}/combined_credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
          );
          
          if (directorResponse.ok) {
            const directorData = await directorResponse.json();
            const movies = directorData.crew?.filter(credit => credit.job === 'Director') || [];
            similarDirectorMovies.push(...movies);
          }
        } catch (error) {
          console.warn(`Failed to fetch filmography for similar director ${director.id}:`, error);
        }
      }
      
      return similarDirectorMovies.slice(0, limit);
    } catch (error) {
      console.error('Error fetching similar director recommendations:', error);
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

  // FIXED: Enhanced cleanup method for memory management
  performMemoryCleanup() {
    const now = Date.now();
    
    // Only cleanup if enough time has passed
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }
    
    this.lastCleanup = now;
    
    // Clear old cache entries
    if (this.cache && this.cache.getKeys) {
      const cacheKeys = this.cache.getKeys();
      if (cacheKeys.length > this.maxCacheSize) {
        // Remove oldest entries
        const keysToRemove = cacheKeys.slice(0, cacheKeys.length - this.maxCacheSize);
        keysToRemove.forEach(key => this.cache.delete(key));
      }
    }
    
    // Clear large Maps if they're getting too big
    if (this.userProfiles.size > 500) {
      this.userProfiles.clear();
    }
    
    if (this.contentProfiles.size > 1000) {
      this.contentProfiles.clear();
    }
    
    if (this.interactionMatrix.size > 500) {
      this.interactionMatrix.clear();
    }
    
    if (this.userCulturalPreferences.size > 200) {
      this.userCulturalPreferences.clear();
    }
    
    if (this.regionalContentBoost.size > 100) {
      this.regionalContentBoost.clear();
    }
    
    if (this.languageContentBoost.size > 100) {
      this.languageContentBoost.clear();
    }
    
    // Force garbage collection hint
    if (window.gc) {
      window.gc();
    }
  }

  // Get cache statistics
  getCacheStats() {
    return this.cache.getStats();
  }

  // NEW: Get regional language boost based on user's region
  getRegionalLanguageBoost(language, userRegion) {
    const regionalLanguagePreferences = {
      'north-america': { 'en': 0.3, 'es': 0.2, 'fr': 0.1 },
      'europe': { 'en': 0.2, 'fr': 0.3, 'de': 0.25, 'es': 0.2, 'it': 0.2 },
      'asia': { 'ja': 0.4, 'ko': 0.35, 'zh': 0.3, 'hi': 0.25, 'th': 0.2 },
      'latin-america': { 'es': 0.4, 'pt': 0.3, 'en': 0.15 },
      'middle-east': { 'ar': 0.4, 'tr': 0.3, 'he': 0.25, 'en': 0.15 },
      'africa': { 'en': 0.3, 'fr': 0.25, 'ar': 0.2 },
      'oceania': { 'en': 0.4, 'ma': 0.2 }
    };
    
    const preferences = regionalLanguagePreferences[userRegion] || {};
    return preferences[language] || 0;
  }

  // NEW: Check if content is from user's preferred region
  isContentFromRegion(item, userRegion) {
    if (!item.production_countries) return false;
    
    const regionCountries = {
      'north-america': ['US', 'CA', 'MX'],
      'europe': ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'RO', 'BG', 'GR'],
      'asia': ['JP', 'KR', 'CN', 'IN', 'TH', 'VN', 'ID', 'MY', 'PH', 'SG', 'TW', 'HK'],
      'latin-america': ['BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'MX'],
      'middle-east': ['TR', 'IL', 'AE', 'SA', 'EG', 'IR'],
      'africa': ['ZA', 'NG', 'EG', 'KE', 'GH'],
      'oceania': ['AU', 'NZ']
    };
    
    const userCountries = regionCountries[userRegion] || [];
    return item.production_countries.some(country => 
      userCountries.includes(typeof country === 'object' ? country.iso_3166_1 : country)
    );
  }

  // NEW: Calculate cultural affinity between content and user's region
  calculateCulturalAffinity(item1, item2, userRegion) {
    const culturalAffinityMap = {
      'north-america': {
        'action': 0.3, 'comedy': 0.25, 'drama': 0.2, 'family': 0.2,
        'western': 0.15, 'sci-fi': 0.2, 'horror': 0.15
      },
      'europe': {
        'drama': 0.3, 'comedy': 0.25, 'romance': 0.2, 'thriller': 0.2,
        'historical': 0.25, 'art-house': 0.3, 'documentary': 0.25
      },
      'asia': {
        'action': 0.3, 'drama': 0.3, 'romance': 0.25, 'horror': 0.2,
        'martial-arts': 0.35, 'anime': 0.4, 'thriller': 0.25
      },
      'latin-america': {
        'drama': 0.3, 'romance': 0.3, 'comedy': 0.25, 'thriller': 0.2,
        'telenovela': 0.4, 'family': 0.2
      },
      'middle-east': {
        'drama': 0.35, 'thriller': 0.25, 'romance': 0.2, 'historical': 0.25,
        'religious': 0.3, 'family': 0.2
      },
      'africa': {
        'drama': 0.35, 'comedy': 0.25, 'family': 0.2, 'documentary': 0.25,
        'historical': 0.25, 'romance': 0.2
      },
      'oceania': {
        'drama': 0.25, 'comedy': 0.3, 'adventure': 0.25, 'family': 0.2,
        'documentary': 0.25, 'thriller': 0.2
      }
    };
    
    const regionAffinities = culturalAffinityMap[userRegion] || {};
    let affinity = 0;
    
    // Check genre affinities for both items
    if (item1.genres) {
      for (const genre of item1.genres) {
        const genreName = typeof genre === 'object' ? genre.name : genre;
        affinity += regionAffinities[genreName.toLowerCase()] || 0;
      }
    }
    
    if (item2.genres) {
      for (const genre of item2.genres) {
        const genreName = typeof genre === 'object' ? genre.name : genre;
        affinity += regionAffinities[genreName.toLowerCase()] || 0;
      }
    }
    
    return Math.min(0.5, affinity / 2); // Cap at 0.5 boost
  }

  // NEW: Calculate cultural content type similarity
  calculateCulturalContentSimilarity(item1, item2, userRegion) {
    const culturalContentTypes = {
      'bollywood': ['musical', 'romance', 'family', 'drama'],
      'korean-wave': ['drama', 'romance', 'thriller', 'comedy'],
      'anime': ['animation', 'fantasy', 'sci-fi', 'adventure'],
      'nollywood': ['drama', 'comedy', 'family', 'romance'],
      'telenovelas': ['romance', 'drama', 'family', 'soap'],
      'european-arthouse': ['drama', 'art-house', 'experimental', 'documentary'],
      'scandinavian-noir': ['thriller', 'crime', 'drama', 'mystery'],
      'chinese-wuxia': ['action', 'fantasy', 'martial-arts', 'historical'],
      'japanese-samurai': ['action', 'historical', 'drama', 'martial-arts'],
      'korean-thrillers': ['thriller', 'crime', 'drama', 'mystery']
    };
    
    // Determine content type based on genres and region
    const getContentType = (item) => {
      if (!item.genres) return 'general';
      
      const genreNames = item.genres.map(g => typeof g === 'object' ? g.name.toLowerCase() : g.toLowerCase());
      
      // Check for cultural content types
      for (const [type, keywords] of Object.entries(culturalContentTypes)) {
        if (keywords.some(keyword => genreNames.some(genre => genre.includes(keyword)))) {
          return type;
        }
      }
      
      return 'general';
    };
    
    const type1 = getContentType(item1);
    const type2 = getContentType(item2);
    
    if (type1 === type2 && type1 !== 'general') {
      return 0.3; // High similarity for same cultural content type
    }
    
    return 0;
  }

  // NEW: Detect user's cultural preferences from behavior
  async detectUserCulturalPreferences(userId) {
    const userHistory = await this.getUserInteractionHistory(userId);
    const preferences = {
      preferredLanguages: new Map(),
      preferredRegions: new Map(),
      culturalContentTypes: new Map()
    };
    
    for (const interaction of userHistory) {
      const itemDetails = await this.getItemDetails(interaction.itemId);
      
      // Track language preferences
      if (itemDetails.original_language) {
        const currentCount = preferences.preferredLanguages.get(itemDetails.original_language) || 0;
        preferences.preferredLanguages.set(itemDetails.original_language, currentCount + interaction.rating);
      }
      
      // Track region preferences
      if (itemDetails.production_countries) {
        for (const country of itemDetails.production_countries) {
          const countryCode = typeof country === 'object' ? country.iso_3166_1 : country;
          const region = this.getRegionFromCountry(countryCode);
          if (region) {
            const currentCount = preferences.preferredRegions.get(region) || 0;
            preferences.preferredRegions.set(region, currentCount + interaction.rating);
          }
        }
      }
      
      // Track cultural content type preferences
      const contentType = this.getCulturalContentType(itemDetails);
      if (contentType) {
        const currentCount = preferences.culturalContentTypes.get(contentType) || 0;
        preferences.culturalContentTypes.set(contentType, currentCount + interaction.rating);
      }
    }
    
    // Store user preferences
    this.userCulturalPreferences.set(userId, preferences);
    
    return preferences;
  }

  // NEW: Get region from country code
  getRegionFromCountry(countryCode) {
    const regionMap = {
      'US': 'north-america', 'CA': 'north-america', 'MX': 'north-america',
      'GB': 'europe', 'FR': 'europe', 'DE': 'europe', 'IT': 'europe', 'ES': 'europe',
      'JP': 'asia', 'KR': 'asia', 'CN': 'asia', 'IN': 'asia', 'TH': 'asia',
      'BR': 'latin-america', 'AR': 'latin-america', 'CL': 'latin-america',
      'TR': 'middle-east', 'IL': 'middle-east', 'AE': 'middle-east',
      'ZA': 'africa', 'NG': 'africa', 'EG': 'africa',
      'AU': 'oceania', 'NZ': 'oceania'
    };
    
    return regionMap[countryCode] || null;
  }

  // NEW: Get cultural content type from item details
  getCulturalContentType(itemDetails) {
    if (!itemDetails.genres) return null;
    
    const genreNames = itemDetails.genres.map(g => typeof g === 'object' ? g.name.toLowerCase() : g.toLowerCase());
    
    // Check for specific cultural content types
    if (genreNames.some(g => g.includes('musical')) && itemDetails.original_language === 'hi') {
      return 'bollywood';
    }
    
    if (genreNames.some(g => g.includes('drama')) && itemDetails.original_language === 'ko') {
      return 'korean-wave';
    }
    
    if (genreNames.some(g => g.includes('animation')) && itemDetails.original_language === 'ja') {
      return 'anime';
    }
    
    if (genreNames.some(g => g.includes('drama')) && itemDetails.original_language === 'es') {
      return 'telenovelas';
    }
    
    return null;
  }

  // NEW: Cultural recommendation strategy
  async culturalRecommendation(userId, contentType = 'movie', options = {}) {
    const {
      limit = 50,
      useUserPreferences = true,
      includeRegionalContent = true,
      includeLanguageSpecific = true,
      signal = undefined
    } = options;

    try {
      // Get user's cultural preferences
      const userPreferences = useUserPreferences ? 
        await this.detectUserCulturalPreferences(userId) : null;
      
      const recommendations = [];
      
      // Get recommendations based on user's preferred languages
      if (includeLanguageSpecific && userPreferences) {
        const topLanguages = Array.from(userPreferences.preferredLanguages.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([lang]) => lang);
        
        for (const language of topLanguages) {
          const languageContent = await this.getLanguageSpecificRecommendations(
            language, 
            contentType, 
            { limit: Math.ceil(limit / 3) }
          );
          recommendations.push(...languageContent);
        }
      }
      
      // Get recommendations based on user's preferred regions
      if (includeRegionalContent && userPreferences) {
        const topRegions = Array.from(userPreferences.preferredRegions.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([region]) => region);
        
        for (const region of topRegions) {
          const regionContent = await this.getRegionSpecificRecommendations(
            region, 
            contentType, 
            { limit: Math.ceil(limit / 3) }
          );
          recommendations.push(...regionContent);
        }
      }
      
      // Get recommendations based on cultural content types
      if (userPreferences) {
        const topContentTypes = Array.from(userPreferences.culturalContentTypes.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([type]) => type);
        
        for (const contentType of topContentTypes) {
          const culturalContent = await this.getCulturalRecommendations(
            contentType, 
            contentType, 
            { limit: Math.ceil(limit / 4) }
          );
          recommendations.push(...culturalContent);
        }
      }
      
      return this.removeDuplicates(recommendations).slice(0, limit);
    } catch (error) {
      console.error('Cultural recommendation error:', error);
      return this.getFallbackRecommendations(contentType, limit);
    }
  }

  // NEW: Apply cultural diversity boost
  applyCulturalDiversityBoost(recommendations, userContext) {
    const diverseRecommendations = [];
    const usedLanguages = new Set();
    const usedRegions = new Set();
    const usedGenres = new Set();

    for (const rec of recommendations) {
      let diversityScore = rec.similarityScore || rec.score || 0;
      
      // Boost for diverse languages (but still respect user preferences)
      if (rec.original_language && !usedLanguages.has(rec.original_language)) {
        const isPreferredLanguage = userContext.preferences.preferredLanguages.has(rec.original_language);
        if (isPreferredLanguage) {
          diversityScore += 0.1; // Higher boost for preferred languages
        } else {
          diversityScore += 0.05; // Lower boost for non-preferred languages
        }
        usedLanguages.add(rec.original_language);
      }
      
      // Boost for diverse regions (but still respect user preferences)
      if (rec.production_countries && rec.production_countries.length > 0) {
        const primaryCountry = typeof rec.production_countries[0] === 'object' ? 
          rec.production_countries[0].iso_3166_1 : rec.production_countries[0];
        const region = this.getRegionFromCountry(primaryCountry);
        
        if (region && !usedRegions.has(region)) {
          const isPreferredRegion = userContext.preferences.preferredRegions.has(region);
          if (isPreferredRegion) {
            diversityScore += 0.08; // Higher boost for preferred regions
          } else {
            diversityScore += 0.03; // Lower boost for non-preferred regions
          }
          usedRegions.add(region);
        }
      }
      
      // Boost for diverse genres
      if (rec.genres) {
        const newGenres = rec.genres.filter(genre => {
          const genreName = typeof genre === 'object' ? genre.name : genre;
          return !usedGenres.has(genreName);
        });
        
        if (newGenres.length > 0) {
          diversityScore += 0.03 * newGenres.length;
          newGenres.forEach(genre => {
            const genreName = typeof genre === 'object' ? genre.name : genre;
            usedGenres.add(genreName);
          });
        }
      }
      
      diverseRecommendations.push({ ...rec, similarityScore: diversityScore });
    }

    return diverseRecommendations.sort((a, b) => (b.similarityScore || b.score) - (a.similarityScore || a.score));
  }

  // NEW: Fetch content by specific country
  async fetchContentByCountry(countryCode, contentType, limit = 10) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/${contentType}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&sort_by=vote_average.desc&with_origin_country=${countryCode}&vote_count.gte=20&page=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error fetching content by country:', error);
      return [];
    }
  }

  // NEW: Get cultural variant recommendations
  async getCulturalVariantRecommendations(variant, contentType, limit = 10) {
    // This would implement specific logic for cultural variants
    // For now, return empty array as placeholder
    return [];
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

  // Netflix-level personalized recommendations
  getPersonalizedRecommendations: (userId, contentType, options) =>
    enhancedSimilarContentService.getPersonalizedRecommendations(userId, contentType, options),

  // Netflix-level hybrid recommendations
  getHybridRecommendations: (userId, contentType, options) =>
    enhancedSimilarContentService.hybridRecommendation(userId, contentType, options),

  // Netflix-level collaborative filtering
  getCollaborativeRecommendations: (userId, contentType, options) =>
    enhancedSimilarContentService.collaborativeFiltering(userId, contentType, options),

  // Netflix-level content-based filtering
  getContentBasedRecommendations: (userId, contentType, options) =>
    enhancedSimilarContentService.contentBasedFiltering(userId, contentType, options),

  // Netflix-level deep learning recommendations
  getDeepLearningRecommendations: (userId, contentType, options) =>
    enhancedSimilarContentService.deepLearningRecommendation(userId, contentType, options),

  // Netflix-level reinforcement learning recommendations
  getReinforcementLearningRecommendations: (userId, contentType, options) =>
    enhancedSimilarContentService.reinforcementLearningRecommendation(userId, contentType, options),

  // Netflix-level contextual recommendations
  getContextualRecommendations: (userId, contentType, options) =>
    enhancedSimilarContentService.contextualRecommendation(userId, contentType, options),

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

  // NEW: Get franchise-based recommendations
  getFranchiseBasedRecommendations: (collectionId, contentType, options) =>
    enhancedSimilarContentService.getFranchiseBasedRecommendations(collectionId, contentType, options),

  // NEW: Get actor-based recommendations
  getActorBasedRecommendations: (actorId, contentType, options) =>
    enhancedSimilarContentService.getActorBasedRecommendations(actorId, contentType, options),

  // NEW: Get director-based recommendations
  getDirectorBasedRecommendations: (directorId, contentType, options) =>
    enhancedSimilarContentService.getDirectorBasedRecommendations(directorId, contentType, options),

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
  getCacheStats: () => enhancedSimilarContentService.getCacheStats(),

  // Enhanced duplicate removal utilities
  removeDuplicates: (contentList, options) => 
    enhancedSimilarContentService.removeDuplicates(contentList, options),
  
  removeDuplicatesById: (contentList, options) => 
    enhancedSimilarContentService.removeDuplicatesById(contentList, options),
  
  removeDuplicatesByTitle: (contentList, options) => 
    enhancedSimilarContentService.removeDuplicatesByTitle(contentList, options),
  
  removeDuplicatesStrict: (contentList, options) => 
    enhancedSimilarContentService.removeDuplicatesStrict(contentList, options),
  
  removeDuplicatesSmart: (contentList, options) => 
    enhancedSimilarContentService.removeDuplicatesSmart(contentList, options)
}; 