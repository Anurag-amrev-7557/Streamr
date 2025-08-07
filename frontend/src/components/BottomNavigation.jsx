import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useLoading } from '../contexts/LoadingContext';

const BottomNavigation = () => {
  const location = useLocation();
  const { loadingStates, isAnyLoading } = useLoading();

  // Hide bottom navigation during critical loading states that indicate full page loading
  // These states typically indicate the page is in a loading state where navigation should be hidden
  const criticalLoadingStates = ['initial', 'featured'];
  const isCriticalLoading = criticalLoadingStates.some(state => loadingStates[state]);

  // Also hide during any loading state when on specific pages that show full page loaders
  const pagesWithFullPageLoaders = ['/watchlist'];
  const isOnPageWithFullPageLoader = pagesWithFullPageLoaders.includes(location.pathname);
  const shouldHideForPageLoading = isOnPageWithFullPageLoader && isAnyLoading;

  if (isCriticalLoading || shouldHideForPageLoading) {
    return null;
  }

  const navItems = [
    {
      path: '/',
      label: 'Home',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9,22 9,12 15,12 15,22" />
        </svg>
      )
    },
    {
      path: '/movies',
      label: 'Movies',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="2" y1="7" x2="7" y2="7" />
          <line x1="2" y1="17" x2="7" y2="17" />
          <line x1="17" y1="17" x2="22" y2="17" />
          <line x1="17" y1="7" x2="22" y2="7" />
        </svg>
      )
    },
    {
      path: '/series',
      label: 'Series',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    },
    {
      path: '/community',
      label: 'Community',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      path: '/watchlist',
      label: 'Wishlist',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )
    }
  ];

  const navigationContent = (
    <nav className="bottom-navigation bg-black/95 backdrop-blur-xl border-t border-white/10 shadow-2xl bottom-nav-safe md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 group touch-manipulation"
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              {/* Icon container */}
              <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 group-hover:scale-110 group-active:scale-95">
                <motion.div
                  className={`transition-all duration-300 ${
                    isActive 
                      ? 'text-white' 
                      : 'text-white/60 group-hover:text-white/80'
                  }`}
                  animate={{
                    scale: isActive ? [1, 1.1, 1] : 1,
                    rotate: isActive ? [0, 5, -5, 0] : 0,
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeInOut",
                  }}
                >
                  {item.icon}
                </motion.div>
              </div>
              
              {/* Label */}
              <span className={`text-xs font-medium mt-0.5 transition-all duration-300 ${
                isActive 
                  ? 'text-white' 
                  : 'text-white/60 group-hover:text-white/80'
              }`}>
                {item.label}
              </span>
              
              {/* Hover effect */}
              <motion.div
                className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              />
              
              {/* Touch feedback for mobile */}
              <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-active:opacity-100 transition-opacity duration-150" />
            </Link>
          );
        })}
      </div>
      
      {/* Bottom safe area for devices with home indicators */}
      <div className="h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </nav>
  );

  // Use portal to render at root level
  return createPortal(navigationContent, document.body);
};

export default BottomNavigation; 