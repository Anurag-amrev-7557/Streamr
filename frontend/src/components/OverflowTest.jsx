import React from 'react';

const OverflowTest = () => {
  const testItems = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`);

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">Overflow Test Components</h2>
      
      {/* Test 1: Basic overflow-x-auto */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Basic overflow-x-auto</h3>
        <div className="flex gap-3 overflow-x-auto bg-gray-800 p-4 rounded-lg">
          {testItems.map((item, index) => (
            <div key={index} className="flex-shrink-0 bg-blue-500 text-white px-4 py-2 rounded">
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Test 2: With horizontal-scroll-container class */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">With horizontal-scroll-container class</h3>
        <div className="flex gap-3 overflow-x-auto horizontal-scroll-container bg-gray-800 p-4 rounded-lg">
          {testItems.map((item, index) => (
            <div key={index} className="flex-shrink-0 bg-green-500 text-white px-4 py-2 rounded">
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Test 3: Category selector style */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Category selector style</h3>
        <div className="relative inline-flex rounded-full bg-[#1a1a1a] p-1 overflow-x-auto max-w-full horizontal-scroll-container">
          {testItems.slice(0, 10).map((item, index) => (
            <button
              key={index}
              className="relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 whitespace-nowrap focus:outline-none text-gray-400 hover:text-white"
            >
              <span className="relative z-10">{item}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Test 4: Movie cards style */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Movie cards style</h3>
        <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-4 horizontal-scroll-container">
          {testItems.slice(0, 15).map((item, index) => (
            <div key={index} className="flex-shrink-0">
              <div className="w-80 h-48 bg-purple-500 rounded-lg flex items-center justify-center text-white font-semibold">
                {item}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverflowTest; 