import React, { memo } from 'react';
import { motion } from 'framer-motion';

// Enhanced Loading Spinner Component
const EnhancedLoadingSpinner = memo(({
  size = 'md',
  color = 'primary',
  text = '',
  showText = false,
  className = '',
  variant = 'spinner', // spinner, dots, pulse, bars
  ...props
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-blue-500',
    secondary: 'text-gray-500',
    white: 'text-white',
    black: 'text-black',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500'
  };

  const SpinnerVariant = () => (
    <motion.div
      className={`${sizeClasses[size]} ${colorClasses[color]} border-2 border-current border-t-transparent rounded-full`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      role="status"
      aria-label="Loading"
    />
  );

  const DotsVariant = () => (
    <div className="flex space-x-1" role="status" aria-label="Loading">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`${sizeClasses[size]} ${colorClasses[color]} bg-current rounded-full`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: index * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  const PulseVariant = () => (
    <motion.div
      className={`${sizeClasses[size]} ${colorClasses[color]} bg-current rounded-full`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.5, 1, 0.5]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      role="status"
      aria-label="Loading"
    />
  );

  const BarsVariant = () => (
    <div className="flex space-x-1" role="status" aria-label="Loading">
      {[0, 1, 2, 3].map((index) => (
        <motion.div
          key={index}
          className={`w-1 ${colorClasses[color]} bg-current rounded-full`}
          style={{ height: sizeClasses[size].split(' ')[1] }}
          animate={{
            scaleY: [1, 2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  const getVariantComponent = () => {
    switch (variant) {
      case 'dots':
        return <DotsVariant />;
      case 'pulse':
        return <PulseVariant />;
      case 'bars':
        return <BarsVariant />;
      default:
        return <SpinnerVariant />;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} {...props}>
      <div className="flex items-center justify-center">
        {getVariantComponent()}
      </div>
      {showText && text && (
        <motion.p
          className="mt-2 text-sm text-gray-500 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
});

// Enhanced Page Loading Component
export const PageLoader = memo(({ 
  text = 'Loading...',
  size = 'lg',
  variant = 'spinner',
  className = ''
}) => {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-900 ${className}`}>
      <EnhancedLoadingSpinner
        size={size}
        variant={variant}
        text={text}
        showText={true}
        color="white"
      />
    </div>
  );
});

// Enhanced Section Loading Component
export const SectionLoader = memo(({ 
  text = 'Loading content...',
  size = 'md',
  variant = 'spinner',
  className = ''
}) => {
  return (
    <div className={`py-8 flex items-center justify-center ${className}`}>
      <EnhancedLoadingSpinner
        size={size}
        variant={variant}
        text={text}
        showText={true}
        color="primary"
      />
    </div>
  );
});

// Enhanced Card Loading Component
export const CardLoader = memo(({ 
  className = '',
  count = 1
}) => {
  const cards = Array.from({ length: count }, (_, index) => index);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${className}`}>
      {cards.map((index) => (
        <motion.div
          key={index}
          className="bg-gray-800 rounded-lg overflow-hidden animate-pulse"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="aspect-[16/10] bg-gray-700" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-700 rounded w-1/2" />
            <div className="flex space-x-1">
              <div className="h-6 bg-gray-700 rounded-full w-12" />
              <div className="h-6 bg-gray-700 rounded-full w-16" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

// Enhanced Skeleton Component
export const Skeleton = memo(({ 
  className = '',
  variant = 'text', // text, avatar, button, card
  lines = 1,
  ...props
}) => {
  const variants = {
    text: (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`h-4 bg-gray-700 rounded animate-pulse ${index === lines - 1 ? 'w-3/4' : 'w-full'}`}
          />
        ))}
      </div>
    ),
    avatar: (
      <div className="w-12 h-12 bg-gray-700 rounded-full animate-pulse" />
    ),
    button: (
      <div className="h-10 bg-gray-700 rounded-lg animate-pulse w-24" />
    ),
    card: (
      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        <div className="h-4 bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-700 rounded w-1/2" />
        <div className="h-3 bg-gray-700 rounded w-2/3" />
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