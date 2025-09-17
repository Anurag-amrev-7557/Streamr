# RatingBadge Component

A modern, minimalist, and professional rating badge component designed for displaying movie and TV show ratings across the Streamr application.

## Features

- **Rectangular Minimalist Design**: Clean, simple rectangular badge with dark theme
- **Dynamic Opacity**: Automatically adjusts black background opacity based on rating value
- **Horizontal Layout**: Star icon on the left, rating number on the right
- **Fully Responsive**: Adapts to all screen sizes with appropriate sizing and spacing
- **Responsive Sizing**: Multiple size options that scale appropriately for mobile and desktop
- **Flexible Positioning**: Can be positioned at any corner of the parent container
- **Subtle Animations**: Minimal Framer Motion animations with gentle hover effects
- **Clean Aesthetics**: No gradients, shadows, or complex effects - pure minimalism
- **Accessibility**: High contrast white text on dark background for maximum readability

## Usage

```jsx
import RatingBadge from './RatingBadge';

// Basic usage
<RatingBadge rating={8.5} />

// With custom positioning
<RatingBadge 
  rating={9.2} 
  position="top-right" 
  size="large" 
/>

// Without star icon
<RatingBadge 
  rating={7.8} 
  showIcon={false} 
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rating` | `number \| string` | `0` | The rating value (0-10 scale) |
| `size` | `'small' \| 'default' \| 'large' \| 'xl'` | `'default'` | Size of the badge |
| `showIcon` | `boolean` | `true` | Whether to show the star icon |
| `className` | `string` | `''` | Additional CSS classes |
| `position` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'top-left'` | Position relative to parent |
| `showShadow` | `boolean` | `false` | Whether to show a subtle shadow for better visibility |

## Rating Opacity Scheme

- **9.0+**: 90% black background - Premium content
- **8.5+**: 80% black background - High-rated content
- **7.5+**: 70% black background - Good content
- **6.5+**: 60% black background - Average content
- **5.5+**: 50% black background - Below average content
- **<5.5**: 50% black background - Low-rated content

All ratings use white text for maximum contrast and readability.

## Size Specifications

### Mobile (default) / Desktop (sm:)
- **small**: Height 20px/24px with 8px/10px horizontal padding, rounded-xs/sm corners
- **default**: Height 24px/28px with 10px/14px horizontal padding, rounded-sm/md corners
- **large**: Height 28px/32px with 12px/18px horizontal padding, rounded-md corners
- **xl**: Height 32px/36px with 14px/22px horizontal padding, rounded-md/lg corners

Width is automatically adjusted based on content (star + rating + spacing).

## Positioning

The badge is positioned absolutely within its parent container with responsive spacing:
- **top-left**: 4px/8px from top, -4px from left (mobile/desktop)
- **top-right**: 8px/12px from top, 8px/12px from right (mobile/desktop)
- **bottom-left**: 8px/12px from bottom, 0px from left (mobile/desktop)
- **bottom-right**: 8px/12px from bottom, 8px/12px from right (mobile/desktop)

Ensure the parent has `position: relative` for proper positioning.

## Integration

The RatingBadge component is currently integrated in:

1. **HomePage**: Swiper cards at top-left position
2. **MoviesPage**: Movie cards at top-left position
3. **SeriesPage**: Series cards at top-left position

## Styling

The component uses Tailwind CSS classes and follows ultra-minimalist principles:
- Clean dark backgrounds with varying opacity
- Simple borders with subtle white borders
- White text for maximum contrast
- Rectangular shape with responsive rounded corners
- Horizontal layout with star icon and rating
- Responsive internal spacing and padding
- Responsive sizing for star icon and spacing
- Responsive font weights (semibold on mobile, bold on desktop)
- No gradients, shadows, or complex effects
- Smooth but subtle transitions

## Performance

- Optimized with React.memo for performance
- Framer Motion animations are hardware accelerated
- Minimal re-renders with proper prop handling

## Accessibility

- High contrast colors for readability
- Proper z-index layering
- Smooth animations respect user preferences
- Keyboard navigation support

## Examples

### Basic Movie Card Integration
```jsx
<div className="relative">
  <img src={movie.poster} alt={movie.title} />
  <RatingBadge 
    rating={movie.vote_average} 
    position="top-left"
    size="default"
  />
</div>
```

### Custom Styling
```jsx
<RatingBadge 
  rating={8.7}
  size="large"
  position="top-right"
  className="custom-shadow"
  showShadow={true}
/>
```

## Future Enhancements

- Support for different rating scales (0-5, 0-100)
- Custom opacity schemes
- Animated rating changes
- Rating comparison badges
- Accessibility improvements for screen readers
- Optional subtle shadows for enhanced visibility 