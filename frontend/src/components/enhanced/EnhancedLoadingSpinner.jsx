import React, { memo } from 'react';
import { motion } from 'framer-motion';

// Minimalist, Modern, Professional Loading Spinner
const EnhancedLoadingSpinner = memo(({
  size = 'md',
  color = 'primary',
  text = '',
  showText = false,
  className = '',
  variant = 'spinner', // spinner, dots, pulse, bars
  ...props
}) => {
  // Minimal, modern sizing
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10'
  };

  // Professional, neutral color palette
  const colorMap = {
    primary: 'text-blue-500',
    secondary: 'text-gray-400',
    white: 'text-white',
    black: 'text-black',
    success: 'text-green-500',
    warning: 'text-yellow-400',
    error: 'text-red-500'
  };

  // Minimalist spinner: thin, subtle, no shadow
  const SpinnerVariant = () => (
    <motion.div
      className={`
        ${sizeMap[size]} ${colorMap[color]}
        border-2 border-solid border-current border-t-transparent
        rounded-full
        bg-transparent
      `}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      role="status"
      aria-label="Loading"
      style={{ borderRightColor: 'transparent', borderBottomColor: 'transparent' }}
    />
  );

  // Minimalist dots: 3 subtle, small, evenly spaced
  const DotsVariant = () => (
    <div className="flex gap-1" role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`${sizeMap[size]} ${colorMap[color]} bg-current rounded-full`}
          style={{ opacity: 0.7 }}
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  // Minimalist pulse: single, soft, subtle
  const PulseVariant = () => (
    <motion.div
      className={`${sizeMap[size]} ${colorMap[color]} bg-current rounded-full`}
      animate={{
        scale: [1, 1.15, 1],
        opacity: [0.5, 1, 0.5]
      }}
      transition={{
        duration: 1.3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      role="status"
      aria-label="Loading"
    />
  );

  // Minimalist bars: 4 thin, subtle bars
  const BarsVariant = () => (
    <div className="flex gap-1" role="status" aria-label="Loading">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className={`w-1 ${colorMap[color]} bg-current rounded-full`}
          style={{ height: sizeMap[size].split(' ')[1] }}
          animate={{
            scaleY: [1, 1.7, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.12,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  // Choose variant
  const getVariant = () => {
    switch (variant) {
      case 'dots': return <DotsVariant />;
      case 'pulse': return <PulseVariant />;
      case 'bars': return <BarsVariant />;
      default: return <SpinnerVariant />;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} {...props}>
      <div className="flex items-center justify-center">{getVariant()}</div>
      {showText && text && (
        <motion.p
          className="mt-2 text-sm text-gray-400 text-center font-medium tracking-wide"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
});

// Minimalist, modern full-page loader
export const PageLoader = memo(({ 
  text = 'Loading…',
  size = 'lg',
  variant = 'spinner',
  className = ''
}) => (
  <div className={`min-h-screen flex items-center justify-center bg-neutral-950 ${className}`}>
    <EnhancedLoadingSpinner
      size={size}
      variant={variant}
      text={text}
      showText={true}
      color="white"
    />
  </div>
));

// Minimalist, modern section loader
export const SectionLoader = memo(({ 
  text = 'Loading…',
  size = 'md',
  variant = 'spinner',
  className = ''
}) => (
  <div className={`py-8 flex items-center justify-center ${className}`}>
    <EnhancedLoadingSpinner
      size={size}
      variant={variant}
      text={text}
      showText={true}
      color="primary"
    />
  </div>
));

// Minimalist, modern card loader (skeleton cards)
export const CardLoader = memo(({ 
  className = '',
  count = 1
}) => {
  const cards = Array.from({ length: count }, (_, i) => i);
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${className}`}>
      {cards.map((i) => (
        <motion.div
          key={i}
          className="bg-neutral-900 rounded-lg overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <div className="aspect-[16/10] bg-neutral-800" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-neutral-800 rounded w-3/4" />
            <div className="h-3 bg-neutral-800 rounded w-1/2" />
            <div className="flex gap-1">
              <div className="h-6 bg-neutral-800 rounded-full w-12" />
              <div className="h-6 bg-neutral-800 rounded-full w-16" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

// Minimalist, modern skeleton
export const Skeleton = memo(({ 
  className = '',
  variant = 'text', // text, avatar, button, card
  lines = 1,
  ...props
}) => {
  const variants = {
    text: (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`h-4 bg-neutral-800 rounded animate-pulse ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
          />
        ))}
      </div>
    ),
    avatar: (
      <div className="w-12 h-12 bg-neutral-800 rounded-full animate-pulse" />
    ),
    button: (
      <div className="h-10 bg-neutral-800 rounded-lg animate-pulse w-24" />
    ),
    card: (
      <div className="bg-neutral-900 rounded-lg p-4 space-y-3">
        <div className="h-4 bg-neutral-800 rounded w-3/4" />
        <div className="h-3 bg-neutral-800 rounded w-1/2" />
        <div className="h-3 bg-neutral-800 rounded w-2/3" />
      </div>
    )
  };

  return (
    <div className={className} {...props}>
      {variants[variant]}
    </div>
  );
});

// Display names for debugging
EnhancedLoadingSpinner.displayName = 'EnhancedLoadingSpinner';
PageLoader.displayName = 'PageLoader';
SectionLoader.displayName = 'SectionLoader';
CardLoader.displayName = 'CardLoader';
Skeleton.displayName = 'Skeleton';

export default EnhancedLoadingSpinner;