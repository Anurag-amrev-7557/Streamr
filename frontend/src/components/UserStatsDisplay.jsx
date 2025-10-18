import React from 'react';
import { ClockIcon, CheckCircleIcon, StarIcon, FireIcon } from '@heroicons/react/24/outline';
import useUserAnalytics from '../hooks/useUserAnalytics';

/**
 * UserStatsDisplay Component
 * A reusable component for displaying user statistics across the website
 * @param {Object} props - Component props
 * @param {string} props.variant - Display variant: 'compact', 'detailed', 'minimal'
 * @param {boolean} props.showIcons - Whether to show icons
 * @param {boolean} props.showLabels - Whether to show labels
 * @param {string} props.className - Additional CSS classes
 * @param {Array} props.statsToShow - Array of stats to display: ['watchTime', 'completed', 'reviews', 'streak', 'rating']
 */
const UserStatsDisplay = ({ 
  variant = 'detailed', 
  showIcons = true, 
  showLabels = true, 
  className = '',
  statsToShow = ['watchTime', 'completed', 'reviews', 'streak', 'rating']
}) => {
  const { analytics, isLoading, getQuickStats } = useUserAnalytics();

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/5 rounded-lg p-4">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-6 bg-white/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`text-center py-8 text-white/50 ${className}`}>
        <p>No statistics available</p>
      </div>
    );
  }

  const quickStats = getQuickStats();

  const renderStat = (statType) => {
    const statConfig = {
      watchTime: {
        icon: ClockIcon,
        value: quickStats.totalHours,
        label: 'Hours',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20'
      },
      completed: {
        icon: CheckCircleIcon,
        value: quickStats.completedItems,
        label: 'Completed',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20'
      },
      reviews: {
        icon: StarIcon,
        value: quickStats.watchlistSize,
        label: 'Watchlist',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20'
      },
      streak: {
        icon: FireIcon,
        value: quickStats.currentStreak,
        label: 'Streak',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20'
      },
      rating: {
        icon: StarIcon,
        value: analytics.reviews.averageRating.toFixed(1),
        label: 'Avg Rating',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20'
      }
    };

    const config = statConfig[statType];
    if (!config) return null;

    const IconComponent = config.icon;

    if (variant === 'minimal') {
      return (
        <div key={statType} className="flex items-center gap-2">
          {showIcons && <IconComponent className={`w-4 h-4 ${config.color}`} />}
          <span className="font-medium">{config.value}</span>
          {showLabels && <span className="text-white/60 text-sm">{config.label}</span>}
        </div>
      );
    }

    if (variant === 'compact') {
      return (
        <div key={statType} className={`rounded-lg p-3 ${config.bgColor} border ${config.borderColor}`}>
          <div className="flex items-center gap-2 mb-1">
            {showIcons && <IconComponent className={`w-4 h-4 ${config.color}`} />}
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          </div>
          <span className="text-lg font-bold">{config.value}</span>
        </div>
      );
    }

    // Detailed variant (default)
    return (
      <div key={statType} className={`rounded-xl p-4 ${config.bgColor} border ${config.borderColor}`}>
        <div className="flex items-center gap-3 mb-3">
          {showIcons && (
            <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
              <IconComponent className={`w-5 h-5 ${config.color}`} />
            </div>
          )}
          <div>
            <h4 className="font-semibold">{config.label}</h4>
            {variant === 'detailed' && (
              <p className="text-white/60 text-sm">
                {statType === 'watchTime' && `${analytics.watchTime.movies}h movies, ${analytics.watchTime.tv}h TV`}
                {statType === 'completed' && `${analytics.content.movies} movies, ${analytics.content.tvEpisodes} episodes`}
                {statType === 'reviews' && `${analytics.content.inProgress} items in progress`}
                {statType === 'streak' && 'Consecutive days watched'}
                {statType === 'rating' && 'Your average score'}
              </p>
            )}
          </div>
        </div>
        <p className={`text-2xl font-bold ${config.color}`}>{config.value}</p>
      </div>
    );
  };

  const gridCols = {
    minimal: 'grid-cols-2 md:grid-cols-5',
    compact: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5',
    detailed: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
  };

  return (
    <div className={`${className}`}>
      <div className={`grid ${gridCols[variant]} gap-4`}>
        {statsToShow.map(renderStat)}
      </div>
    </div>
  );
};

export default UserStatsDisplay; 