import * as React from 'react';
import { motion } from 'framer-motion';

const CommunityPageSkeleton = () => {
  // Animation variants for staggered loading
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const pulseVariants = {
    pulse: {
      opacity: [0.4, 0.8, 0.4],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1114] text-white">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 sm:py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="flex flex-col space-y-4 mb-8">
            {/* Title and Create Button Row */}
            <div className="flex justify-between items-center">
              <motion.div 
                variants={pulseVariants}
                animate="pulse"
                className="h-8 w-32 bg-white/10 rounded-lg"
              />
              <motion.div 
                variants={pulseVariants}
                animate="pulse"
                className="h-10 w-40 bg-white/10 rounded-full"
              />
            </div>
            
            {/* Search, Filters, and Tabs Row */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              {/* Search Bar */}
              <motion.div 
                variants={pulseVariants}
                animate="pulse"
                className="w-full lg:w-1/2"
              >
                <div className="h-10 bg-white/10 rounded-full relative">
                  {/* Search icon placeholder */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-white/20 rounded-full" />
                </div>
              </motion.div>

              {/* Filter Options - Mobile optimized */}
              <motion.div 
                variants={pulseVariants}
                animate="pulse"
                className="w-full lg:w-auto"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {/* Sort Filter */}
                  <div className="h-10 w-28 sm:w-32 bg-white/10 rounded-full" />
                  {/* Category Filter */}
                  <div className="h-10 w-28 sm:w-32 bg-white/10 rounded-full" />
                  {/* Tags Filter */}
                  <div className="h-10 w-20 sm:w-24 bg-white/10 rounded-full" />
                </div>
              </motion.div>

              {/* Tabs - Mobile optimized */}
              <motion.div 
                variants={pulseVariants}
                animate="pulse"
                className="flex space-x-2 w-full lg:w-auto"
              >
                <div className="h-10 w-28 sm:w-32 bg-white/10 rounded-full flex-1 lg:flex-none" />
                <div className="h-10 w-28 sm:w-32 bg-white/10 rounded-full flex-1 lg:flex-none" />
              </motion.div>
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
            {/* Left Column - Discussions List */}
            <motion.div 
              variants={itemVariants}
              className="lg:col-span-3 space-y-4 order-2 lg:order-1"
            >
              {/* Discussion Cards Skeleton */}
              {[...Array(5)].map((_, index) => (
                <motion.div
                  key={index}
                  variants={pulseVariants}
                  animate="pulse"
                  className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-white/10 rounded-full flex-shrink-0" />
                    
                    <div className="flex-1 space-y-3">
                      {/* Author and timestamp row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-24 bg-white/10 rounded" />
                          <div className="h-3 w-20 bg-white/10 rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-white/10 rounded-lg" />
                          <div className="w-8 h-8 bg-white/10 rounded-lg" />
                          <div className="w-8 h-8 bg-white/10 rounded-lg" />
                        </div>
                      </div>
                      
                      {/* Title */}
                      <div className="h-6 w-3/4 bg-white/10 rounded" />
                      
                      {/* Content lines */}
                      <div className="space-y-2">
                        <div className="h-4 w-full bg-white/10 rounded" />
                        <div className="h-4 w-2/3 bg-white/10 rounded" />
                        <div className="h-4 w-4/5 bg-white/10 rounded" />
                      </div>
                      
                      {/* Tags and stats row */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex gap-2">
                          <div className="h-6 w-16 bg-white/10 rounded-full" />
                          <div className="h-6 w-20 bg-white/10 rounded-full" />
                          <div className="h-6 w-14 bg-white/10 rounded-full" />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="h-4 w-16 bg-white/10 rounded" />
                          <div className="h-4 w-20 bg-white/10 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Right Column - Stats and Trending */}
            <motion.div 
              variants={itemVariants}
              className="lg:col-span-2 space-y-4 order-1 lg:order-2"
            >
              {/* Community Stats Skeleton */}
              <motion.div 
                variants={pulseVariants}
                animate="pulse"
                className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4"
              >
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <div className="h-5 sm:h-6 w-32 sm:w-40 bg-white/10 rounded" />
                  <div className="h-5 sm:h-6 w-5 sm:w-6 bg-white/10 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3 sm:p-4">
                      <div className="h-3 sm:h-4 w-20 sm:w-24 bg-white/10 rounded mb-1.5 sm:mb-2" />
                      <div className="h-6 sm:h-8 w-12 sm:w-16 bg-white/10 rounded" />
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Trending Topics Skeleton */}
              <motion.div 
                variants={pulseVariants}
                animate="pulse"
                className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4"
              >
                <div className="h-5 sm:h-6 w-32 sm:w-40 bg-white/10 rounded mb-3 sm:mb-4" />
                <div className="space-y-2 sm:space-y-3">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-1.5 sm:p-2">
                      <div className="h-3 sm:h-4 w-20 sm:w-24 bg-white/10 rounded" />
                      <div className="h-3 sm:h-4 w-12 sm:w-16 bg-white/10 rounded" />
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CommunityPageSkeleton; 