# Enhanced Similar Content Service

## Overview

The Enhanced Similar Content Service provides intelligent, multi-dimensional content recommendations that go beyond simple genre matching. It combines multiple recommendation strategies to deliver the most relevant and personalized content suggestions.

## Features

### 🎯 Intelligent Similarity Scoring
- **Multi-factor Analysis**: Combines genre, cast, crew, year, rating, and popularity
- **Weighted Scoring**: Configurable weights for different similarity factors
- **Relevance Thresholds**: Filter results by minimum similarity scores

### 🔄 Multiple Recommendation Sources
- **TMDB Recommendations**: Official API recommendations
- **Similar Content**: Content with similar characteristics
- **Genre-based**: Content from the same primary genre
- **Trending**: Currently popular content in the same category

### 🎨 Advanced Filtering & Sorting
- **Relevance Filtering**: Show only content above similarity thresholds
- **Multiple Sort Options**: By relevance, rating, year, or popularity
- **Visual Indicators**: Color-coded relevance scores and badges

### 💾 Intelligent Caching
- **Advanced Cache Management**: Uses the existing advanced cache service
- **Smart Invalidation**: Automatic cache refresh and cleanup
- **Performance Optimization**: Reduces API calls and improves response times

## Architecture

### Core Components

1. **EnhancedSimilarContentService** - Main service class
2. **EnhancedSimilarContent** - React component for UI
3. **similarContentUtils** - Utility functions for easy access

### Similarity Calculation

The service calculates similarity scores using weighted factors:

```javascript
const relevanceWeights = {
  genre: 0.35,      // 35% weight for genre similarity
  cast: 0.25,       // 25% weight for cast overlap
  crew: 0.15,       // 15% weight for crew similarity
  year: 0.10,       // 10% weight for year proximity
  rating: 0.10,     // 10% weight for rating similarity
  popularity: 0.05  // 5% weight for popularity similarity
};
```

## Usage

### Basic Usage

```javascript
import { similarContentUtils } from './enhancedSimilarContentService';

// Get enhanced similar content
const similarContent = await similarContentUtils.getSimilarContent(
  movieId, 
  'movie', 
  { limit: 12, minScore: 0.3 }
);
```

### React Component Usage

```jsx
import EnhancedSimilarContent from './EnhancedSimilarContent';

<EnhancedSimilarContent
  contentId={movie.id}
  contentType="movie"
  onItemClick={handleMovieClick}
  maxItems={12}
  showFilters={true}
  showTitle={true}
/>
```

### Advanced Features

#### Mood-based Recommendations

```javascript
// Get recommendations by mood/tone
const darkMovies = await similarContentUtils.getMoodBasedRecommendations(
  'dark', 
  'movie', 
  { limit: 10 }
);
```

Available moods:
- `uplifting` - Comedy, Family
- `dark` - Horror, Thriller
- `romantic` - Romance
- `adventurous` - Adventure, Action
- `thoughtful` - Drama, Mystery
- `funny` - Comedy
- `scary` - Horror
- `action` - Action
- `drama` - Drama

#### Characteristic-based Recommendations

```javascript
// Get recommendations by specific characteristics
const actionMovies = await similarContentUtils.getCharacteristicBasedRecommendations(
  {
    genres: [28, 12], // Action, Adventure
    minRating: 7.0,
    maxYear: 2024,
    minYear: 2010
  },
  'movie',
  { limit: 10 }
);
```

#### Trending Similar Content

```javascript
// Get trending content with similarity scoring
const trendingSimilar = await similarContentUtils.getTrendingSimilar(
  movieId,
  'movie',
  { timeWindow: 'week', limit: 10 }
);
```

## API Reference

### EnhancedSimilarContentService Methods

#### `getEnhancedSimilarContent(contentId, contentType, options)`

Fetches enhanced similar content with intelligent filtering.

**Parameters:**
- `contentId` (number): The ID of the content
- `contentType` (string): 'movie' or 'tv'
- `options` (object):
  - `limit` (number): Maximum number of results (default: 20)
  - `minScore` (number): Minimum similarity score (default: 0.3)
  - `includeDetails` (boolean): Include detailed information (default: true)
  - `forceRefresh` (boolean): Force cache refresh (default: false)

**Returns:** Array of similar content items with similarity scores

#### `getMoodBasedRecommendations(mood, contentType, options)`

Fetches recommendations based on mood/tone.

**Parameters:**
- `mood` (string): The mood category
- `contentType` (string): 'movie' or 'tv'
- `options` (object):
  - `limit` (number): Maximum number of results
  - `genres` (array): Additional genre filters

#### `getCharacteristicBasedRecommendations(characteristics, contentType, options)`

Fetches recommendations based on specific characteristics.

**Parameters:**
- `characteristics` (object):
  - `genres` (array): Genre IDs
  - `cast` (array): Cast member IDs
  - `crew` (array): Crew member IDs
  - `minRating` (number): Minimum rating
  - `maxYear` (number): Maximum year
  - `minYear` (number): Minimum year
- `contentType` (string): 'movie' or 'tv'
- `options` (object):
  - `limit` (number): Maximum number of results

### React Component Props

#### EnhancedSimilarContent

**Props:**
- `contentId` (number): The ID of the content
- `contentType` (string): 'movie' or 'tv'
- `onItemClick` (function): Callback when item is clicked
- `isMobile` (boolean): Mobile device flag
- `maxItems` (number): Maximum items to display
- `showFilters` (boolean): Show filtering options
- `showTitle` (boolean): Show section title
- `className` (string): Additional CSS classes

## Performance Features

### Caching Strategy
- **Intelligent Cache Keys**: Namespace-based cache keys
- **TTL Management**: 30-minute cache duration for similar content
- **Priority Caching**: High priority for frequently accessed content
- **Memory Management**: Automatic cleanup of old cache entries

### Optimization Techniques
- **Parallel API Calls**: Multiple recommendation sources fetched simultaneously
- **Deduplication**: Removes duplicate content from multiple sources
- **Lazy Loading**: Progressive loading of content details
- **Smart Filtering**: Client-side filtering for better performance

## Configuration

### Customizing Weights

```javascript
// Modify relevance weights in the service
const customWeights = {
  genre: 0.40,      // Increase genre importance
  cast: 0.20,       // Decrease cast importance
  crew: 0.20,       // Increase crew importance
  year: 0.10,       // Keep year importance
  rating: 0.05,     // Decrease rating importance
  popularity: 0.05  // Keep popularity importance
};
```

### Cache Configuration

```javascript
// Configure cache settings
const cacheOptions = {
  ttl: 30 * 60 * 1000,    // 30 minutes
  priority: 'high',         // High priority
  namespace: 'similar_content'
};
```

## Error Handling

The service includes comprehensive error handling:

- **API Failures**: Graceful fallback to basic recommendations
- **Network Issues**: Retry logic with exponential backoff
- **Invalid Data**: Data validation and sanitization
- **Cache Errors**: Fallback to direct API calls

## Testing

Use the test file to verify functionality:

```javascript
import { testEnhancedSimilarContent } from './testEnhancedSimilarContent';

// Run tests in browser console
await testEnhancedSimilarContent();
```

## Future Enhancements

### Planned Features
- **User Behavior Integration**: Learn from user interactions
- **Collaborative Filtering**: User-based recommendations
- **Content Clustering**: Group similar content automatically
- **Real-time Updates**: Live recommendation updates
- **A/B Testing**: Test different recommendation algorithms

### Performance Improvements
- **Web Workers**: Background processing for heavy calculations
- **Service Workers**: Offline recommendation caching
- **GraphQL**: More efficient data fetching
- **Machine Learning**: Predictive recommendation models

## Troubleshooting

### Common Issues

1. **No Similar Content Found**
   - Check if content has sufficient metadata
   - Verify API key and permissions
   - Try lowering the minimum similarity score

2. **Slow Performance**
   - Check cache hit rates
   - Reduce the number of parallel API calls
   - Implement request debouncing

3. **Inaccurate Recommendations**
   - Adjust relevance weights
   - Increase minimum similarity score
   - Add more recommendation sources

### Debug Mode

Enable debug logging:

```javascript
// In development
if (process.env.NODE_ENV === 'development') {
  console.log('Similar content debug:', {
    contentId,
    contentType,
    options,
    results
  });
}
```

## Contributing

When contributing to the enhanced similar content service:

1. **Follow the existing architecture patterns**
2. **Add comprehensive error handling**
3. **Include performance considerations**
4. **Update tests for new features**
5. **Document new API methods**

## License

This enhanced similar content service is part of the Streamr project and follows the same licensing terms. 