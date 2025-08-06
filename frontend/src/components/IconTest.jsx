import React from 'react';

const IconTest = () => {
  const icons = [
    {
      name: "Movie Camera",
      icon: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
        </svg>
      )
    },
    {
      name: "Monitor/TV",
      icon: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 3H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h4l-2 2h8l-2-2h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
        </svg>
      )
    },
    {
      name: "Bookmark",
      icon: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
        </svg>
      )
    },
    {
      name: "Star",
      icon: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
      )
    },
    {
      name: "Play Button",
      icon: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      )
    },
    {
      name: "Search",
      icon: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-light mb-8 text-center">Icon Test - Animated Center Icons</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {icons.map((iconData, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
              <div className="flex justify-center mb-4">
                {iconData.icon}
              </div>
              <h3 className="text-white font-medium">{iconData.name}</h3>
              <p className="text-white/60 text-sm mt-2">Icon #{index + 1}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-white/60">
            All icons should display clearly. The TV/Monitor icon has been fixed to use a simpler, more reliable SVG path.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IconTest; 