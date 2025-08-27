# CastDetailsOverlay Component

A comprehensive overlay component that displays detailed information about actors/actresses including biography, filmography, photos, and social media links.

## Features

- **Detailed Biography**: Shows actor's biography, personal information, and statistics
- **Complete Filmography**: Displays all movies and TV shows the actor has appeared in
- **Photo Gallery**: Shows professional photos of the actor
- **Social Media Links**: Direct links to IMDb, Facebook, Instagram, Twitter, etc.
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Smooth Animations**: Uses Framer Motion for fluid transitions and interactions
- **Performance Optimized**: Includes memory management and lazy loading

## Usage

### Basic Usage

```jsx
import CastDetailsOverlay from './CastDetailsOverlay';

function MyComponent() {
  const [selectedCastMember, setSelectedCastMember] = useState(null);
  const [showCastDetails, setShowCastDetails] = useState(false);

  const handleCastMemberClick = (person) => {
    setSelectedCastMember(person);
    setShowCastDetails(true);
  };

  const handleCastDetailsClose = () => {
    setShowCastDetails(false);
    setSelectedCastMember(null);
  };

  return (
    <div>
      {/* Your other components */}
      
      {/* Cast Details Overlay */}
      {showCastDetails && selectedCastMember && (
        <CastDetailsOverlay
          person={selectedCastMember}
          onClose={handleCastDetailsClose}
          onMovieSelect={handleMovieSelect}
          onSeriesSelect={handleSeriesSelect}
        />
      )}
    </div>
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `person` | Object | Yes | The person/actor object with basic information |
| `onClose` | Function | Yes | Callback function when the overlay is closed |
| `onMovieSelect` | Function | No | Callback function when a movie is selected from filmography |
| `onSeriesSelect` | Function | No | Callback function when a TV series is selected from filmography |

### Person Object Structure

```javascript
{
  id: number,           // TMDB person ID
  name: string,         // Actor's name
  character: string,    // Character name in the current movie/show
  image: string         // Profile image URL
}
```

## Integration Examples

### In MovieDetailsOverlay

The component is already integrated into the MovieDetailsOverlay. Cast names in the header section are clickable and will open the CastDetailsOverlay.

### In HomePage

Cast avatars in the hero section are clickable and will open the CastDetailsOverlay.

### Custom Integration

To make cast members clickable in your own components:

```jsx
// Make cast names clickable
{movieDetails.cast.slice(0, 3).map((person, idx) => (
  <span 
    key={person.id || idx}
    onClick={() => handleCastMemberClick(person)}
    className="hover:text-white hover:cursor-pointer transition-colors duration-200"
  >
    {person.name}
    {idx < Math.min(2, movieDetails.cast.length - 1) ? ', ' : ''}
  </span>
))}

// Make cast avatars clickable
{castMembers.map((person, idx) => (
  <div 
    key={idx} 
    className="cursor-pointer hover:scale-105 transition-transform duration-200"
    onClick={() => handleCastMemberClick(person)}
  >
    <img src={person.image} alt={person.name} />
    <span>{person.name}</span>
  </div>
))}
```

## API Integration

The component uses the following TMDB API endpoints:

- `getPersonDetails(personId)` - Fetches detailed person information
- `getPersonCombinedCredits(personId)` - Fetches filmography
- `getPersonImages(personId)` - Fetches photos
- `getPersonExternalIds(personId)` - Fetches social media links

## Styling

The component uses Tailwind CSS classes and follows the existing design system:

- Background: Dark theme with gradient overlays
- Colors: White text with opacity variations for hierarchy
- Animations: Smooth transitions using Framer Motion
- Responsive: Mobile-first design with breakpoint-specific layouts

## Performance Considerations

- **Memory Management**: Aggressive cleanup of image references to prevent memory leaks
- **Lazy Loading**: Images are loaded lazily with proper error handling
- **Virtualization**: Large filmography lists are virtualized for better performance
- **Caching**: API responses are cached to reduce redundant requests

## Accessibility

- **Keyboard Navigation**: Full keyboard support with escape key to close
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Focus is properly managed when overlay opens/closes
- **High Contrast**: Design works well with high contrast mode

## Browser Support

- Modern browsers with ES6+ support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires JavaScript enabled

## Dependencies

- React 18+
- Framer Motion
- Tailwind CSS
- TMDB API service functions

## Testing

The component includes comprehensive tests covering:

- Loading states
- Error handling
- User interactions
- Data display
- Accessibility features

Run tests with:
```bash
npm test CastDetailsOverlay.test.jsx
```

## Future Enhancements

Potential improvements for future versions:

- **Advanced Filtering**: Filter filmography by year, genre, rating
- **Search Functionality**: Search within filmography
- **Image Gallery**: Full-screen image viewer with navigation
- **Related Actors**: Show similar actors or co-stars
- **Awards Section**: Display awards and nominations
- **News Feed**: Latest news about the actor
- **Fan Art**: User-generated content section 