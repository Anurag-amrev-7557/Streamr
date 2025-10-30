import React from 'react';

/**
 * CenteredLogoLoader
 * Small presentational component that renders the "logo" style spinner
 * used across cards. Keeps the same markup & keyframes as before but
 * centralizes it so other components can re-use it.
 */
const CenteredLogoLoader = ({ size = 48 }) => {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
      <div className="loader-spinner" style={{ width: px, height: px }} />
      <style>{`
        .loader-spinner { --size: 18px; --first-block-clr: rgba(255,255,255, 0.8); --second-block-clr: rgba(255,255,255, 0.8); --clr: #111; width: ${px}; height: ${px}; position: relative; }
        .loader-spinner::after,.loader-spinner::before { box-sizing: border-box; position: absolute; content: ""; width: 18px; height: 20px; top: 50%; animation: up 2.4s cubic-bezier(0,0,0.24,1.21) infinite; left: 50%; background: var(--first-block-clr); backdrop-filter: blur(10px); }
        .loader-spinner::after { background: var(--second-block-clr); top: calc(50% - var(--size)); left: calc(50% - var(--size)); animation: down 2.4s cubic-bezier(0,0,0.24,1.21) infinite; backdrop-filter: blur(10px); }
        @keyframes down { 0%,100% { transform: none; } 25% { transform: translateX(80%);} 50% { transform: translateX(80%) translateY(80%);} 75% { transform: translateY(80%);} }
        @keyframes up { 0%,100% { transform: none; } 25% { transform: translateX(-90%);} 50% { transform: translateX(-90%) translateY(-90%);} 75% { transform: translateY(-90%);} }
      `}</style>
    </div>
  );
};

export default CenteredLogoLoader;
