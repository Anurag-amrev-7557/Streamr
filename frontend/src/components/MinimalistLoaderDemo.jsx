import React, { useState, useEffect } from 'react';
import { PageLoader } from './Loader';
import { motion } from 'framer-motion';

const MinimalistLoaderDemo = () => {
  const [showLoader, setShowLoader] = useState(false);
  const [loaderType, setLoaderType] = useState('default');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (showLoader && loaderType === 'progress') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setShowLoader(false), 1000);
            return 100;
          }
          return prev + 2;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [showLoader, loaderType]);

  const loaderConfigs = {
    default: {
      text: "Loading your cinematic experience...",
      showProgress: false,
      showTips: true
    },
    progress: {
      text: "Preparing your content...",
      showProgress: true,
      progress: progress,
      showTips: false
    },
    simple: {
      text: "Loading...",
      showProgress: false,
      showTips: false
    },
    tips: {
      text: "Initializing application...",
      showProgress: false,
      showTips: true,
      tips: [
        "Tip: Use keyboard shortcuts for faster navigation",
        "Did you know? You can customize your theme",
        "Pro: Enable notifications for new releases",
        "Explore: Try the advanced search filters"
      ]
    },
    watchlist: {
      text: "Loading your watchlist...",
      showProgress: false,
      showTips: true,
      tips: [
        "Tip: Add movies to your watchlist for quick access later.",
        "Did you know? You can filter by genre and year.",
        "Pro: Hover a card for instant details.",
        "Explore: Try the 'View All' mode for endless scrolling."
      ]
    }
  };

  const handleShowLoader = (type) => {
    setLoaderType(type);
    setProgress(0);
    setShowLoader(true);
    
    if (type !== 'progress') {
      setTimeout(() => setShowLoader(false), 3000);
    }
  };

  if (showLoader) {
    const config = loaderConfigs[loaderType];
    return <PageLoader {...config} />;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-light tracking-wider mb-4">
            Minimalist Loader Design
          </h1>
          <p className="text-white/60 text-lg font-light max-w-2xl mx-auto">
            A clean, modern, and professional loading experience with a black and white dark theme.
            Features an animated center icon that morphs between website-related elements.
            Click any button below to see the different loader variations.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(loaderConfigs).map(([key, config]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * Object.keys(loaderConfigs).indexOf(key) }}
              className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors"
            >
              <h3 className="text-xl font-light mb-3 capitalize">
                {key} Loader
              </h3>
              <p className="text-white/60 text-sm mb-4">
                {config.text}
              </p>
              <div className="space-y-2 text-xs text-white/40">
                <div>• Progress: {config.showProgress ? 'Yes' : 'No'}</div>
                <div>• Tips: {config.showTips ? 'Yes' : 'No'}</div>
                {config.tips && <div>• Custom tips: {config.tips.length}</div>}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleShowLoader(key)}
                className="mt-4 w-full px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
              >
                Show {key} Loader
              </motion.button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <h2 className="text-2xl font-light mb-4">Design Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-white/60">
            <div>
              <h3 className="text-white font-medium mb-2">Minimalist</h3>
              <p>Clean, uncluttered design with subtle animations and professional aesthetics.</p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">Dark Theme</h3>
              <p>Pure black background with white accents for a modern, cinematic feel.</p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">Responsive</h3>
              <p>Optimized for all screen sizes with smooth transitions and accessibility features.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MinimalistLoaderDemo; 