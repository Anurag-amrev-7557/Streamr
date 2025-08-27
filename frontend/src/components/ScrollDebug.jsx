import React, { useState, useEffect } from 'react';

const ScrollDebug = () => {
  const [scrollInfo, setScrollInfo] = useState({
    scrollY: 0,
    scrollHeight: 0,
    clientHeight: 0,
    bodyOverflow: '',
    htmlOverflow: '',
    canScroll: true,
    focusedElement: null,
    scrollContainer: null,
    scrollContainerOverscroll: ''
  });

  useEffect(() => {
    const updateScrollInfo = () => {
      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const bodyOverflow = document.body.style.overflow;
      const htmlOverflow = document.documentElement.style.overflow;
      const canScroll = scrollHeight > clientHeight && bodyOverflow !== 'hidden';
      
      // Get focused element and its scroll container
      const focusedElement = document.activeElement;
      const scrollContainer = focusedElement?.closest('[class*="overflow-y-auto"], [class*="overflow-x-auto"]');
      const scrollContainerOverscroll = scrollContainer?.style?.overscrollBehavior || 'default';

      setScrollInfo({
        scrollY,
        scrollHeight,
        clientHeight,
        bodyOverflow,
        htmlOverflow,
        canScroll,
        focusedElement: focusedElement?.tagName || 'none',
        scrollContainer: scrollContainer ? 'found' : 'none',
        scrollContainerOverscroll
      });
    };

    // Update immediately
    updateScrollInfo();

    // Update on scroll
    window.addEventListener('scroll', updateScrollInfo, { passive: true });
    
    // Update on resize
    window.addEventListener('resize', updateScrollInfo, { passive: true });

    // Periodic check for scroll issues
    const interval = setInterval(() => {
      updateScrollInfo();
      
      // Auto-fix scroll issues
      if (document.body.style.overflow === 'hidden') {
        console.warn('ScrollDebug: Detected locked scroll, fixing...');
        document.body.style.overflow = 'auto';
        updateScrollInfo();
      }
    }, 2000);

    return () => {
      window.removeEventListener('scroll', updateScrollInfo);
      window.removeEventListener('resize', updateScrollInfo);
      clearInterval(interval);
    };
  }, []);

  const fixScroll = () => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    // Fix all scroll containers
    const scrollContainers = document.querySelectorAll('[class*="overflow-y-auto"], [class*="overflow-x-auto"]');
    scrollContainers.forEach(container => {
      container.style.overscrollBehavior = 'auto';
    });
    
    setScrollInfo(prev => ({ 
      ...prev, 
      bodyOverflow: 'auto', 
      htmlOverflow: 'auto', 
      canScroll: true,
      scrollContainerOverscroll: 'auto'
    }));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50 max-w-xs">
      <div className="font-bold mb-2">Scroll Debug</div>
      <div className="space-y-1">
        <div>Scroll Y: {scrollInfo.scrollY}</div>
        <div>Scroll Height: {scrollInfo.scrollHeight}</div>
        <div>Client Height: {scrollInfo.clientHeight}</div>
        <div>Body Overflow: {scrollInfo.bodyOverflow || 'default'}</div>
        <div>HTML Overflow: {scrollInfo.htmlOverflow || 'default'}</div>
        <div className={`font-bold ${scrollInfo.canScroll ? 'text-green-400' : 'text-red-400'}`}>
          Can Scroll: {scrollInfo.canScroll ? 'Yes' : 'No'}
        </div>
        <div>Focused: {scrollInfo.focusedElement}</div>
        <div>Scroll Container: {scrollInfo.scrollContainer}</div>
        <div>Overscroll: {scrollInfo.scrollContainerOverscroll}</div>
      </div>
      <div className="mt-3 space-y-1">
        <button 
          onClick={fixScroll}
          className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
        >
          Fix Scroll
        </button>
        <button 
          onClick={scrollToTop}
          className="w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
        >
          Scroll to Top
        </button>
        <button 
          onClick={scrollToBottom}
          className="w-full bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs"
        >
          Scroll to Bottom
        </button>
      </div>
    </div>
  );
};

export default ScrollDebug; 