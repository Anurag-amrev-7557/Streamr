import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const AdBlockerRecommendationToast = ({ show, onClose, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (show && !isMobile) {
      setIsVisible(true);
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(), 300); // Wait for exit animation
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onClose, isMobile]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
      onClose();
    }, 300);
  };

  const handleInstallClick = () => {
    // Open uBlock Origin installation page
    window.open('https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm', '_blank');
    handleDismiss();
  };

  const handleLiteClick = () => {
    // Open uBlock Origin Lite installation page
    window.open('https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh', '_blank');
    handleDismiss();
  };

  // Don't render on mobile
  if (isMobile || !show) return null;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 35,
            duration: 0.4 
          }}
          className="fixed top-20 right-6 z-50 max-w-sm w-full"
        >
          <div className="bg-black/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                    <svg 
                      className="w-5 h-5 text-white" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Ad-Free Experience</h3>
                    <p className="text-white/60 text-xs">Enhance your streaming</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-3">
              <p className="text-white/80 text-xs leading-relaxed mb-3">
                Install uBlock Origin for completely ad-free streaming. 
                Block ads, trackers, and popups seamlessly.
              </p>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
              <button
                  onClick={handleLiteClick}
                  className="flex-1 bg-white/10 text-white hover:bg-white/20 transition-colors px-3 py-2 rounded-lg font-medium text-xs flex items-center justify-center space-x-2 border border-white/20"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Lite (Recommended)</span>
                </button>
                
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-white text-black hover:bg-gray-100 transition-colors px-3 py-2 rounded-lg font-medium text-xs flex items-center justify-center space-x-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>Install</span>
                </button>
                

              </div>
              
              <p className="text-white/40 text-xs mt-2 text-center">
                Free • Open Source • Privacy Focused
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AdBlockerRecommendationToast; 