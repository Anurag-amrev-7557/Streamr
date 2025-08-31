# Watch History and Wishlist Synchronization

This document describes the implementation of watch history and wishlist synchronization with user accounts in the Streamr backend.

## Overview

The system now provides comprehensive tracking of user viewing habits and content preferences, allowing users to:
- Add/remove content from their personal watchlist
- Track viewing progress for movies and TV shows
- View detailed watch history with timestamps
- Access personalized watch statistics
- Sync data across devices when logged in

## Backend Implementation

### Models

#### Content Model (`backend/src/models/Content.js`)
- Stores comprehensive metadata for movies and TV shows
- Includes TMDB ID, title, overview, ratings, genres, etc.
- Tracks watch count and wishlist count
- Provides methods for incrementing/decrementing counters
- Uses MongoDB indexes for optimal query performance

#### User Model (Enhanced)
- Already includes `watchlist` and `watchHistory` fields
- `watchlist`: Array of Content ObjectIds
- `watchHistory`: Array of objects with content reference, progress, and timestamp

### API Endpoints

#### Watchlist Management
- `POST /api/user/watchlist` - Add content to watchlist
- `DELETE /api/user/watchlist/:contentId` - Remove content from watchlist
- `GET /api/user/watchlist` - Get user's watchlist

#### Watch History Management
- `POST /api/user/watch-history` - Update watch history
- `GET /api/user/watch-history` - Get user's watch history
- `DELETE /api/user/watch-history/:contentId` - Remove item from history
- `DELETE /api/user/watch-history` - Clear entire watch history

#### Statistics
- `GET /api/user/watch-stats` - Get comprehensive watch statistics

### Data Flow

1. **Content Creation**: When content is added to watchlist or history, the system automatically creates or finds the Content document
2. **User Association**: Content references are stored in the user's watchlist and watchHistory arrays
3. **Counter Updates**: Watch and wishlist counts are automatically incremented/decremented
4. **Progress Tracking**: Viewing progress (0-100%) is stored with timestamps

## Frontend Implementation

### Services (`frontend/src/services/userService.js`)
- Provides clean API for all watch history and wishlist operations
- Handles authentication headers automatically
- Includes error handling and response processing
- Provides helper functions for data preparation

### Custom Hook (`frontend/src/hooks/useWatchData.js`)
- Manages local state for watchlist, history, and statistics
- Provides synchronized state management with backend
- Includes loading states and error handling
- Prevents memory leaks with proper cleanup

### Components
- `WatchlistManager.jsx` - Example component for watchlist operations
- Can be integrated into existing movie/show components

## Usage Examples

### Adding to Watchlist
```javascript
import { useWatchData } from '../hooks/useWatchData';

const MovieComponent = ({ movie }) => {
  const { addToWatchlist, isInWatchlist } = useWatchData();
  
  const handleAddToWatchlist = async () => {
    try {
      await addToWatchlist(movie);
      // Success - movie added to watchlist
    } catch (error) {
      // Handle error
    }
  };
  
  const inWatchlist = isInWatchlist(movie.id, movie.type);
  
  return (
    <button onClick={handleAddToWatchlist}>
      {inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
    </button>
  );
};
```

### Updating Watch History
```javascript
const { updateWatchHistory } = useWatchData();

// Update progress when user watches content
const handleProgressUpdate = async (progress) => {
  try {
    await updateWatchHistory(movie, progress);
    // Progress saved successfully
  } catch (error) {
    // Handle error
  }
};
```

### Getting Watch Statistics
```javascript
const { watchStats, loadWatchStats } = useWatchData();

useEffect(() => {
  loadWatchStats();
}, []);

// Access statistics
if (watchStats) {
  console.log('Total watched:', watchStats.totalWatched);
  console.log('Favorite genres:', watchStats.favoriteGenres);
  console.log('Average rating:', watchStats.averageRating);
}
```

## Data Structure

### Content Object
```javascript
{
  _id: ObjectId,
  tmdbId: Number,
  title: String,
  name: String,
  type: 'movie' | 'tv',
  overview: String,
  posterPath: String,
  backdropPath: String,
  releaseDate: Date,
  firstAirDate: Date,
  rating: Number,
  genres: [String],
  watchCount: Number,
  wishlistCount: Number,
  // ... additional metadata
}
```

### Watch History Item
```javascript
{
  content: ObjectId, // Reference to Content
  progress: Number,   // 0-100
  lastWatched: Date
}
```

### Watch Statistics
```javascript
{
  totalWatched: Number,
  totalWatchlist: Number,
  moviesWatched: Number,
  tvShowsWatched: Number,
  favoriteGenres: Object,
  averageRating: Number,
  watchHistoryByMonth: Object
}
```

## Authentication Requirements

All watch history and wishlist operations require user authentication:
- JWT token must be present in localStorage
- Token is automatically included in API requests
- Unauthenticated users cannot access these features

## Error Handling

- Network errors are caught and displayed to users
- Validation errors (e.g., invalid progress values) are handled gracefully
- Rate limiting is applied to prevent abuse
- Proper error messages are returned for debugging

## Performance Considerations

- MongoDB indexes optimize queries by tmdbId, type, and other common fields
- Content is only created once and reused across users
- Pagination can be added for large watchlists/histories
- Caching strategies can be implemented for frequently accessed data

## Future Enhancements

- **Episode-level tracking**: More granular progress tracking for TV shows
- **Watch time calculation**: Actual time spent watching content
- **Recommendations**: AI-powered content suggestions based on history
- **Social features**: Share watchlists with friends
- **Export/Import**: Backup and restore watch data
- **Analytics dashboard**: Detailed viewing insights and trends

## Integration Points

The system integrates with:
- **TMDB API**: Content metadata and discovery
- **User Authentication**: JWT-based user management
- **Existing UI Components**: Movie/show cards, detail pages
- **Streaming Player**: Progress tracking during playback

## Testing

Test the functionality with:
1. Authenticated user account
2. Add movies/TV shows to watchlist
3. Update watch progress
4. View watch history and statistics
5. Remove items from watchlist/history
6. Verify data persistence across sessions

## Troubleshooting

Common issues:
- **Authentication errors**: Ensure user is logged in and token is valid
- **Content not found**: Verify TMDB ID and content type are correct
- **Progress not updating**: Check that progress value is between 0-100
- **Data not syncing**: Verify backend is running and database is accessible

## Security Considerations

- All endpoints require authentication
- Rate limiting prevents abuse
- User can only access their own data
- Input validation prevents malicious data injection
- JWT tokens expire for security
