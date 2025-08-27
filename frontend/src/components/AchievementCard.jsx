import React from 'react';
import { motion } from 'framer-motion';
import { 
  FilmIcon, 
  TvIcon, 
  TrophyIcon, 
  CheckCircleIcon, 
  PlayIcon, 
  StarIcon, 
  FireIcon, 
  FlagIcon, 
  BoltIcon, 
  LightBulbIcon, 
  GlobeAltIcon, 
  UserIcon 
} from '@heroicons/react/24/outline';

const AchievementCard = ({ achievement, showProgress = true, variant = 'default' }) => {
  const iconMap = {
    'FilmIcon': <FilmIcon className="w-6 h-6" />,
    'TvIcon': <TvIcon className="w-6 h-6" />,
    'TrophyIcon': <TrophyIcon className="w-6 h-6" />,
    'CheckCircleIcon': <CheckCircleIcon className="w-6 h-6" />,
    'PlayIcon': <PlayIcon className="w-6 h-6" />,
    'StarIcon': <StarIcon className="w-6 h-6" />,
    'FireIcon': <FireIcon className="w-6 h-6" />,
    'FlagIcon': <FlagIcon className="w-6 h-6" />,
    'BoltIcon': <BoltIcon className="w-6 h-6" />,
    'LightBulbIcon': <LightBulbIcon className="w-6 h-6" />,
    'GlobeAltIcon': <GlobeAltIcon className="w-6 h-6" />,
    'UserIcon': <UserIcon className="w-6 h-6" />
  };

  const rarityColors = {
    common: 'border-gray-400 text-gray-400',
    rare: 'border-blue-400 text-blue-400',
    epic: 'border-purple-400 text-purple-400',
    legendary: 'border-yellow-400 text-yellow-400',
    special: 'border-green-400 text-green-400'
  };

  const rarityBgColors = {
    common: 'bg-gray-400/10',
    rare: 'bg-blue-400/10',
    epic: 'bg-purple-400/10',
    legendary: 'bg-yellow-400/10',
    special: 'bg-green-400/10'
  };

  const progressPercentage = achievement.maxProgress > 0 
    ? (achievement.progress / achievement.maxProgress) * 100 
    : 0;

  const variants = {
    default: "bg-[#1a1d21] border border-white/10 hover:border-white/20",
    compact: "bg-[#1a1d21] border border-white/10",
    highlighted: "bg-gradient-to-br from-[#1a1d21] to-[#2a2d31] border border-white/20 shadow-lg"
  };

  return (
    <motion.div
      className={`${variants[variant]} rounded-xl p-4 transition-all duration-300 group ${
        achievement.unlocked ? 'opacity-100' : 'opacity-60'
      }`}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          achievement.unlocked 
            ? rarityBgColors[achievement.rarity] 
            : 'bg-white/5'
        } border border-white/20 group-hover:border-white/30 transition-colors`}>
          <div className={`${
            achievement.unlocked 
              ? 'text-white' 
              : 'text-white/40'
          }`}>
            {iconMap[achievement.icon] || <StarIcon className="w-6 h-6" />}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold text-sm truncate ${
              achievement.unlocked ? 'text-white' : 'text-white/60'
            }`}>
              {achievement.name}
            </h3>
            
            {/* Points Badge */}
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              achievement.unlocked 
                ? rarityBgColors[achievement.rarity] + ' ' + rarityColors[achievement.rarity]
                : 'bg-white/5 text-white/40'
            }`}>
              {achievement.points} pts
            </div>
          </div>

          <p className={`text-xs mb-3 ${
            achievement.unlocked ? 'text-white/70' : 'text-white/40'
          }`}>
            {achievement.description}
          </p>

          {/* Progress Bar */}
          {showProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={achievement.unlocked ? 'text-white/60' : 'text-white/40'}>
                  Progress
                </span>
                <span className={achievement.unlocked ? 'text-white/80' : 'text-white/50'}>
                  {achievement.progress}/{achievement.maxProgress}
                </span>
              </div>
              
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    achievement.unlocked 
                      ? 'bg-gradient-to-r from-white to-white' 
                      : 'bg-white/20'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Rarity Badge */}
          <div className="mt-3">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${
              rarityColors[achievement.rarity]
            } border ${achievement.unlocked ? 'opacity-100' : 'opacity-40'}`}>
              {achievement.rarity}
            </span>
          </div>
        </div>

        {/* Unlock Status */}
        {achievement.unlocked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center"
          >
            <CheckCircleIcon className="w-4 h-4 text-green-400" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default AchievementCard; 