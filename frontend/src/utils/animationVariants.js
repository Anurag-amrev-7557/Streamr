// Centralized animation variants and transitions used across the app
export const defaultTransition = {
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94]
};

export const fastTransition = {
  duration: 0.18,
  ease: [0.2, 0.8, 0.2, 1]
};

export const springEntrance = (opts = {}) => ({
  hidden: { y: 50, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 25,
      mass: 1,
      delay: opts.delay ?? 0.05
    }
  }
});

export const fadeUpVariant = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { ...defaultTransition, delay }
});

export const reducedMotionTransition = { duration: 0 };

export default {
  defaultTransition,
  fastTransition,
  springEntrance,
  fadeUpVariant,
  reducedMotionTransition
};
