import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const PRIMARY_ACCENT = 'indigo-400'; // Change to your site's accent if needed

const pillSpring = {
  type: 'spring',
  stiffness: 520,
  damping: 28,
  mass: 0.7,
};

const pillVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { ...pillSpring, duration: 0.32 },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    transition: { ...pillSpring, duration: 0.16 },
  },
};

const MinimalToastContent = ({ type, message, show }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        layout
        className={`fixed top-[8%] right-[1%] z-50 flex items-center px-4 py-2
          shadow-2xl bg-black/60 bg-clip-padding backdrop-blur-xl
          border border-white/10
          ring-1 ring-${PRIMARY_ACCENT}/40
          text-white/90 text-base font-medium
          min-w-[120px] max-w-fit w-auto
          rounded-2xl
          `}
        style={{
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.28), 0 1.5px 8px 0 rgba(80,80,120,0.10) inset',
          WebkitBackdropFilter: 'blur(18px)',
          backdropFilter: 'blur(18px)',
        }}
        variants={pillVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.span
          layout
          className={`flex items-center justify-center rounded-full p-1 mr-2
            bg-white/10 border border-white/10 shadow-inner
            ${type === 'add' ? `text-${PRIMARY_ACCENT}` : 'text-red-400'}`}
          variants={pillVariants}
        >
          {type === 'add' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </motion.span>
        <motion.span
          layout
          className="whitespace-nowrap pr-1"
          variants={pillVariants}
        >
          {message}
        </motion.span>
      </motion.div>
    )}
  </AnimatePresence>
);

const MinimalToast = (props) => {
  if (typeof window === 'undefined' || !document.body) return null;
  return createPortal(<MinimalToastContent {...props} />, document.body);
};

export default MinimalToast; 