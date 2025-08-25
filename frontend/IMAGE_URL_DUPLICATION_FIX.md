# Image URL Duplication Fix

## Problem Description

The application was experiencing CORS errors due to duplicated TMDB image URLs. The error messages showed URLs like:

```
https://image.tmdb.org/t/p/w500/https://image.tmdb.org/t/p/w500/abWOCrIo7bbAORxcQyOFNJdnnmR.jpg
```

Notice how `https://image.tmdb.org/t/p/w500/` appears twice, causing the browser to block these requests due to CORS policy violations.

## Root Cause

The issue was caused by a combination of factors:

1. **Data Transformation**: The `transformMovieData` function in `tmdbService.js` converts relative image paths to full URLs and stores them in `poster` and `backdrop` fields.

2. **Double URL Construction**: Some components were still using the original `poster_path` and `backdrop_path` fields (which might contain full URLs after transformation) and then trying to construct URLs from them again.

3. **Inconsistent URL Handling**: Different components were using different approaches to construct image URLs, some hardcoding the base URL and others using utility functions.

## Solution Implemented

### 1. Enhanced Image Utility Functions

Updated `frontend/src/utils/imageUtils.js` to handle both relative paths and full URLs:

```javascript
export const getTmdbImageUrl = (path, size = 'w500') => {
  if (!path) return null;
  
  // If the path is already a full TMDB URL, return it as-is
  if (path.startsWith('https://image.tmdb.org/')) {
    return path;
  }
  
  // If the path is already a full URL but not TMDB, return it as-is
  if (path.startsWith('http')) {
    return path;
  }
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}/${size}${cleanPath}`;
};
```

### 2. Updated Component Image Handling

Updated all components to use the `getTmdbImageUrl` utility function instead of hardcoding URL construction:

- `EnhancedSimilarContent.jsx`
- `CulturalRecommendationPanel.jsx`
- `RecommendationDashboard.jsx`
- `MovieDetailsOverlay.jsx`
- `SeriesPage.jsx`
- `PerformanceOptimizedHomePage.jsx`
- `MoviesPage.jsx`
- `Navbar.jsx`
- `MovieDetails.jsx`

### 3. Enhanced Image Props Functions

Updated `getPosterProps` and `getBackdropProps` to handle both `poster_path`/`backdrop_path` and `poster`/`backdrop` fields:

```javascript
export const getPosterProps = (movie, size = 'w500') => {
  // Handle both poster_path and poster fields, preferring poster_path if it's a relative path
  const posterPath = movie.poster_path || movie.poster;
  return getImageProps(
    posterPath,
    size,
    movie.title || movie.name || 'Movie poster',
    'movie-poster'
  );
};
```

## Benefits of the Fix

1. **Prevents CORS Errors**: Eliminates the duplicate URL issue that was causing CORS policy violations.

2. **Consistent URL Handling**: All components now use the same utility function for constructing image URLs.

3. **Backward Compatibility**: The fix handles both relative paths and full URLs gracefully.

4. **Maintainable Code**: Centralized image URL logic makes future updates easier.

5. **Performance**: Prevents unnecessary network requests to malformed URLs.

## Testing

A test utility has been created at `frontend/src/utils/testImageUrlFix.js` to verify the fix works correctly for various input types:

- Relative paths (e.g., `/abWOCrIo7bbAORxcQyOFNJdnnmR.jpg`)
- Full TMDB URLs (e.g., `https://image.tmdb.org/t/p/w500/abWOCrIo7bbAORxcQyOFNJdnnmR.jpg`)
- Full non-TMDB URLs (e.g., `https://example.com/image.jpg`)
- Paths without leading slashes
- Null/undefined values
- Different image sizes

## Usage

Components should now use the utility functions instead of hardcoding URL construction:

```javascript
// ✅ Correct usage
import { getTmdbImageUrl } from '../utils/imageUtils.js';

<img src={getTmdbImageUrl(movie.poster_path, 'w500')} alt="Poster" />

// ❌ Avoid this (can cause duplication)
<img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt="Poster" />
```

## Future Considerations

1. **Data Consistency**: Consider standardizing the data structure to avoid having both `poster_path` and `poster` fields.

2. **Caching**: The utility functions now handle URL deduplication, which could be beneficial for caching strategies.

3. **Error Handling**: Consider adding more robust error handling for malformed image paths.

4. **Performance Monitoring**: Monitor image loading performance to ensure the fix doesn't introduce new issues. 