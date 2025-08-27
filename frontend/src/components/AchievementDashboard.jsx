import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrophyIcon, 
  StarIcon, 
  FireIcon, 
  BoltIcon, 
  FlagIcon,
  ChartBarIcon,
  FunnelIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import AchievementCard from './AchievementCard';
import useUserAnalytics from '../hooks/useUserAnalytics';

const AchievementDashboard = ({ variant = 'full' }) => {
  const { getAchievements, getAchievementStats, getRecentlyUnlocked, getNextAchievements, getAchievementsByCategory } = useUserAnalytics();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLocked, setShowLocked] = useState(true);
  const [sortBy, setSortBy] = useState('rarity');

  const achievements = getAchievements();
  const stats = getAchievementStats();
  const recentlyUnlocked = getRecentlyUnlocked();
  const nextAchievements = getNextAchievements();

  const categories = [
    { id: 'all', name: 'All', icon: TrophyIcon, color: 'text-white' },
    { id: 'watch_time', name: 'Watch Time', icon: FireIcon, color: 'text-orange-400' },
    { id: 'completion', name: 'Completion', icon: CheckCircleIcon, color: 'text-green-400' },
    { id: 'streak', name: 'Streaks', icon: BoltIcon, color: 'text-blue-400' },
    { id: 'rating', name: 'Rating', icon: StarIcon, color: 'text-yellow-400' },
    { id: 'diversity', name: 'Diversity', icon: FlagIcon, color: 'text-purple-400' },
    { id: 'special', name: 'Special', icon: TrophyIcon, color: 'text-pink-400' }
  ];

  const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1, special: 0 };

  const filteredAchievements = achievements
    .filter(achievement => {
      if (selectedCategory !== 'all' && achievement.category !== selectedCategory) return false;
      if (!showLocked && !achievement.unlocked) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rarity') {
        return rarityOrder[b.rarity] - rarityOrder[a.rarity];
      } else if (sortBy === 'progress') {
        return (b.progress / b.maxProgress) - (a.progress / a.maxProgress);
      } else if (sortBy === 'points') {
        return b.points - a.points;
      }
      return 0;
    });

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'text-gray-400',
      rare: 'text-blue-400',
      epic: 'text-purple-400',
      legendary: 'text-yellow-400',
      special: 'text-green-400'
    };
    return colors[rarity] || colors.common;
  };

  if (variant === 'compact') {
    return (
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1a1d21] rounded-full p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <TrophyIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.unlocked || 0}</p>
                <p className="text-xs text-white/40">Unlocked</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[#1a1d21] rounded-full p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <StarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.totalPoints || 0}</p>
                <p className="text-xs text-white/40">Points</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Achievements */}
        {recentlyUnlocked.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Recently Unlocked</h3>
            <div className="space-y-3">
              {recentlyUnlocked.slice(0, 3).map((achievement) => (
                <AchievementCard 
                  key={achievement.id} 
                  achievement={achievement} 
                  showProgress={false}
                  variant="compact"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1d21] rounded-full p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <TrophyIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.unlocked || 0}</p>
              <p className="text-xs text-white/40">Unlocked</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a1d21] rounded-full p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <StarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalPoints || 0}</p>
              <p className="text-xs text-white/40">Points</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a1d21] rounded-full p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.completionRate || 0}%</p>
              <p className="text-xs text-white/40">Complete</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a1d21] rounded-full p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <FireIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.locked || 0}</p>
              <p className="text-xs text-white/40">Remaining</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-white/60" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#1a1d21] border border-white/10 rounded-full px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Options */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-[#1a1d21] border border-white/10 rounded-full px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        >
          <option value="rarity">Sort by Rarity</option>
          <option value="progress">Sort by Progress</option>
          <option value="points">Sort by Points</option>
        </select>

        {/* Show/Hide Locked */}
        <button
          onClick={() => setShowLocked(!showLocked)}
          className="flex items-center gap-2 bg-[#1a1d21] border border-white/10 rounded-full px-3 py-2 text-sm text-white hover:border-white/30 transition-colors"
        >
          {showLocked ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
          {showLocked ? 'Hide Locked' : 'Show Locked'}
        </button>
      </div>

      {/* Next Achievements Preview */}
      {nextAchievements.length > 0 && (
        <div className="bg-[#1a1d21] rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FlagIcon className="w-5 h-5 text-white" />
            Next Achievements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nextAchievements.map((achievement) => (
              <AchievementCard 
                key={achievement.id} 
                achievement={achievement} 
                variant="highlighted"
              />
            ))}
          </div>
        </div>
      )}

      {/* Achievements Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {selectedCategory === 'all' ? 'All Achievements' : categories.find(c => c.id === selectedCategory)?.name}
          </h3>
          <span className="text-sm text-white/60">
            {filteredAchievements.length} of {achievements.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedCategory}-${showLocked}-${sortBy}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredAchievements.map((achievement) => (
              <AchievementCard 
                key={achievement.id} 
                achievement={achievement}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <TrophyIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No achievements found with current filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementDashboard; 