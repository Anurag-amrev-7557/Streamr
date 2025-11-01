import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CenteredLogoLoader
 * Motion-enabled loader that fades & scales in/out for smoother enter/exit
 * Used on cards/pages as the logo-style spinner. Backwards-compatible props:
 * - size: number|string
 * - visible: boolean (controls AnimatePresence)
 * - overlay: boolean (whether to render the semi-opaque backdrop)
 */
const spinnerStyle = (px) => ({
  width: px,
  height: px,
  position: 'relative',
});

const defaultAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }
};

const CenteredLogoLoader = ({ size = 48, visible = true, overlay = true, animation = defaultAnimation }) => {
  const px = typeof size === 'number' ? `${size}px` : size;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          {...animation}
          className={`${overlay ? 'absolute inset-0 bg-black/40' : 'relative'} flex items-center justify-center z-20`}
        >
          <div className="loader-spinner" style={spinnerStyle(px)} />
          <style>{`
            .loader-spinner { --size: 18px; --first-block-clr: rgba(255,255,255, 0.9); --second-block-clr: rgba(255,255,255, 0.9); --clr: #111; width: ${px}; height: ${px}; position: relative; }
            .loader-spinner::after,.loader-spinner::before { box-sizing: border-box; position: absolute; content: ""; width: 18px; height: 20px; top: 50%; animation: up 2.4s cubic-bezier(0,0,0.24,1.21) infinite; left: 50%; background: var(--first-block-clr); backdrop-filter: blur(8px); }
            .loader-spinner::after { background: var(--second-block-clr); top: calc(50% - var(--size)); left: calc(50% - var(--size)); animation: down 2.4s cubic-bezier(0,0,0.24,1.21) infinite; backdrop-filter: blur(8px); }
            @keyframes down { 0%,100% { transform: none; } 25% { transform: translateX(80%);} 50% { transform: translateX(80%) translateY(80%);} 75% { transform: translateY(80%);} }
            @keyframes up { 0%,100% { transform: none; } 25% { transform: translateX(-90%);} 50% { transform: translateX(-90%) translateY(-90%);} 75% { transform: translateY(-90%);} }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CenteredLogoLoader;
