import React, { useState } from 'react';
import { PageLoader } from './Loader';

const LoaderDemo = () => {
  const [showLoader, setShowLoader] = useState(false);
  const [variant, setVariant] = useState('minimalist');
  const [progress, setProgress] = useState(0);

  const startLoader = () => {
    setShowLoader(true);
    setProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setShowLoader(false), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  if (showLoader) {
    return (
      <PageLoader 
        text="Loading your cinematic experience..." 
        showProgress={true}
        progress={progress}
        variant={variant}
        showTips={variant !== "ultra-minimalist"}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center space-y-6">
        <h1 className="text-3xl font-light mb-8">Minimalist Loader Demo</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Select Variant:</label>
            <select 
              value={variant} 
              onChange={(e) => setVariant(e.target.value)}
              className="bg-white/10 text-white border border-white/20 rounded px-3 py-2"
            >
              <option value="minimalist">Minimalist</option>
              <option value="ultra-minimalist">Ultra Minimalist</option>
            </select>
          </div>
          
          <button 
            onClick={startLoader}
            className="bg-white text-black px-6 py-3 rounded font-medium hover:bg-white/90 transition-colors"
          >
            Test {variant === 'ultra-minimalist' ? 'Ultra-Minimalist' : 'Minimalist'} Loader
          </button>
        </div>
        
        <div className="text-sm text-white/40 mt-8">
          <p>Minimalist: Clean spinner with subtle accents</p>
          <p>Ultra-Minimalist: Just a pulsing dot</p>
        </div>
      </div>
    </div>
  );
};

export default LoaderDemo; 