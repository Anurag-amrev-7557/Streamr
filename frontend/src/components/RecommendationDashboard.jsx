import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { similarContentUtils } from '../services/enhancedSimilarContentService';

// Recommendation Strategy Card
const RecommendationCard = React.memo(({ 
  title, 
  description, 
  icon, 
  onClick, 
  isActive = false,
  isLoading = false 
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
        isActive 
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          isActive ? 'bg-primary text-white' : 'bg-white/10 text-white/70'
        }`}>
          {icon}
        </div>
        
        <div className="flex-1">
          <h3 className={`text-lg font-semibold mb-2 ${
            isActive ? 'text-primary' : 'text-white'
          }`}>
            {title}
          </h3>
          <p className="text-sm text-white/60 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

// Content Grid Component
const ContentGrid = React.memo(({ items, title, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className="text-center py-8 text-white/60">
          <svg className="w-12 h-12 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547z" />
          </svg>
          <p>No recommendations available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group cursor-pointer"
          >
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 relative">
              {item.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                  alt={item.title || item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <h4 className="font-semibold text-sm truncate">
                  {item.title || item.name}
                </h4>
                <p className="text-xs text-white/70">
                  {item.release_date ? new Date(item.release_date).getFullYear() : 
                   item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'N/A'}
                </p>
                {item.similarityScore && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-xs text-white/70">
                      {Math.round(item.similarityScore * 100)}% match
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

const RecommendationDashboard = ({ userId = 'default', contentType = 'movie' }) => {
  const [activeStrategy, setActiveStrategy] = useState('hybrid');
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const strategies = [
    {
      id: 'hybrid',
      title: 'Hybrid Recommendations',
      description: 'Combines collaborative filtering, content-based analysis, and mood matching for the best results.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'collaborative',
      title: 'Collaborative Filtering',
      description: 'Based on what similar users have enjoyed, using collective intelligence.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    {
      id: 'content-based',
      title: 'Content-Based',
      description: 'Analyzes your watch history to find similar content based on genres, actors, and themes.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'mood-based',
      title: 'Mood-Based',
      description: 'Suggests content based on your current mood - uplifting, romantic, thrilling, or thoughtful.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'contextual',
      title: 'Contextual',
      description: 'Considers time of day, season, and context to provide situationally appropriate recommendations.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'diverse',
      title: 'Diverse Discovery',
      description: 'Explores international, indie, and classic content to broaden your cinematic horizons.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'language-specific',
      title: 'Language-Specific',
      description: 'Discover content in your preferred language - from Spanish dramas to Korean thrillers.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      )
    },
    {
      id: 'region-specific',
      title: 'Region-Specific',
      description: 'Explore cinema from different regions - European arthouse, Asian blockbusters, African stories.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'cultural',
      title: 'Cultural Cinema',
      description: 'Immerse yourself in specific cultural movements - Bollywood, K-dramas, European arthouse.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
  ];

  const fetchRecommendations = useCallback(async (strategy) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let results = [];
      
      switch (strategy) {
        case 'hybrid':
          results = await similarContentUtils.getHybridRecommendations(userId, contentType, 30);
          break;
        case 'collaborative':
          results = await similarContentUtils.getCollaborativeRecommendations(userId, contentType, 30);
          break;
        case 'content-based':
          results = await similarContentUtils.getContentBasedRecommendations(userId, contentType, 30);
          break;
        case 'mood-based':
          results = await similarContentUtils.getMoodBasedRecommendations('excited', contentType, { limit: 30 });
          break;
        case 'contextual':
          results = await similarContentUtils.getContextualRecommendations('evening', contentType, { limit: 30 });
          break;
        case 'diverse':
          results = await similarContentUtils.getDiverseRecommendations(contentType, { limit: 30 });
          break;
        case 'language-specific':
          results = await similarContentUtils.getLanguageSpecificRecommendations('spanish', contentType, { limit: 30, quality: 'high' });
          break;
        case 'region-specific':
          results = await similarContentUtils.getRegionSpecificRecommendations('europe', contentType, { limit: 30 });
          break;
        case 'cultural':
          results = await similarContentUtils.getCulturalRecommendations('bollywood', contentType, { limit: 30 });
          break;
        default:
          results = await similarContentUtils.getHybridRecommendations(userId, contentType, 30);
      }
      
      setRecommendations(results);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [userId, contentType]);

  useEffect(() => {
    fetchRecommendations(activeStrategy);
  }, [activeStrategy, fetchRecommendations]);

  const handleStrategyChange = (strategyId) => {
    setActiveStrategy(strategyId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl font-bold text-white">
            Smart Movie Recommendations
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Discover your next favorite movie with our advanced recommendation algorithms
          </p>
        </motion.div>

        {/* Strategy Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {strategies.map((strategy) => (
            <RecommendationCard
              key={strategy.id}
              title={strategy.title}
              description={strategy.description}
              icon={strategy.icon}
              isActive={activeStrategy === strategy.id}
              isLoading={isLoading && activeStrategy === strategy.id}
              onClick={() => handleStrategyChange(strategy.id)}
            />
          ))}
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center"
          >
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => fetchRecommendations(activeStrategy)}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Recommendations Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStrategy}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ContentGrid
              items={recommendations}
              title={`${strategies.find(s => s.id === activeStrategy)?.title} Results`}
              isLoading={isLoading}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RecommendationDashboard; 