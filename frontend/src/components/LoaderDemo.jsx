import React, { useState, useEffect } from 'react';
import { PageLoader } from './Loader';

/**
 * Demo component to showcase the redesigned PageLoader
 * Demonstrates both minimalist and classic variants
 */
const LoaderDemo = () => {
  const [showLoader, setShowLoader] = useState(false);
  const [variant, setVariant] = useState('minimalist');
  const [progress, setProgress] = useState(0);
  const [demoText, setDemoText] = useState('Loading your cinematic experience...');

  // Simulate loading progress
  useEffect(() => {
    if (showLoader && progress < 100) {
      const timer = setTimeout(() => {
        setProgress(prev => Math.min(prev + Math.random() * 15, 100));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showLoader, progress]);

  const startDemo = (selectedVariant) => {
    setVariant(selectedVariant);
    setProgress(0);
    setShowLoader(true);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setShowLoader(false);
      setProgress(0);
    }, 5000);
  };

  const customTips = [
    "Pro tip: Use keyboard shortcuts for faster navigation",
    "Did you know? You can create custom watchlists",
    "Explore: Try different viewing modes for better experience",
    "Hint: Hover over movie cards for quick previews",
    "Fun fact: Our recommendations improve with your activity",
    "Tip: Use the search filters to find exactly what you want"
  ];

  return (
    <div className="min-h-screen bg-[#121417] p-8">
      {/* Demo Controls */}
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white/90">
            PageLoader Redesign Demo
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Showcasing the redesigned PageLoader component with minimalist and classic variants. 
            The new design features the Streamr logo for brand consistency and is more professional, 
            modern, and visually appealing while maintaining the website's theme and vibe.
          </p>
        </div>

        {/* Variant Selection */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => startDemo('minimalist')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 border border-white/20 hover:border-white/40"
          >
            <div className="text-center">
              <div className="font-medium">Minimalist Variant</div>
              <div className="text-sm text-white/60">Clean & Modern</div>
            </div>
          </button>
          
          <button
            onClick={() => startDemo('classic')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 border border-white/20 hover:border-white/40"
          >
            <div className="text-center">
              <div className="font-medium">Classic Variant</div>
              <div className="text-sm text-white/60">Enhanced Original</div>
            </div>
          </button>
        </div>

        {/* Feature Comparison */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white/90 mb-4">Minimalist Design</h3>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Clean, professional appearance
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Subtle animations and effects
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Minimal visual noise
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Focus on content and functionality
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Perfect for professional applications
              </li>
            </ul>
          </div>

          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white/90 mb-4">Classic Design</h3>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                Enhanced visual effects
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                Aurora background animations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                Orbiting elements and particles
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                More engaging visual experience
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                Great for entertainment applications
              </li>
            </ul>
          </div>
        </div>

        {/* Customization Options */}
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h3 className="text-xl font-semibold text-white/90 mb-4">Customization Options</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-2xl mb-2">🎨</div>
              <div className="font-medium text-white/90">Variants</div>
              <div className="text-sm text-white/60">Minimalist & Classic</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-white/90">Progress</div>
              <div className="text-sm text-white/60">Real-time progress bars</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-2xl mb-2">💡</div>
              <div className="font-medium text-white/90">Tips</div>
              <div className="text-sm text-white/60">Rotating helpful tips</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-2xl mb-2">♿</div>
              <div className="font-medium text-white/90">Accessible</div>
              <div className="text-sm text-white/60">Screen reader friendly</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-medium text-white/90">Branded</div>
              <div className="text-sm text-white/60">Streamr logo integration</div>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h3 className="text-xl font-semibold text-white/90 mb-4">Usage Examples</h3>
          <div className="space-y-4">
            <div className="bg-[#1a1d24] rounded-lg p-4">
              <div className="text-sm text-white/60 mb-2">Minimalist Loading</div>
              <code className="text-green-400 text-sm">
                {`<PageLoader variant="minimalist" text="Loading..." />`}
              </code>
            </div>
            <div className="bg-[#1a1d24] rounded-lg p-4">
              <div className="text-sm text-white/60 mb-2">Classic with Progress</div>
              <code className="text-green-400 text-sm">
                {`<PageLoader variant="classic" showProgress progress={75} />`}
              </code>
            </div>
            <div className="bg-[#1a1d24] rounded-lg p-4">
              <div className="text-sm text-white/60 mb-2">Custom Tips</div>
              <code className="text-green-400 text-sm">
                {`<PageLoader tips={customTips} showTips />`}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* PageLoader Demo */}
      {showLoader && (
        <PageLoader
          variant={variant}
          text={demoText}
          showProgress={true}
          progress={progress}
          tips={customTips}
          showTips={true}
          tipInterval={3000}
        />
      )}
    </div>
  );
};

export default LoaderDemo; 