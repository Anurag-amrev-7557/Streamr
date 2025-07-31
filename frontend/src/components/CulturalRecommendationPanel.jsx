import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { similarContentUtils } from '../services/enhancedSimilarContentService';

// Language Selection Component
const LanguageSelector = ({ selectedLanguage, onLanguageChange }) => {
  const languages = [
    { code: 'english', name: 'English', flag: '🇺🇸' },
    { code: 'spanish', name: 'Spanish', flag: '🇪🇸' },
    { code: 'french', name: 'French', flag: '🇫🇷' },
    { code: 'german', name: 'German', flag: '🇩🇪' },
    { code: 'italian', name: 'Italian', flag: '🇮🇹' },
    { code: 'portuguese', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'russian', name: 'Russian', flag: '🇷🇺' },
    { code: 'chinese', name: 'Chinese', flag: '🇨🇳' },
    { code: 'japanese', name: 'Japanese', flag: '🇯🇵' },
    { code: 'korean', name: 'Korean', flag: '🇰🇷' },
    { code: 'hindi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'arabic', name: 'Arabic', flag: '🇸🇦' },
    { code: 'turkish', name: 'Turkish', flag: '🇹🇷' },
    { code: 'dutch', name: 'Dutch', flag: '🇳🇱' },
    { code: 'swedish', name: 'Swedish', flag: '🇸🇪' },
    { code: 'norwegian', name: 'Norwegian', flag: '🇳🇴' },
    { code: 'danish', name: 'Danish', flag: '🇩🇰' },
    { code: 'finnish', name: 'Finnish', flag: '🇫🇮' },
    { code: 'polish', name: 'Polish', flag: '🇵🇱' },
    { code: 'czech', name: 'Czech', flag: '🇨🇿' },
    { code: 'hungarian', name: 'Hungarian', flag: '🇭🇺' },
    { code: 'romanian', name: 'Romanian', flag: '🇷🇴' },
    { code: 'bulgarian', name: 'Bulgarian', flag: '🇧🇬' },
    { code: 'greek', name: 'Greek', flag: '🇬🇷' },
    { code: 'hebrew', name: 'Hebrew', flag: '🇮🇱' },
    { code: 'thai', name: 'Thai', flag: '🇹🇭' },
    { code: 'vietnamese', name: 'Vietnamese', flag: '🇻🇳' },
    { code: 'indonesian', name: 'Indonesian', flag: '🇮🇩' },
    { code: 'malay', name: 'Malay', flag: '🇲🇾' },
    { code: 'filipino', name: 'Filipino', flag: '🇵🇭' }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-3">Select Language</h3>
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {languages.map((language) => (
          <motion.button
            key={language.code}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onLanguageChange(language.code)}
            className={`p-3 rounded-lg border-2 transition-all duration-200 ${
              selectedLanguage === language.code
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <div className="text-2xl mb-1">{language.flag}</div>
            <div className="text-xs font-medium">{language.name}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Region Selection Component
const RegionSelector = ({ selectedRegion, onRegionChange }) => {
  const regions = [
    { code: 'north-america', name: 'North America', flag: '🇺🇸', description: 'US, Canada, Mexico' },
    { code: 'europe', name: 'Europe', flag: '🇪🇺', description: 'Western & Central Europe' },
    { code: 'asia', name: 'Asia', flag: '🌏', description: 'East & South Asia' },
    { code: 'latin-america', name: 'Latin America', flag: '🌎', description: 'South & Central America' },
    { code: 'middle-east', name: 'Middle East', flag: '🌍', description: 'Middle Eastern countries' },
    { code: 'africa', name: 'Africa', flag: '🌍', description: 'African continent' },
    { code: 'oceania', name: 'Oceania', flag: '🇦🇺', description: 'Australia & Pacific' },
    { code: 'eastern-europe', name: 'Eastern Europe', flag: '🇷🇺', description: 'Russia & Eastern Europe' },
    { code: 'scandinavia', name: 'Scandinavia', flag: '🇸🇪', description: 'Nordic countries' },
    { code: 'balkans', name: 'Balkans', flag: '🇷🇸', description: 'Southeast Europe' },
    { code: 'baltic', name: 'Baltic', flag: '🇪🇪', description: 'Baltic states' },
    { code: 'benelux', name: 'Benelux', flag: '🇧🇪', description: 'Belgium, Netherlands, Luxembourg' },
    { code: 'iberia', name: 'Iberia', flag: '🇪🇸', description: 'Spain & Portugal' },
    { code: 'central-europe', name: 'Central Europe', flag: '🇩🇪', description: 'Germany, Austria, Switzerland' },
    { code: 'mediterranean', name: 'Mediterranean', flag: '🇮🇹', description: 'Mediterranean countries' }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-3">Select Region</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {regions.map((region) => (
          <motion.button
            key={region.code}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onRegionChange(region.code)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
              selectedRegion === region.code
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{region.flag}</div>
              <div>
                <div className="font-medium">{region.name}</div>
                <div className="text-xs opacity-70">{region.description}</div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Culture Selection Component
const CultureSelector = ({ selectedCulture, onCultureChange }) => {
  const cultures = [
    { code: 'bollywood', name: 'Bollywood', flag: '🇮🇳', description: 'Hindi cinema' },
    { code: 'korean-wave', name: 'Korean Wave', flag: '🇰🇷', description: 'K-dramas & K-pop culture' },
    { code: 'anime', name: 'Anime', flag: '🇯🇵', description: 'Japanese animation' },
    { code: 'nollywood', name: 'Nollywood', flag: '🇳🇬', description: 'Nigerian cinema' },
    { code: 'telenovelas', name: 'Telenovelas', flag: '🇪🇸', description: 'Spanish soap operas' },
    { code: 'european-arthouse', name: 'European Arthouse', flag: '🇫🇷', description: 'European art films' },
    { code: 'scandinavian-noir', name: 'Scandinavian Noir', flag: '🇸🇪', description: 'Nordic crime dramas' },
    { code: 'french-new-wave', name: 'French New Wave', flag: '🇫🇷', description: 'French cinema movement' },
    { code: 'italian-neorealism', name: 'Italian Neorealism', flag: '🇮🇹', description: 'Italian cinema' },
    { code: 'german-expressionism', name: 'German Expressionism', flag: '🇩🇪', description: 'German cinema' },
    { code: 'russian-literary', name: 'Russian Literary', flag: '🇷🇺', description: 'Russian adaptations' },
    { code: 'chinese-wuxia', name: 'Chinese Wuxia', flag: '🇨🇳', description: 'Chinese martial arts' },
    { code: 'japanese-samurai', name: 'Japanese Samurai', flag: '🇯🇵', description: 'Japanese period films' },
    { code: 'korean-thrillers', name: 'Korean Thrillers', flag: '🇰🇷', description: 'Korean crime/thriller' },
    { code: 'turkish-drama', name: 'Turkish Drama', flag: '🇹🇷', description: 'Turkish television' },
    { code: 'brazilian-cinema', name: 'Brazilian Cinema', flag: '🇧🇷', description: 'Brazilian films' },
    { code: 'mexican-cinema', name: 'Mexican Cinema', flag: '🇲🇽', description: 'Mexican films' },
    { code: 'australian-cinema', name: 'Australian Cinema', flag: '🇦🇺', description: 'Australian films' },
    { code: 'canadian-cinema', name: 'Canadian Cinema', flag: '🇨🇦', description: 'Canadian films' },
    { code: 'british-cinema', name: 'British Cinema', flag: '🇬🇧', description: 'British films' }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-3">Select Cultural Movement</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {cultures.map((culture) => (
          <motion.button
            key={culture.code}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onCultureChange(culture.code)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
              selectedCulture === culture.code
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{culture.flag}</div>
              <div>
                <div className="font-medium">{culture.name}</div>
                <div className="text-xs opacity-70">{culture.description}</div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Content Grid Component (reused from RecommendationDashboard)
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                {item.original_language && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-xs text-white/70 uppercase">
                      {item.original_language}
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

const CulturalRecommendationPanel = ({ contentType = 'movie' }) => {
  const [activeTab, setActiveTab] = useState('language');
  const [selectedLanguage, setSelectedLanguage] = useState('spanish');
  const [selectedRegion, setSelectedRegion] = useState('europe');
  const [selectedCulture, setSelectedCulture] = useState('bollywood');
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const tabs = [
    { id: 'language', name: 'Language', icon: '🌐' },
    { id: 'region', name: 'Region', icon: '🗺️' },
    { id: 'culture', name: 'Culture', icon: '🎭' }
  ];

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let results = [];
      
      switch (activeTab) {
        case 'language':
          results = await similarContentUtils.getLanguageSpecificRecommendations(
            selectedLanguage, 
            contentType, 
            { limit: 30, quality: 'high' }
          );
          break;
        case 'region':
          results = await similarContentUtils.getRegionSpecificRecommendations(
            selectedRegion, 
            contentType, 
            { limit: 30 }
          );
          break;
        case 'culture':
          results = await similarContentUtils.getCulturalRecommendations(
            selectedCulture, 
            contentType, 
            { limit: 30 }
          );
          break;
        default:
          results = [];
      }
      
      setRecommendations(results);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedLanguage, selectedRegion, selectedCulture, contentType]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'language':
        return `${selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)} Content`;
      case 'region':
        return `${selectedRegion.charAt(0).toUpperCase() + selectedRegion.slice(1)} Cinema`;
      case 'culture':
        return `${selectedCulture.charAt(0).toUpperCase() + selectedCulture.slice(1)} Films`;
      default:
        return 'Recommendations';
    }
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
            Cultural Cinema Discovery
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Explore cinema from around the world - discover new languages, regions, and cultural movements
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-md transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Selection Panel */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <AnimatePresence mode="wait">
            {activeTab === 'language' && (
              <LanguageSelector
                key="language"
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
              />
            )}
            {activeTab === 'region' && (
              <RegionSelector
                key="region"
                selectedRegion={selectedRegion}
                onRegionChange={setSelectedRegion}
              />
            )}
            {activeTab === 'culture' && (
              <CultureSelector
                key="culture"
                selectedCulture={selectedCulture}
                onCultureChange={setSelectedCulture}
              />
            )}
          </AnimatePresence>
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
              onClick={fetchRecommendations}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Recommendations Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${selectedLanguage}-${selectedRegion}-${selectedCulture}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ContentGrid
              items={recommendations}
              title={getTabTitle()}
              isLoading={isLoading}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CulturalRecommendationPanel; 