import React, { useState } from 'react';
import AchievementDashboard from '../components/AchievementDashboard';
import AchievementCard from '../components/AchievementCard';
import { motion } from 'framer-motion';

const AchievementTestPage = () => {
  const [selectedVariant, setSelectedVariant] = useState('full');
  const [showProgress, setShowProgress] = useState(true);

  // Sample achievement data for testing
  const sampleAchievements = [
    {
      id: 'century_watcher',
      name: 'Century Watcher',
      description: 'Watch 100+ hours of content',
      icon: 'FilmIcon',
      category: 'watch_time',
      progress: 75,
      maxProgress: 100,
      unlocked: false,
      rarity: 'common',
      points: 10
    },
    {
      id: 'binge_master',
      name: 'Binge Master',
      description: 'Watch 500+ hours of content',
      icon: 'TvIcon',
      category: 'watch_time',
      progress: 120,
      maxProgress: 500,
      unlocked: false,
      rarity: 'rare',
      points: 25
    },
    {
      id: 'first_steps',
      name: 'First Steps',
      description: 'Complete your first piece of content',
      icon: 'CheckCircleIcon',
      category: 'completion',
      progress: 1,
      maxProgress: 1,
      unlocked: true,
      rarity: 'common',
      points: 5
    },
    {
      id: 'getting_hooked',
      name: 'Getting Hooked',
      description: 'Maintain a 3+ day viewing streak',
      icon: 'FlagIcon',
      category: 'streak',
      progress: 5,
      maxProgress: 3,
      unlocked: true,
      rarity: 'common',
      points: 10
    },
    {
      id: 'critic',
      name: 'Critic',
      description: 'Rate 10+ pieces of content',
      icon: 'StarIcon',
      category: 'rating',
      progress: 8,
      maxProgress: 10,
      unlocked: false,
      rarity: 'common',
      points: 15
    },
    {
      id: 'explorer',
      name: 'Explorer',
      description: 'Watch content from 5+ different genres',
      icon: 'GlobeAltIcon',
      category: 'diversity',
      progress: 3,
      maxProgress: 5,
      unlocked: false,
      rarity: 'common',
      points: 15
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f1115] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Achievement System Demo</h1>
          <p className="text-white/60 text-lg">
            Test the comprehensive achievement functionality with sample data
          </p>
        </div>

        {/* Controls */}
        <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Demo Controls</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">Dashboard Variant</label>
              <select
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(e.target.value)}
                className="bg-[#2a2d31] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white/30"
              >
                <option value="full">Full Dashboard</option>
                <option value="compact">Compact Dashboard</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-white/60 mb-2">Show Progress</label>
              <input
                type="checkbox"
                checked={showProgress}
                onChange={(e) => setShowProgress(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-[#2a2d31] border-white/10 rounded focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Individual Achievement Cards Test */}
        <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Individual Achievement Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                showProgress={showProgress}
                variant="default"
              />
            ))}
          </div>
        </div>

        {/* Achievement Dashboard Test */}
        <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Achievement Dashboard ({selectedVariant})</h2>
          <div className="border border-white/10 rounded-xl p-4">
            <AchievementDashboard variant={selectedVariant} />
          </div>
        </div>

        {/* Sample Data Display */}
        <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Sample Achievement Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Achievement Categories</h3>
              <div className="space-y-2">
                {['watch_time', 'completion', 'streak', 'rating', 'diversity', 'special'].map((category) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-[#2a2d31] rounded-lg">
                    <span className="capitalize">{category.replace('_', ' ')}</span>
                    <span className="text-white/60">
                      {sampleAchievements.filter(a => a.category === category).length} achievements
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-3">Rarity Breakdown</h3>
              <div className="space-y-2">
                {['common', 'rare', 'epic', 'legendary', 'special'].map((rarity) => {
                  const count = sampleAchievements.filter(a => a.rarity === rarity).length;
                  return (
                    <div key={rarity} className="flex items-center justify-between p-3 bg-[#2a2d31] rounded-lg">
                      <span className="capitalize">{rarity}</span>
                      <span className="text-white/60">{count} achievements</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Achievement System Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3 text-green-400">✅ Implemented</h3>
              <ul className="space-y-2 text-white/80">
                <li>• Progress tracking with visual progress bars</li>
                <li>• Rarity system (common, rare, epic, legendary, special)</li>
                <li>• Category-based organization</li>
                <li>• Point-based reward system</li>
                <li>• Unlock status indicators</li>
                <li>• Responsive grid layouts</li>
                <li>• Framer Motion animations</li>
                <li>• Filtering and sorting options</li>
                <li>• Compact and full dashboard variants</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-3 text-blue-400">🚀 Future Enhancements</h3>
              <ul className="space-y-2 text-white/80">
                <li>• Achievement notifications</li>
                <li>• Social sharing of achievements</li>
                <li>• Achievement leaderboards</li>
                <li>• Custom achievement creation</li>
                <li>• Achievement streaks and multipliers</li>
                <li>• Seasonal/limited-time achievements</li>
                <li>• Achievement export/import</li>
                <li>• Mobile app integration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementTestPage; 