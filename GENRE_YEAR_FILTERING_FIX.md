# Genre and Year Filtering Fix

## Issue Description
The genre and year filtering was not working correctly when users changed the selected category in MoviesPage. When a user:
1. Selected a genre filter (e.g., "Action")
2. Selected a year filter (e.g., "2023") 
3. Changed the category (e.g., from "Popular" to "Top Rated")

The filtering would break because the system ignored the active filters and only applied the new category.

## Root Cause
The `handleCategoryChange` function in `MoviesPage.jsx` was calling `fetchMovies(category, 1)` without considering existing genre and year filters. While the `fetchMovies` function had the logic to handle filters, it wasn't applying the category-specific sorting and date constraints when filters were active.

## Solution
Modified the `fetchMovies` function to properly combine category-based filtering with user-selected genre and year filters:

### Key Changes:
1. **Category-Aware Filtering**: When genre or year filters are active, the system now applies category-specific sorting and date constraints:
   - **Popular**: Sorts by popularity (`popularity.desc`)
   - **Top Rated**: Sorts by vote average (`vote_average.desc`) with higher vote count threshold (50)
   - **Upcoming**: Sorts by release date (`release_date.asc`) with future date constraints
   - **Now Playing**: Sorts by popularity (`popularity.desc`) with current release date constraints (last 30 days)

2. **Smart Date Handling**: User-selected year filters override category-specific date constraints to prevent conflicts.

3. **Enhanced Logging**: Added category information to console logs for better debugging.

4. **Updated discoverMovies Function**: Added support for `primary_release_date_gte` and `primary_release_date_lte` parameters to handle date-based filtering.

## How to Test

### Manual Testing Steps:
1. **Open MoviesPage** in the application
2. **Select a genre filter** (e.g., "Action")
3. **Select a year filter** (e.g., "2023")
4. **Change category** from "Popular" to "Top Rated"
5. **Verify**: The movies shown should be Action movies from 2023, sorted by rating
6. **Change category** to "Upcoming"
7. **Verify**: Should show Action movies from 2023 that are upcoming (if any exist)

### Expected Behavior:
- ✅ Genre and year filters persist when changing categories
- ✅ Movies are sorted according to the selected category
- ✅ Category-specific date constraints apply when no year filter is selected
- ✅ User-selected year filter overrides category date constraints
- ✅ Console logs show filtering parameters for debugging

### Browser Console Verification:
Open browser console and look for logs like:
```
🎬 Fetching filtered movies: {category: "top_rated", selectedYear: 2023, selectedGenre: {id: 28, name: "Action"}}
🔍 Discover params: {page: 1, vote_count_gte: 50, include_adult: false, sort_by: "vote_average.desc", primary_release_year: 2023, with_genres: 28}
✅ Filtered results: {count: 20, totalPages: 5, category: "top_rated"}
```

## Files Modified:
- `frontend/src/components/MoviesPage.jsx`
  - Enhanced `fetchMovies` function to respect category when filters are active
  - Updated `loadMoreMovies` function to use the same category-aware logic
  - Updated `handleCategoryChange` function comments for clarity
- `frontend/src/services/tmdbService.js`
  - Added support for `primary_release_date_gte` and `primary_release_date_lte` parameters in `discoverMovies` function

## Technical Details:
- Uses TMDB's `discoverMovies` API with combined parameters
- Maintains backward compatibility with existing filtering
- Applies appropriate sorting and constraints for each category
- Handles edge cases like year filter overriding category date constraints
- Enhanced error handling and logging for better debugging

## Category-Specific Sorting:
- **Popular**: `sort_by: 'popularity.desc'` - Shows most popular movies
- **Top Rated**: `sort_by: 'vote_average.desc'` with `vote_count_gte: 50` - Shows highest rated movies with sufficient votes
- **Upcoming**: `sort_by: 'release_date.asc'` with future date constraints - Shows upcoming movies sorted by release date
- **Now Playing**: `sort_by: 'popularity.desc'` with current date constraints - Shows currently playing movies

## Date Handling:
- When no year filter is selected:
  - **Upcoming**: Only shows movies with release dates from today onwards
  - **Now Playing**: Only shows movies released in the last 30 days
- When year filter is selected: Overrides category-specific date constraints to respect user selection