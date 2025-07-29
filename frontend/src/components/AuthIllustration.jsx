import React from 'react';
import { motion, useAnimation } from 'framer-motion';

const bars = [0.7, 1, 0.5, 1, 0.8];

const pulseTransition = {
  duration: 2.2,
  repeat: Infinity,
  ease: 'easeInOut',
};

const AuthIllustration = () => {
  // The pulse animation for syncing play button, bars, and wave
  const pulse = {
    scale: [1, 1.08, 1],
    boxShadow: [
      '0 0 0px 0px #3b82f6',
      '0 0 16px 4px #3b82f6cc',
      '0 0 0px 0px #3b82f6'
    ],
    opacity: [1, 0.92, 1],
    transition: pulseTransition,
  };

  // For the sound wave ring
  const wave = {
    scale: [1, 1.25, 1],
    opacity: [0.18, 0.32, 0.18],
    transition: pulseTransition,
  };

  // For the equalizer bars
  const barPulse = (base, i) => ({
    height: [base * 24, base * 40, base * 18, base * 24],
    opacity: [0.7, 1, 0.7, 0.7],
    transition: { ...pulseTransition, duration: 2.2 + i * 0.18, delay: i * 0.12 },
  });

  // For the orbiting icons
  const orbit = (radius, phase = 0) => ({
    x: [
      Math.cos(phase) * radius,
      Math.cos(phase + Math.PI / 2) * radius,
      Math.cos(phase + Math.PI) * radius,
      Math.cos(phase + (3 * Math.PI) / 2) * radius,
      Math.cos(phase + 2 * Math.PI) * radius,
    ],
    y: [
      Math.sin(phase) * radius,
      Math.sin(phase + Math.PI / 2) * radius,
      Math.sin(phase + Math.PI) * radius,
      Math.sin(phase + (3 * Math.PI) / 2) * radius,
      Math.sin(phase + 2 * Math.PI) * radius,
    ],
    transition: { duration: 8, repeat: Infinity, ease: 'linear' },
  });

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      {/* Central play button with synced pulse and glow */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      >
        {/* Animated sound wave ring */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-400/30"
          style={{ width: 80, height: 80, zIndex: 1 }}
          animate={wave}
        />
        {/* Play button with pulse and glow */}
        <motion.svg
          width="64" height="64" viewBox="0 0 64 64"
          className="drop-shadow-2xl"
          animate={pulse}
        >
          <circle cx="32" cy="32" r="30" fill="white" fillOpacity="0.08" />
          <circle cx="32" cy="32" r="24" fill="white" fillOpacity="0.13" />
          <polygon points="27,20 48,32 27,44" fill="#fff" />
        </motion.svg>
      </motion.div>
      {/* Animated equalizer bars, synced with play button pulse */}
      <div className="absolute left-1/2 bottom-8 flex gap-1 -translate-x-1/2 z-10">
        {bars.map((base, i) => (
          <motion.div
            key={i}
            className="w-2 rounded-full bg-blue-400/80"
            initial={{ height: `${base * 24}px`, opacity: 0.7 }}
            animate={barPulse(base, i)}
          />
        ))}
      </div>
      {/* Orbiting music/movie note icons */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ x: 0, y: 0, zIndex: 2 }}
        animate={orbit(60, 0)}
      >
        {/* Music note */}
        <svg className="w-6 h-6 text-white/70" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 17V5l12-2v12" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </motion.div>
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ x: 0, y: 0, zIndex: 2 }}
        animate={orbit(60, Math.PI * 0.66)}
      >
        {/* Movie clapper */}
        <svg className="w-7 h-7 text-blue-200/80" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="8" width="18" height="13" rx="2" />
          <rect x="1" y="3" width="22" height="5" rx="1.5" />
          <path d="M7 3v5M12 3v5M17 3v5" stroke="#fff" strokeWidth="1.2" />
        </svg>
      </motion.div>
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ x: 0, y: 0, zIndex: 2 }}
        animate={orbit(60, Math.PI * 1.33)}
      >
        {/* Small sparkle */}
        <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
        </svg>
      </motion.div>
      {/* Subtle animated ring */}
      <motion.div
        className="absolute inset-0 border-2 border-white/10 rounded-3xl"
        initial={{ scale: 1, opacity: 0.18 }}
        animate={{ scale: [1, 1.03, 1], opacity: [0.18, 0.08, 0.18] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{ zIndex: 1 }}
      />
    </div>
  );
};

export default AuthIllustration; 