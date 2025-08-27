import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import enhancedLoadingService from '../services/enhancedLoadingService';

const NetworkStatusBadge = ({ className = '' }) => {
  const [networkProfile, setNetworkProfile] = useState('fast');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Monitor network status
    const cleanup = enhancedLoadingService.monitorNetworkStatus((profile) => {
      setNetworkProfile(profile);
      setIsVisible(profile !== 'fast');
    });

    return cleanup;
  }, []);

  const badgeConfig = enhancedLoadingService.getNetworkStatusBadge(networkProfile);

  if (!badgeConfig || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`fixed top-4 right-4 z-50 ${className}`}
      >
        <div className={`px-4 py-2 rounded-lg border backdrop-blur-sm ${badgeConfig.color}`}>
          <div className="flex items-center space-x-2">
            {/* Network icon */}
            <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
            <span className="text-xs font-light">{badgeConfig.text}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NetworkStatusBadge; 