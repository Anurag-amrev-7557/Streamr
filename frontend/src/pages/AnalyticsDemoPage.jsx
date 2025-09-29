import React, { useState } from 'react';
import UserStatsDisplay from '../components/UserStatsDisplay';
import useUserAnalytics from '../hooks/useUserAnalytics';
import { motion } from 'framer-motion';

const AnalyticsDemoPage = () => {
  const { analytics, getQuickStats, getProgressStats, getAchievements } = useUserAnalytics();
  const [selectedVariant, setSelectedVariant] = useState('detailed');

  const variants = [
    { id: 'minimal', name: 'Minimal', description: 'Compact inline display' },
    { id: 'compact', name: 'Compact', description: 'Small cards with icons' },
    { id: 'detailed', name: 'Detailed', description: 'Full cards with descriptions' }
  ];

  const statOptions = [
    { id: 'watchTime', name: 'Watch Time', description: 'Total hours watched' },
    { id: 'completed', name: 'Completed', description: 'Content finished' },
    { id: 'reviews', name: 'Watchlist', description: 'Items in watchlist' },
    { id: 'streak', name: 'Streak', description: 'Consecutive days' },
    { id: 'rating', name: 'Rating', description: 'Average rating given' }
  ];

  const [selectedStats, setSelectedStats] = useState(['watchTime', 'completed', 'reviews', 'streak', 'rating']);

  const toggleStat = (statId) => {
    setSelectedStats(prev => 
      prev.includes(statId) 
        ? prev.filter(id => id !== statId)
        : [...prev, statId]
    );
  };

  if (!analytics) {
    return (
      <div className="min-h-screen bg-[#0f1114] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1114] text-white">
      <div className="container mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-4">User Analytics Demo</h1>
          <p className="text-white/70 text-lg">
            Showcase of the comprehensive user analytics system that tracks watch time, 
            content completion, and user engagement across the website.
          </p>
        </motion.div>

        {/* Variant Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-semibold mb-4">Display Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant.id)}
                className={`p-4 rounded-lg border transition-all ${
                  selectedVariant === variant.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <h3 className="font-semibold mb-1">{variant.name}</h3>
                <p className="text-sm text-white/60">{variant.description}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stats Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-semibold mb-4">Select Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {statOptions.map((stat) => (
              <button
                key={stat.id}
                onClick={() => toggleStat(stat.id)}
                className={`p-3 rounded-lg border transition-all ${
                  selectedStats.includes(stat.id)
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <div className="text-sm font-medium">{stat.name}</div>
                <div className="text-xs text-white/60 mt-1">{stat.description}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stats Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-semibold mb-4">Statistics Display</h2>
          <UserStatsDisplay
            variant={selectedVariant}
            statsToShow={selectedStats}
            className="mb-6"
          />
        </motion.div>

        {/* Raw Analytics Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-semibold mb-4">Raw Analytics Data</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <div className="bg-white/[0.03] rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                {Object.entries(getQuickStats()).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-white/70 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Stats */}
            <div className="bg-white/[0.03] rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Progress Stats</h3>
              <div className="space-y-3">
                {Object.entries(getProgressStats()).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-white/70 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="font-medium">
                      {typeof value === 'number' && key.includes('Rate') ? `${value.toFixed(1)}%` : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-semibold mb-4">Achievements</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {getAchievements().map((badge, index) => (
              <div key={index} className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-xl p-4 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <span className="text-2xl">{badge.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-400">{badge.name}</h4>
                    <p className="text-white/70 text-sm">{badge.description}</p>
                  </div>
                </div>
              </div>
            ))}
            {getAchievements().length === 0 && (
              <div className="col-span-full text-center py-8 text-white/50">
                <span className="text-4xl mb-4 block">🎯</span>
                <p>Start watching content to earn achievements!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Usage Examples */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-2xl font-semibold mb-4">Usage Examples</h2>
          <div className="bg-white/[0.03] rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4">How to Use Across the Website</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-blue-400 mb-2">1. Minimal Stats in Header</h4>
                <div className="bg-black/20 rounded-lg p-4">
                  <UserStatsDisplay variant="minimal" statsToShow={['watchTime', 'streak']} />
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-green-400 mb-2">2. Compact Stats in Sidebar</h4>
                <div className="bg-black/20 rounded-lg p-4">
                  <UserStatsDisplay variant="compact" statsToShow={['completed', 'reviews', 'rating']} />
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-purple-400 mb-2">3. Detailed Stats in Dashboard</h4>
                <div className="bg-black/20 rounded-lg p-4">
                  <UserStatsDisplay variant="detailed" statsToShow={['watchTime', 'completed', 'reviews', 'streak', 'rating']} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsDemoPage; 