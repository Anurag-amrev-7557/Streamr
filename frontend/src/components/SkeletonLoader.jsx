import React from 'react';
import { motion } from 'framer-motion';

// Skeleton loader for better perceived performance
const SkeletonLoader = ({ 
  type = 'card', 
  count = 1, 
  className = '',
  isMobile = false 
}) => {
  // Ensure mobile-first approach - if isMobile is not explicitly set, default to mobile
  const shouldUseMobileLayout = isMobile !== undefined ? isMobile : true;
  const renderCardSkeleton = () => (
          <div className={`${shouldUseMobileLayout ? 'aspect-[2/3]' : 'aspect-[16/10]'} rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 relative shadow-lg border border-white/5`}>
      <div className="w-full h-full relative overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 animate-pulse" />
      </div>
      
      {/* Top badges skeleton */}
      <div className="absolute top-2 left-2">
        <div className="w-8 h-5 bg-gradient-to-br from-black/60 to-black/40 rounded-full animate-pulse" />
      </div>
      <div className="absolute top-2 right-2">
        <div className="w-12 h-5 bg-gradient-to-br from-black/60 to-black/40 rounded-full animate-pulse" />
      </div>
      
      {/* Bottom info skeleton - Desktop only */}
      {!shouldUseMobileLayout && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
          <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
            <div className="h-4 w-3/4 bg-gradient-to-br from-white/20 to-white/10 rounded animate-pulse mb-2" />
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 bg-gradient-to-br from-white/15 to-white/8 rounded animate-pulse" />
              <div className="w-1 h-1 rounded-full bg-white/30" />
              <div className="h-3 w-16 bg-gradient-to-br from-white/15 to-white/8 rounded animate-pulse" />
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile info skeleton */}
      {shouldUseMobileLayout && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
          <div className="text-center">
            <div className="h-3 w-3/4 bg-gradient-to-br from-white/20 to-white/10 rounded animate-pulse mb-1 mx-auto" />
            <div className="flex items-center justify-center gap-1">
              <div className="h-3 w-6 bg-gradient-to-br from-white/15 to-white/8 rounded animate-pulse" />
              <div className="w-1 h-1 rounded-full bg-white/30" />
              <div className="h-3 w-8 bg-gradient-to-br from-white/15 to-white/8 rounded animate-pulse" />
            </div>
          </div>
        </div>
      )}
      
      {/* Play button skeleton */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-full animate-pulse border border-white/30" />
      </div>
    </div>
  );

  const renderHeroSkeleton = () => (
    <div className="relative w-full h-[60vh] min-h-[400px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 animate-pulse" />
      
      {/* Content overlay skeleton */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end p-8">
        <div className="w-full max-w-4xl">
          <div className="h-8 w-3/4 bg-gradient-to-br from-white/20 to-white/10 rounded animate-pulse mb-4" />
          <div className="h-4 w-1/2 bg-gradient-to-br from-white/15 to-white/8 rounded animate-pulse mb-6" />
          <div className="flex gap-4">
            <div className="h-12 w-32 bg-gradient-to-br from-primary/30 to-primary/20 rounded-lg animate-pulse" />
            <div className="h-12 w-32 bg-gradient-to-br from-white/10 to-white/5 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionSkeleton = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 bg-gradient-to-br from-white/20 to-white/10 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gradient-to-br from-white/10 to-white/5 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            {renderCardSkeleton()}
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'hero':
        return renderHeroSkeleton();
      case 'section':
        return renderSectionSkeleton();
      case 'card':
      default:
        return (
          <div className={`grid gap-4 ${
            shouldUseMobileLayout 
              ? 'grid-cols-2 gap-3'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6'
          }`}>
            {Array.from({ length: count }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="group cursor-pointer relative"
              >
                {renderCardSkeleton()}
              </motion.div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className={className}>
      {renderContent()}
    </div>
  );
};

export default SkeletonLoader; 