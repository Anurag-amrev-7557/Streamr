# Enhanced Animation System

## Overview
A comprehensive, centralized animation system for the Streamr application that provides consistent, smooth, and performant animations across all pages, components, and elements.

## Features
✅ **Smooth 60fps animations** - GPU-accelerated using transform and opacity  
✅ **Consistent timing** - Unified easing curves and durations  
✅ **Accessible** - Respects `prefers-reduced-motion`  
✅ **Performance optimized** - Adapts to device capabilities  
✅ **Easy to use** - Simple components and utility classes  

---

## Quick Start

### 1. Page Transitions
Wrap your page components with `PageTransition` for smooth route changes:

```jsx
import PageTransition from './components/PageTransition';

<Route path="/movies" element={
  <PageTransition variant="slideUp">
    <MoviesPage />
  </PageTransition>
} />
```

**Available variants:**
- `fadeIn` - Simple fade
- `slideUp` - Slide from bottom
- `slideDown` - Slide from top
- `slideLeft` - Slide from right
- `slideRight` - Slide from left
- `scale` - Scale in
- `scaleRotate` - Scale with rotation

### 2. Animated Cards
Use `AnimatedCard` for consistent card animations:

```jsx
import AnimatedCard from './components/AnimatedCard';

<AnimatedCard
  variant="slideIn"
  whileHover={true}
  whileTap={true}
  className="your-classes"
>
  {/* Card content */}
</AnimatedCard>
```

### 3. Animated Buttons
Add micro-interactions to buttons:

```jsx
import AnimatedButton from './components/AnimatedButton';

<AnimatedButton
  pulse={false} // Set to true for pulse effect
  className="btn-primary"
  onClick={handleClick}
>
  Click Me
</AnimatedButton>
```

### 4. Animated Lists
Stagger animations for lists and grids:

```jsx
import { AnimatedList, AnimatedListItem } from './components/AnimatedList';

<AnimatedList type="grid"> {/* or "list" */}
  {items.map(item => (
    <AnimatedListItem key={item.id} type="grid">
      {/* Item content */}
    </AnimatedListItem>
  ))}
</AnimatedList>
```

---

## CSS Utility Classes

### Animation Classes
```html
<!-- Fade animations -->
<div class="animate-fade-in">Fades in</div>

<!-- Scale animations -->
<div class="animate-scale-in">Scales in</div>
<div class="animate-scale-bounce">Bouncy scale</div>

<!-- Special effects -->
<div class="animate-heartbeat">Heartbeat effect</div>
<div class="animate-glow">Glowing effect</div>
<div class="animate-shake">Shake on error</div>
```

### Transition Classes
```html
<!-- Smooth transitions -->
<div class="transition-smooth">All properties</div>
<div class="transition-colors">Colors only</div>
<div class="transition-transform">Transform only</div>
<div class="transition-opacity">Opacity only</div>
<div class="transition-shadow">Shadow only</div>
```

### Hover Effects
```html
<!-- Lift on hover -->
<button class="hover-lift">Lifts up</button>

<!-- Scale on hover -->
<button class="hover-scale">Scales up</button>

<!-- Glow on hover -->
<button class="hover-glow">Glows</button>

<!-- Brighten on hover -->
<img class="hover-brightness" />
```

### Card Effects
```html
<!-- Card hover effect -->
<div class="card-hover">
  Card content
</div>

<!-- Press effect on active -->
<div class="card-hover card-press">
  Clickable card
</div>
```

### GPU Acceleration
```html
<!-- Force GPU acceleration -->
<div class="gpu-accelerated">
  Hardware accelerated
</div>

<div class="gpu-transform">
  Transform only acceleration
</div>
```

### Stagger Delays
```html
<!-- Add delays for stagger effects -->
<div class="animate-fade-in stagger-1">First item</div>
<div class="animate-fade-in stagger-2">Second item</div>
<div class="animate-fade-in stagger-3">Third item</div>
```

---

## Using Framer Motion Variants

Import animation configs from the centralized configuration:

```jsx
import { 
  pageTransitions, 
  cardAnimations, 
  overlayAnimations,
  buttonAnimations,
  listAnimations
} from '../config/animations';

// Page transition
<motion.div
  initial={pageTransitions.fadeIn.initial}
  animate={pageTransitions.fadeIn.animate}
  exit={pageTransitions.fadeIn.exit}
>
  Content
</motion.div>

// Modal/Overlay
<motion.div
  initial={overlayAnimations.modal.initial}
  animate={overlayAnimations.modal.animate}
  exit={overlayAnimations.modal.exit}
>
  Modal content
</motion.div>

// Hover effect
<motion.button
  whileHover={buttonAnimations.hover}
  whileTap={buttonAnimations.tap}
>
  Button
</motion.button>
```

---

## Configuration

### Easing Curves
```javascript
import { easings } from '../config/animations';

// Available easings:
easings.easeOut    // Smooth deceleration (default)
easings.easeIn     // Smooth acceleration
easings.easeInOut  // Smooth both ways
easings.spring     // Bouncy spring
easings.smooth     // Ultra smooth
easings.snappy     // Quick and responsive
easings.elastic    // Elastic bounce
```

### Durations
```javascript
import { durations } from '../config/animations';

// Available durations (in seconds):
durations.instant   // 0
durations.fast      // 0.15s
durations.normal    // 0.3s
durations.moderate  // 0.4s
durations.slow      // 0.6s
durations.verySlow  // 0.8s
```

### Spring Configurations
```javascript
import { springs } from '../config/animations';

// Spring physics presets:
springs.gentle  // Soft, smooth spring
springs.bouncy  // More bounce
springs.snappy  // Quick response
springs.smooth  // Very smooth
```

---

## Best Practices

### 1. GPU Acceleration
✅ **DO:** Use `transform` and `opacity` for animations
```jsx
// Good
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
/>

// Bad - forces layout recalculation
<motion.div
  initial={{ opacity: 0, top: 20 }}
  animate={{ opacity: 1, top: 0 }}
/>
```

### 2. Performance
✅ **DO:** Add `will-change` and `translateZ(0)` for GPU acceleration
```jsx
<div style={{
  transform: 'translateZ(0)',
  willChange: 'transform, opacity'
}}>
  Content
</div>
```

✅ **DO:** Use the provided utility classes
```html
<div class="gpu-accelerated">
  Hardware accelerated content
</div>
```

### 3. Accessibility
✅ **DO:** Respect user preferences
```jsx
import { shouldReduceMotion } from '../config/animations';

if (shouldReduceMotion()) {
  // Skip or simplify animations
}
```

All animations automatically respect `prefers-reduced-motion` setting.

### 4. Mobile Optimization
Animations automatically adapt on mobile:
- Simpler animations on low-end devices
- Reduced translation distances
- Faster durations

---

## Examples

### Example 1: Movie Card
```jsx
import AnimatedCard from './components/AnimatedCard';

<AnimatedCard
  variant="slideIn"
  delay={index * 0.05} // Stagger effect
  whileHover={true}
  className="movie-card"
>
  <img src={movie.poster} alt={movie.title} />
  <h3>{movie.title}</h3>
</AnimatedCard>
```

### Example 2: Modal Overlay
```jsx
import { motion, AnimatePresence } from 'framer-motion';
import { overlayAnimations } from '../config/animations';

<AnimatePresence>
  {isOpen && (
    <>
      {/* Backdrop */}
      <motion.div
        {...overlayAnimations.backdrop}
        className="fixed inset-0 bg-black/80"
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div
        {...overlayAnimations.modal}
        className="fixed inset-0 flex items-center justify-center"
      >
        <div className="bg-gray-900 p-6 rounded-lg">
          Modal content
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

### Example 3: Staggered Grid
```jsx
import { AnimatedList, AnimatedListItem } from './components/AnimatedList';

<AnimatedList type="grid">
  {movies.map((movie, index) => (
    <AnimatedListItem key={movie.id} type="grid">
      <div className="movie-card">
        <img src={movie.poster} alt={movie.title} />
        <h3>{movie.title}</h3>
      </div>
    </AnimatedListItem>
  ))}
</AnimatedList>
```

### Example 4: Hero Section
```jsx
import { motion } from 'framer-motion';
import { pageTransitions } from '../config/animations';

<motion.section
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
  className="hero-section"
>
  <h1 className="animate-fade-in">Welcome to Streamr</h1>
  <p className="animate-fade-in stagger-2">Your entertainment hub</p>
</motion.section>
```

---

## Troubleshooting

### Animations not working?
1. Check if `prefers-reduced-motion` is enabled in your OS
2. Verify `framer-motion` is installed
3. Ensure components are wrapped in `AnimatePresence` for exit animations

### Performance issues?
1. Limit the number of simultaneous animations
2. Use CSS transforms instead of position changes
3. Add `will-change` sparingly (only when animating)
4. Remove `will-change` after animation completes

### Animations jerky on mobile?
1. Reduce animation complexity
2. Lower stagger delays
3. Use faster durations
4. Ensure GPU acceleration is enabled

---

## File Structure

```
frontend/src/
├── config/
│   └── animations.js          # Centralized animation configuration
├── components/
│   ├── PageTransition.jsx     # Page transition wrapper
│   ├── AnimatedCard.jsx       # Card animation component
│   ├── AnimatedButton.jsx     # Button with micro-interactions
│   └── AnimatedList.jsx       # List/grid stagger animations
└── index.css                  # CSS animation utilities
```

---

## Performance Metrics

### Target Performance:
- **60fps** - All animations should run at 60fps
- **GPU accelerated** - Using transform/opacity only
- **Layout shifts** - Zero layout shifts during animation
- **Paint operations** - Minimal repaints

### Monitoring:
Enable performance dashboard in development:
- Press `Ctrl+Shift+P` to toggle
- Monitor animation performance
- Check for jank or dropped frames

---

## Browser Support

✅ Chrome/Edge (latest 2 versions)  
✅ Firefox (latest 2 versions)  
✅ Safari (latest 2 versions)  
✅ Mobile browsers (iOS Safari, Chrome Mobile)  

Graceful degradation for older browsers:
- Animations fall back to instant transitions
- Core functionality remains intact

---

## Future Enhancements

🔮 **Planned:**
- Gesture-based animations (swipe, pinch)
- Scroll-linked animations
- Physics-based animations
- 3D transforms for supported devices
- Advanced micro-interactions
- Custom animation timeline builder

---

## Questions?

For questions or issues:
1. Check existing components in `src/components/`
2. Review animation config in `src/config/animations.js`
3. Test with the performance dashboard

**Remember:** Keep animations smooth, subtle, and purposeful. Less is often more!
