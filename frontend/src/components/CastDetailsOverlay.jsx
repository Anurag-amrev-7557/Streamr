import React, { useState, useEffect, useRef, useCallback, useMemo, memo, useTransition, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPersonDetails, searchPeople } from '../services/tmdbService';

// Performance monitoring utilities
const PERFORMANCE_MONITORING = import.meta.env.DEV && import.meta.env.VITE_DEBUG_PERFORMANCE === 'true';

// Memory leak prevention utilities
const cleanupRefs = new Set();
const imageCache = new Map();
const animationFrameRefs = new Set();

// Performance optimization constants
const DEBOUNCE_DELAY = 150;
const THROTTLE_DELAY = 100;
const MAX_VISIBLE_ITEMS = 50;
const IMAGE_LOAD_TIMEOUT = 10000;
const MEMORY_CLEANUP_INTERVAL = 30000;

// Performance utilities
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

const throttle = (func, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

// Memory cleanup utility
const cleanupMemory = () => {
  if (PERFORMANCE_MONITORING) {
    console.log('🧹 Memory cleanup initiated');
  }
  
  // Clear image cache if it gets too large
  if (imageCache.size > 100) {
    imageCache.clear();
  }
  
  // Clear animation frame refs
  animationFrameRefs.forEach(ref => {
    if (ref && typeof ref === 'function') {
      ref();
    }
  });
  animationFrameRefs.clear();
  
  // Force garbage collection if available
  if (window.gc) {
    window.gc();
  }
};

// Image loading optimization
const preloadImage = (src) => {
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }
  
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, IMAGE_LOAD_TIMEOUT);
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(src);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Image load failed'));
    };
    
    img.src = src;
  });
  
  imageCache.set(src, promise);
  return promise;
};

// Modern Icons Component - Memoized for performance
const ModernIcons = {
  Close: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  ),
  Film: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
    </svg>
  ),
  Camera: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12m-3.2 0a3.2 3.2 0 1 1 6.4 0a3.2 3.2 0 1 1 -6.4 0"/>
      <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
    </svg>
  ),
  Globe: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
    </svg>
  ),
  Location: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  ),
  Star: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  ),
  Play: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  ),
  ExternalLink: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
    </svg>
  ),
  Loading: () => (
    <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  Error: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  )
};

const CastDetailsOverlay = memo(({ person, onClose, onMovieSelect, onSeriesSelect }) => {
  const [personDetails, setPersonDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isPending, startTransition] = useTransition();
  
  const overlayRef = useRef(null);
  const cleanupTimeoutRef = useRef(null);
  const memoryCleanupIntervalRef = useRef(null);
  const imageLoadTimeoutsRef = useRef(new Set());
  const scrollPositionRef = useRef(0);

  // Memoized values for performance
  const memoizedPersonId = useMemo(() => person?.id, [person?.id]);
  const memoizedPersonName = useMemo(() => person?.name, [person?.name]);
  
  // Performance monitoring
  useEffect(() => {
    if (PERFORMANCE_MONITORING) {
      const startTime = performance.now();
      return () => {
        const endTime = performance.now();
        console.log(`🎭 CastDetailsOverlay render time: ${endTime - startTime}ms`);
      };
    }
  });

  // Memory cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      
      // Clear memory cleanup interval
      if (memoryCleanupIntervalRef.current) {
        clearInterval(memoryCleanupIntervalRef.current);
      }
      
      // Clear image load timeouts
      imageLoadTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      imageLoadTimeoutsRef.current.clear();
      
      // Clear animation frame refs
      animationFrameRefs.forEach(ref => {
        if (ref && typeof ref === 'function') {
          ref();
        }
      });
      animationFrameRefs.clear();
      
      // Force cleanup
      cleanupMemory();
      
      if (PERFORMANCE_MONITORING) {
        console.log('🧹 CastDetailsOverlay cleanup completed');
      }
    };
  }, []);

  // Periodic memory cleanup
  useEffect(() => {
    memoryCleanupIntervalRef.current = setInterval(() => {
      cleanupMemory();
    }, MEMORY_CLEANUP_INTERVAL);

    return () => {
      if (memoryCleanupIntervalRef.current) {
        clearInterval(memoryCleanupIntervalRef.current);
      }
    };
  }, []);

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    exit: { opacity: 0, y: 50, scale: 0.95, transition: { duration: 0.3 } }
  };

  // Button variants matching MovieDetailsOverlay
  const buttonVariants = {
    initial: { scale: 1, filter: 'brightness(1)' },
    hover: { 
      scale: 1.05, 
      filter: 'brightness(1.1)',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        duration: 0.2,
      }
    },
    tap: { 
      scale: 0.98,
      filter: 'brightness(1)',
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 30,
        duration: 0.1,
      }
    }
  };

  // Fetch person details with performance optimizations
  const fetchPersonDetails = useCallback(async () => {
    if (PERFORMANCE_MONITORING) {
      console.log('🎭 CastDetailsOverlay: Fetching person details');
    }
    
    if (!memoizedPersonId && !memoizedPersonName) {
      console.error('CastDetailsOverlay: No person ID or name found:', person);
      setError('Invalid person data - missing ID and name');
      setLoading(false);
      return;
    }

    // Cancel any existing fetch
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }

    try {
      setLoading(true);
      setError(null);
      
      let personId = memoizedPersonId;
      
      // If no ID is available, try to search for the person by name
      if (!personId && memoizedPersonName) {
        if (PERFORMANCE_MONITORING) {
          console.log('🎭 CastDetailsOverlay: Searching for person by name:', memoizedPersonName);
        }
        
        try {
          const searchResults = await searchPeople(memoizedPersonName, 1);
          
          if (searchResults?.results?.length > 0) {
            personId = searchResults.results[0].id;
            if (PERFORMANCE_MONITORING) {
              console.log('🎭 CastDetailsOverlay: Found person ID from search:', personId);
            }
          } else {
            console.warn('CastDetailsOverlay: No search results found for:', memoizedPersonName);
          }
        } catch (searchErr) {
          console.warn('CastDetailsOverlay: Failed to search for person:', searchErr);
        }
      }
      
      if (!personId) {
        throw new Error('Could not find person ID');
      }
      
      if (PERFORMANCE_MONITORING) {
        console.log('🎭 CastDetailsOverlay: Fetching details for person ID:', personId);
      }
      
      // Use startTransition for non-urgent updates
      startTransition(() => {
        getPersonDetails(personId).then(data => {
          if (PERFORMANCE_MONITORING) {
            console.log('🎭 CastDetailsOverlay: Received person details');
          }
          setPersonDetails(data);
        }).catch(err => {
          console.error('Error fetching person details:', err);
          setError(err.message || 'Failed to load person details');
        }).finally(() => {
          setLoading(false);
        });
      });
      
    } catch (err) {
      console.error('Error in fetchPersonDetails:', err);
      setError(err.message || 'Failed to load person details');
      setLoading(false);
    }
  }, [memoizedPersonId, memoizedPersonName]);

  useEffect(() => {
    fetchPersonDetails();
  }, [fetchPersonDetails]);

  // Optimized event handlers with debouncing
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') {
      if (PERFORMANCE_MONITORING) {
        console.log('🎭 Escape key pressed');
      }
      onClose();
    }
  }, [onClose]);

  const handleClickOutside = useCallback((e) => {
    // Only close if clicking on the backdrop (not on content)
    if (e.target.classList.contains('cast-details-backdrop')) {
      if (PERFORMANCE_MONITORING) {
        console.log('🎭 Backdrop clicked - closing overlay');
      }
      onClose();
    }
  }, [onClose]);

  // Throttled scroll handler
  const handleScroll = useCallback(throttle((e) => {
    scrollPositionRef.current = e.target.scrollTop;
  }, THROTTLE_DELAY), []);

  // Handle escape key
  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  // Handle click outside - only close when clicking on the backdrop
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Memoized utility functions
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }, []);

  const calculateAge = useCallback((birthday, deathday) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const endDate = deathday ? new Date(deathday) : new Date();
    const age = endDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = endDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  }, []);

  // Optimized image loading with preloading
  const handleImageLoad = useCallback((e) => {
    e.target.style.opacity = '1';
    // Hide loading spinner when image loads
    const loadingSpinner = e.target.parentElement?.querySelector('.animate-spin');
    if (loadingSpinner) {
      loadingSpinner.style.display = 'none';
    }
  }, []);

  const handleImageError = useCallback((e) => {
    e.target.src = '/placeholder-avatar.png';
    e.target.onerror = null; // Prevent infinite loop
  }, []);

  // Handle movie/series selection with debouncing
  const handleItemSelect = useCallback(debounce((item) => {
    if (item.media_type === 'tv') {
      onSeriesSelect?.(item);
    } else {
      onMovieSelect?.(item);
    }
    onClose();
  }, DEBOUNCE_DELAY), [onMovieSelect, onSeriesSelect, onClose]);

  // Scroll to top handler
  const handleScrollToTop = useCallback(() => {
    const tabContent = document.querySelector('.cast-details-content .overflow-y-auto');
    if (tabContent) {
      // Use requestAnimationFrame for smooth scrolling
      const scrollToTop = () => {
        tabContent.scrollTo({ top: 0, behavior: 'smooth' });
      };
      
      const animationFrame = requestAnimationFrame(scrollToTop);
      animationFrameRefs.add(() => cancelAnimationFrame(animationFrame));
    }
  }, []);

  if (loading) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000000003] flex items-center justify-center cast-details-backdrop"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div 
            className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 max-w-md w-full mx-2 sm:mx-4 cast-details-content relative border border-white/10 shadow-2xl" 
            style={{ pointerEvents: 'auto' }} 
            variants={contentVariants}
          >
            <div className="flex flex-col items-center space-y-4 sm:space-y-6">
              <div className="relative">
                <ModernIcons.Loading />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg sm:text-xl font-semibold text-white">Loading Details</h3>
                <p className="text-white/60 text-xs sm:text-sm">Fetching information for {person?.name || 'actor'}...</p>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary to-primary/60"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (error) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000000003] flex items-center justify-center cast-details-backdrop"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div 
            className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-3xl p-12 max-w-md w-full mx-4 cast-details-content relative border border-red-500/20 shadow-2xl" 
            style={{ pointerEvents: 'auto' }} 
            variants={contentVariants}
          >
            <div className="flex flex-col items-center space-y-4 sm:space-y-6">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center border border-red-500/30">
                  <ModernIcons.Error />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
              <div className="text-center space-y-2 sm:space-y-3">
                <h3 className="text-lg sm:text-xl font-semibold text-white">Oops! Something went wrong</h3>
                <p className="text-white/60 text-xs sm:text-sm max-w-xs">{error}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 w-full space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Person ID:</span>
                  <span className="text-white/80 font-mono">{person?.id || 'Missing'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Person Name:</span>
                  <span className="text-white/80">{person?.name || 'Missing'}</span>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full text-white group overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-l-[1px] border-r-[1px] border-white/30 hover:bg-white/10 transform-gpu will-change-transform"
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  whileHover={{ 
                    rotate: 90,
                    scale: 1.1,
                    transition: { type: 'spring', stiffness: 400, damping: 25 }
                  }}
                >
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </motion.svg>
                <motion.span 
                  className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#1a1a1a] rounded text-sm whitespace-nowrap"
                  initial={{ opacity: 0, x: 10 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  Close
                </motion.span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Show basic info if we have person data but couldn't fetch details
  if (!personDetails && person?.name) {
    return (
      <AnimatePresence>
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000000003] overflow-y-auto cast-details-backdrop"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="min-h-screen flex items-start justify-center p-4">
            <motion.div
              className="bg-[#1a1a1a] rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden shadow-2xl cast-details-content relative"
              style={{ pointerEvents: 'auto' }}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Header */}
              <motion.div className="relative h-64 overflow-hidden rounded-t-2xl">
                {/* Background Image */}
                {person.image && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${person.image})`,
                      filter: 'blur(20px) brightness(0.3)'
                    }}
                  />
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                
                {/* Close Button */}
                <motion.button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full text-white group overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-l-[1px] border-r-[1px] border-white/30 hover:bg-white/10 transform-gpu will-change-transform"
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <motion.svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                    whileHover={{ 
                      rotate: 90,
                      scale: 1.1,
                      transition: { type: 'spring', stiffness: 400, damping: 25 }
                    }}
                  >
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </motion.svg>
                  <motion.span 
                    className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#1a1a1a] rounded text-sm whitespace-nowrap"
                    initial={{ opacity: 0, x: 10 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    Close
                  </motion.span>
                </motion.button>

                {/* Person Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-end space-x-6">
                    {/* Profile Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={person.image || '/placeholder-avatar.png'}
                        alt={person.name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-lg"
                        onError={(e) => {
                          e.target.src = '/placeholder-avatar.png';
                        }}
                      />
                    </div>
                    
                    {/* Basic Info */}
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl md:text-4xl font-bold mb-2">{person.name}</h1>
                      {person.character && (
                        <p className="text-white/80 text-sm md:text-base">
                          as {person.character}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Content */}
              <div className="p-6">
                <div className="text-center text-white/60">
                  <p>Detailed information for {person.name} is not available.</p>
                  <p className="text-sm mt-2">This might be due to missing person ID or API limitations.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!personDetails) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000000003] overflow-y-auto cast-details-backdrop"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="min-h-screen flex items-start justify-center p-2 sm:p-4">
          <motion.div
            className="bg-[#1a1a1a] rounded-2xl sm:rounded-3xl max-w-6xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-hidden shadow-2xl cast-details-content relative"
            style={{ pointerEvents: 'auto' }}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <motion.div className="relative h-64 sm:h-72 md:h-96 overflow-hidden">
              {/* Background Image */}
              {personDetails.profile_path && (
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${personDetails.profile_path})`,
                    filter: 'blur(30px) brightness(0.2)'
                  }}
                />
              )}
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
              
              {/* Close Button */}
              <motion.button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full text-white group overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-l-[1px] border-r-[1px] border-white/30 hover:bg-white/10 transform-gpu will-change-transform"
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  whileHover={{ 
                    rotate: 90,
                    scale: 1.1,
                    transition: { type: 'spring', stiffness: 400, damping: 25 }
                  }}
                >
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </motion.svg>
                <motion.span 
                  className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#1a1a1a] rounded text-sm whitespace-nowrap"
                  initial={{ opacity: 0, x: 10 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  Close
                </motion.span>
              </motion.button>

              {/* Person Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 text-white">
                <div className="flex items-end space-x-4 sm:space-x-6 md:space-x-8">
                  {/* Profile Image */}
                  <div className="flex-shrink-0 relative">
                    <div className="relative">
                      <img
                        src={personDetails.profile_path || '/placeholder-avatar.png'}
                        alt={personDetails.name}
                        className="w-24 h-28 sm:w-28 sm:h-28 md:w-28 md:h-32 lg:w-40 lg:h-40 rounded-2xl sm:rounded-3xl object-cover border-2 border-white/10 shadow-2xl"
                        onError={(e) => {
                          e.target.src = '/placeholder-avatar.png';
                          e.target.onerror = null; // Prevent infinite loop
                        }}
                        onLoad={(e) => {
                          e.target.style.opacity = '1';
                        }}
                        style={{ opacity: 0, transition: 'opacity 0.3s ease-in-out' }}
                      />
                      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-t from-black/30 to-transparent"></div>
                    </div>
                  </div>
                  
                  {/* Basic Info */}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-light mb-2 sm:mb-4 text-white tracking-tight">{personDetails.name}</h1>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-white/80 text-xs sm:text-sm md:text-base">
                      {/* Acting Badge */}
                      {personDetails.known_for_department && (
                        <span className="inline-flex items-center px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-white/90 font-medium text-xs sm:text-sm">
                          <ModernIcons.User />
                          <span className="ml-1 sm:ml-2">Acting</span>
                        </span>
                      )}
                      
                      {/* Birthday */}
                      {personDetails.birthday && (
                        <span className="inline-flex items-center px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-white/90 text-xs sm:text-sm">
                          <ModernIcons.Calendar />
                          <span className="ml-1 sm:ml-2">
                            {formatDate(personDetails.birthday)}
                            {!personDetails.deathday && (
                              <span className="text-white/60 ml-1">({calculateAge(personDetails.birthday)})</span>
                            )}
                          </span>
                        </span>
                      )}
                      
                      {/* Place of Birth */}
                      {personDetails.place_of_birth && (
                        <span className="inline-flex items-center px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-white/90 text-xs sm:text-sm">
                          <ModernIcons.Location />
                          <span className="ml-1 sm:ml-2">{personDetails.place_of_birth}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Content */}
            <div className="flex flex-col lg:flex-row h-[calc(98vh-16rem)] sm:h-[calc(95vh-16rem)] md:h-[calc(95vh-20rem)]">
              {/* Tabs */}
              <div className="flex-shrink-0 border-b border-white/5 lg:border-b-0 lg:border-r lg:w-72 bg-[#0a0a0a]">
                <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible scrollbar-hide">
                  {[
                    { id: 'overview', label: 'Overview', icon: ModernIcons.User },
                    { id: 'filmography', label: 'Filmography', icon: ModernIcons.Film },
                    { id: 'photos', label: 'Photos', icon: ModernIcons.Camera },
                    { id: 'social', label: 'Social', icon: ModernIcons.Globe }
                  ].map((tab) => (
                                         <motion.button
                       key={tab.id}
                       onClick={() => setActiveTab(tab.id)}
                       className={`flex items-center space-x-2 sm:space-x-3 md:space-x-4 px-4 sm:px-6 md:px-8 py-4 sm:py-3 md:py-4 text-left whitespace-nowrap transition-all duration-300 relative touch-manipulation ${
                         activeTab === tab.id
                           ? 'lg:bg-white/5 text-white'
                           : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                       }`}
                       whileHover={{ y: -2, x: 0 }}
                       whileTap={{ scale: 0.95 }}
                     >
                       <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${activeTab === tab.id ? 'bg-white/10' : 'bg-white/5'}`}>
                         <tab.icon />
                       </div>
                       <span className="font-medium text-sm sm:text-base md:text-lg">{tab.label}</span>
                       {activeTab === tab.id && (
                         <motion.div
                           className="absolute bottom-0 left-0 right-0 h-0.5 lg:h-full lg:w-1 lg:right-0 lg:left-auto bg-white/40 shadow-sm"
                           initial={{ scaleX: 0, scaleY: 0 }}
                           animate={{ scaleX: 1, scaleY: 1 }}
                           transition={{ type: "spring", stiffness: 500, damping: 30 }}
                         />
                       )}
                     </motion.button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-16 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent relative group" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
                <AnimatePresence mode="wait">
                  {activeTab === 'overview' && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      {/* Biography */}
                      {personDetails.biography && (
                        <div className="space-y-4 sm:space-y-6">
                          <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="p-2 sm:p-3 bg-white/5 rounded-xl sm:rounded-2xl">
                              <ModernIcons.User />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-light text-white">Biography</h2>
                          </div>
                          <p className="text-white/70 leading-relaxed whitespace-pre-line text-base sm:text-lg max-w-4xl">
                            {personDetails.biography}
                          </p>
                        </div>
                      )}

                      {/* Personal Information */}
                      <div className="space-y-6 sm:space-y-8">
                        <div className="space-y-4 sm:space-y-6">
                          <h3 className="text-lg sm:text-xl font-light text-white/90">Personal Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            {personDetails.birthday && (
                              <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5">
                                <ModernIcons.Calendar />
                                <div>
                                  <span className="font-medium text-white/90 text-sm sm:text-base">Birthday</span>
                                  <div className="text-white/70 text-sm sm:text-base">{formatDate(personDetails.birthday)}</div>
                                </div>
                              </div>
                            )}
                            {personDetails.deathday && (
                              <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5">
                                <ModernIcons.Calendar />
                                <div>
                                  <span className="font-medium text-white/90 text-sm sm:text-base">Death Date</span>
                                  <div className="text-white/70 text-sm sm:text-base">{formatDate(personDetails.deathday)}</div>
                                </div>
                              </div>
                            )}
                            {personDetails.place_of_birth && (
                              <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5">
                                <ModernIcons.Location />
                                <div>
                                  <span className="font-medium text-white/90 text-sm sm:text-base">Place of Birth</span>
                                  <div className="text-white/70 text-sm sm:text-base">{personDetails.place_of_birth}</div>
                                </div>
                              </div>
                            )}
                            {personDetails.known_for_department && (
                              <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5">
                                <ModernIcons.Star />
                                <div>
                                  <span className="font-medium text-white/90 text-sm sm:text-base">Known For</span>
                                  <div className="text-white/70 text-sm sm:text-base">{personDetails.known_for_department}</div>
                                </div>
                              </div>
                            )}
                            {personDetails.homepage && (
                              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <ModernIcons.Globe />
                                <div>
                                  <span className="font-medium text-white/90">Website</span>
                                  <a 
                                    href={personDetails.homepage} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center space-x-2 mt-1"
                                  >
                                    <span>Visit Website</span>
                                    <ModernIcons.ExternalLink />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <h3 className="text-xl font-light text-white/90">Statistics</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/5">
                              <div className="text-2xl font-light text-white mb-2">{personDetails.popularity?.toFixed(1) || 'N/A'}</div>
                              <div className="text-white/60 text-sm">Popularity</div>
                            </div>
                            <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/5">
                              <div className="text-2xl font-light text-white mb-2">{
                                (personDetails.combined_credits?.cast?.length || 0) + 
                                (personDetails.combined_credits?.crew?.length || 0)
                              }</div>
                              <div className="text-white/60 text-sm">Total Credits</div>
                            </div>
                            <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/5">
                              <div className="text-2xl font-light text-white mb-2">{personDetails.combined_credits?.cast?.length || 0}</div>
                              <div className="text-white/60 text-sm">Acting</div>
                            </div>
                            <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/5">
                              <div className="text-2xl font-light text-white mb-2">{personDetails.combined_credits?.crew?.length || 0}</div>
                              <div className="text-white/60 text-sm">Crew</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'filmography' && (
                    <motion.div
                      key="filmography"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      <div className="space-y-6 sm:space-y-8">
                        <h2 className="text-2xl sm:text-3xl font-light text-white">Filmography</h2>
                        
                        {/* Cast Credits */}
                        {personDetails.combined_credits?.cast?.length > 0 && (
                          <div className="space-y-4 sm:space-y-6">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg sm:text-xl font-light text-white/90">Acting Credits</h3>
                              <span className="text-white/60 text-xs sm:text-sm">{personDetails.combined_credits.cast.length} credits</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-4">
                              {personDetails.combined_credits.cast.slice(0, 20).map((item, index) => (
                                <motion.div
                                  key={`${item.id}-${item.credit_id}`}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="group cursor-pointer transform relative touch-manipulation select-none"
                                  onClick={() => handleItemSelect(item)}
                                  whileHover={{ 
                                    scale: 1.02,
                                    transition: {
                                      type: "tween",
                                      duration: 0.2
                                    }
                                  }}
                                  transition={{
                                    type: "tween",
                                    duration: 0.2,
                                    delay: index * 0.05
                                  }}
                                >
                                  <motion.div 
                                    className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative w-full"
                                  >
                                    {/* Media Type Badge */}
                                    <div className="absolute top-2 left-2 z-10">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        item.media_type === 'tv' 
                                          ? 'bg-blue-500/80 text-white' 
                                          : 'bg-orange-500/80 text-white'
                                      }`}>
                                        {item.media_type === 'tv' ? 'TV' : 'Movie'}
                                      </span>
                                    </div>

                                    {/* Rating */}
                                    {item.vote_average && (
                                      <div className="absolute top-2 right-2 z-10">
                                        <span className="bg-black/60 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                          </svg>
                                          {item.vote_average.toFixed(1)}
                                        </span>
                                      </div>
                                    )}

                                    <img
                                      src={item.poster_path || '/placeholder-poster.png'}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.src = '/placeholder-poster.png';
                                      }}
                                    />
                                    
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      whileHover={{ opacity: 1 }}
                                      transition={{ duration: 0.1 }}
                                      className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3"
                                    >
                                      <motion.div className="text-white">
                                        <h4 className="font-medium text-sm truncate">{item.title}</h4>
                                        <p className="text-xs text-gray-300 flex items-center gap-1">
                                          {item.release_date?.split('-')[0] || 'N/A'} •
                                          {item.character && (
                                            <span className="truncate">as {item.character}</span>
                                          )}
                                        </p>
                                      </motion.div>
                                    </motion.div>
                                  </motion.div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Crew Credits */}
                      {personDetails.combined_credits?.crew?.length > 0 && (
                        <div className="space-y-4 sm:space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg sm:text-xl font-light text-white/90">Crew Credits</h3>
                            <span className="text-white/60 text-xs sm:text-sm">{personDetails.combined_credits.crew.length} credits</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-4">
                            {personDetails.combined_credits.crew.slice(0, 20).map((item, index) => (
                                                              <motion.div
                                  key={`${item.id}-${item.credit_id}`}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="group cursor-pointer transform relative touch-manipulation select-none"
                                  onClick={() => handleItemSelect(item)}
                                  whileHover={{ 
                                    scale: 1.02,
                                    transition: {
                                      type: "tween",
                                      duration: 0.2
                                    }
                                  }}
                                  transition={{
                                    type: "tween",
                                    duration: 0.2,
                                    delay: index * 0.05
                                  }}
                                >
                                  <motion.div 
                                    className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative w-full"
                                  >
                                  {/* Media Type Badge */}
                                  <div className="absolute top-2 left-2 z-10">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      item.media_type === 'tv' 
                                        ? 'bg-blue-500/80 text-white' 
                                        : 'bg-orange-500/80 text-white'
                                    }`}>
                                      {item.media_type === 'tv' ? 'TV' : 'Movie'}
                                    </span>
                                  </div>

                                  {/* Job Badge */}
                                  <div className="absolute bottom-2 left-2 right-2">
                                    <span className="bg-black/60 text-white px-2 py-1 rounded text-xs font-medium block text-center">
                                      {item.job}
                                    </span>
                                  </div>

                                  <img
                                    src={item.poster_path || '/placeholder-poster.png'}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = '/placeholder-poster.png';
                                    }}
                                  />
                                  
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    whileHover={{ opacity: 1 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3"
                                  >
                                    <motion.div className="text-white">
                                      <h4 className="font-medium text-sm truncate">{item.title}</h4>
                                      <p className="text-xs text-gray-300 flex items-center gap-1">
                                        {item.release_date?.split('-')[0] || 'N/A'} •
                                        {item.job && (
                                          <span className="truncate">{item.job}</span>
                                        )}
                                      </p>
                                    </motion.div>
                                  </motion.div>
                                </motion.div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'photos' && (
                    <motion.div
                      key="photos"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      <h2 className="text-lg sm:text-xl font-semibold text-white">Photo Gallery</h2>
                      
                      {personDetails.images?.profiles && personDetails.images.profiles.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-4">
                          {personDetails.images.profiles.map((image, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="group cursor-pointer transform relative touch-manipulation select-none"
                              onClick={() => {
                                // Open image in new tab or show in modal
                                window.open(image.file_path, '_blank');
                              }}
                              whileHover={{ 
                                scale: 1.02,
                                transition: {
                                  type: "tween",
                                  duration: 0.2
                                }
                              }}
                            >
                                                            <motion.div 
                                className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative w-full"
                              >
                                {/* Loading state */}
                                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                                  <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                                </div>
                                
                                <img
                                  src={image.file_path}
                                  alt={`${personDetails.name} photo ${index + 1}`}
                                  className="w-full h-full object-cover relative z-10"
                                  onError={(e) => {
                                    e.target.src = '/placeholder-avatar.png';
                                    e.target.onerror = null; // Prevent infinite loop
                                  }}
                                  onLoad={(e) => {
                                    e.target.style.opacity = '1';
                                    // Hide loading spinner when image loads
                                    const loadingSpinner = e.target.parentElement?.querySelector('.animate-spin');
                                    if (loadingSpinner) {
                                      loadingSpinner.style.display = 'none';
                                    }
                                  }}
                                  style={{ opacity: 0, transition: 'opacity 0.3s ease-in-out' }}
                                />
                                
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  whileHover={{ opacity: 1 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3"
                                >
                                  <motion.div className="text-white">
                                    <h4 className="font-medium text-sm truncate">Photo {index + 1}</h4>
                                    <p className="text-xs text-gray-300">Click to view</p>
                                  </motion.div>
                                </motion.div>
                              </motion.div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                          className="text-center py-16 sm:py-20"
                        >
                          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-white/5 to-white/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="space-y-3">
                            <h3 className="text-lg sm:text-xl font-medium text-white/80">No Photos Available</h3>
                            <p className="text-white/50 text-sm sm:text-base max-w-md mx-auto">
                              We couldn't find any photos for {personDetails.name}. This might be due to privacy settings or limited public images.
                            </p>
                            <div className="flex items-center justify-center space-x-4 pt-4">
                              <div className="flex items-center space-x-2 text-white/40 text-xs">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Check back later</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'social' && (
                    <motion.div
                      key="social"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      <h2 className="text-lg sm:text-xl font-semibold text-white">Social Media & Links</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {/* External IDs */}
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-white mb-3">External Links</h3>
                          <div className="space-y-2 sm:space-y-3">
                            {personDetails.imdb_id && (
                              <a
                                href={`https://www.imdb.com/name/${personDetails.imdb_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                              >
                                <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center">
                                  <span className="text-black font-bold text-xs">IMDb</span>
                                </div>
                                <span className="text-white">View on IMDb</span>
                              </a>
                            )}
                            
                            {personDetails.facebook_id && (
                              <a
                                href={`https://www.facebook.com/${personDetails.facebook_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                              >
                                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                  </svg>
                                </div>
                                <span className="text-white">Facebook</span>
                              </a>
                            )}
                            
                            {personDetails.instagram_id && (
                              <a
                                href={`https://www.instagram.com/${personDetails.instagram_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                              >
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                  </svg>
                                </div>
                                <span className="text-white">Instagram</span>
                              </a>
                            )}
                            
                            {personDetails.twitter_id && (
                              <a
                                href={`https://twitter.com/${personDetails.twitter_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                              >
                                <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                  </svg>
                                </div>
                                <span className="text-white">X</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Bottom spacing to ensure content is visible */}
                <div className="h-8"></div>
                
                {/* Scroll to top button */}
                <motion.button
                  onClick={handleScrollToTop}
                  className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 p-2 sm:p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all duration-200 border border-white/20 hover:border-white/40 z-20 touch-manipulation shadow-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </motion.button>
                
                {/* Performance monitoring display (Development only) */}
                {PERFORMANCE_MONITORING && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed top-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50 max-w-xs"
                  >
                    <div className="font-semibold mb-2">🎭 CastDetailsOverlay Stats</div>
                    <div className="space-y-1">
                      <div>Loading: {loading ? 'Yes' : 'No'}</div>
                      <div>Pending: {isPending ? 'Yes' : 'No'}</div>
                      <div>Active Tab: {activeTab}</div>
                      <div>Scroll Position: {scrollPositionRef.current}px</div>
                      <div>Image Cache: {imageCache.size} items</div>
                      <div>Memory Cleanup: {memoryCleanupIntervalRef.current ? 'Active' : 'Inactive'}</div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default CastDetailsOverlay;
