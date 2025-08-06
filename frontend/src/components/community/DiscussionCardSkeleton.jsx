import React from 'react';
import { motion } from 'framer-motion';

const DiscussionCardSkeleton = ({ count = 1 }) => {
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

  const cardVariants = {
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

  return (
    <>
      {[...Array(count)].map((_, index) => (
        <motion.div
          key={index}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: index * 0.1 }}
          className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Avatar */}
            <motion.div 
              variants={pulseVariants}
              animate="pulse"
              className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-full flex-shrink-0" 
            />
            
            <div className="flex-1 space-y-2 sm:space-y-3">
              {/* Author and timestamp row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <motion.div 
                    variants={pulseVariants}
                    animate="pulse"
                    className="h-3 sm:h-4 w-20 sm:w-24 bg-white/10 rounded" 
                  />
                  <motion.div 
                    variants={pulseVariants}
                    animate="pulse"
                    className="h-2 sm:h-3 w-16 sm:w-20 bg-white/10 rounded" 
                  />
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <motion.div 
                    variants={pulseVariants}
                    animate="pulse"
                    className="w-6 h-6 sm:w-8 sm:h-8 bg-white/10 rounded-lg" 
                  />
                  <motion.div 
                    variants={pulseVariants}
                    animate="pulse"
                    className="w-6 h-6 sm:w-8 sm:h-8 bg-white/10 rounded-lg" 
                  />
                  <motion.div 
                    variants={pulseVariants}
                    animate="pulse"
                    className="w-6 h-6 sm:w-8 sm:h-8 bg-white/10 rounded-lg" 
                  />
                </div>
              </div>
              
              {/* Title */}
              <motion.div 
                variants={pulseVariants}
                animate="pulse"
                className="h-5 sm:h-6 w-3/4 bg-white/10 rounded" 
              />
              
              {/* Content lines */}
              <div className="space-y-1.5 sm:space-y-2">
                <motion.div 
                  variants={pulseVariants}
                  animate="pulse"
                  className="h-3 sm:h-4 w-full bg-white/10 rounded" 
                />
                <motion.div 
                  variants={pulseVariants}
                  animate="pulse"
                  className="h-3 sm:h-4 w-2/3 bg-white/10 rounded" 
                />
                <motion.div 
                  variants={pulseVariants}
                  animate="pulse"
                  className="h-3 sm:h-4 w-4/5 bg-white/10 rounded" 
                />
              </div>
              
              {/* Tags and stats row */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-1.5 sm:gap-2">
                  <motion.div 
                    variants={pulseVariants}
                    animate="pulse"
                    className="h-5 sm:h-6 w-12 sm:w-16 bg-white/10 rounded-full" 
                  />
                  <motion.div 
                    variants={pulseVariants}
                    animate="pulse"
                    className="h-5 sm:h-6 w-16 sm:w-20 bg-white/10 rounded-full" 
                  />
                  <motion.div 
                    variants={pulseVariants}
                    animate="pulse"
                    className="h-5 sm:h-6 w-10 sm:w-14 bg-white/10 rounded-full" 
                  />
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <motion.div 
                    variants={pulseVariants}
                    animate="pulse"
                    className="h-3 sm:h-4 w-12 sm:w-16 bg-white/10 rounded" 
                  />
                  <motion.div 
                    variants={pulseVariants}
                    animate="pulse"
                    className="h-3 sm:h-4 w-16 sm:w-20 bg-white/10 rounded" 
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </>
  );
};

export default DiscussionCardSkeleton; 