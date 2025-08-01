# Enhanced SearchBar Component

A modern, professional, and feature-rich search component with advanced UX features.

## Features

### 🎨 **Modern Design**
- **Floating variant** with subtle shadows and animations
- **Dark/Light theme** support
- **Multiple sizes** (sm, md, lg)
- **Smooth animations** with Framer Motion
- **Responsive design** for all screen sizes

### 🔍 **Advanced Search Features**
- **Debounced search** to prevent excessive API calls
- **Real-time suggestions** with keyboard navigation
- **Search history** with localStorage persistence
- **Trending searches** based on user activity
- **Clear button** with smooth animations
- **Loading spinner** during search operations

### ⌨️ **Keyboard Navigation**
- **Arrow keys** to navigate suggestions
- **Enter** to select suggestion or perform search
- **Escape** to close dropdowns
- **Tab** navigation support

### 📱 **Mobile Optimized**
- **Touch-friendly** interface
- **Responsive dropdowns**
- **Smooth scrolling** on mobile
- **Optimized performance**

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | string | "Search..." | Input placeholder text |
| `onSearch` | function | - | Called when search is performed |
| `onClear` | function | - | Called when search is cleared |
| `onFocus` | function | - | Called when input is focused |
| `onBlur` | function | - | Called when input loses focus |
| `className` | string | "" | Additional CSS classes |
| `initialValue` | string | "" | Initial search value |
| `searchDelay` | number | 300 | Debounce delay in milliseconds |
| `showSuggestions` | boolean | true | Show search suggestions |
| `suggestions` | array | [] | Array of suggestion objects |
| `onSuggestionSelect` | function | - | Called when suggestion is selected |
| `isLoading` | boolean | false | Show loading spinner |
| `disabled` | boolean | false | Disable the search input |
| `variant` | string | "default" | "default", "minimal", "floating" |
| `size` | string | "md" | "sm", "md", "lg" |
| `theme` | string | "dark" | "dark", "light" |
| `showClearButton` | boolean | true | Show clear button |
| `showSearchIcon` | boolean | true | Show search icon |
| `showLoadingSpinner` | boolean | true | Show loading spinner |
| `autoFocus` | boolean | false | Auto-focus the input |
| `maxSuggestions` | number | 5 | Maximum suggestions to show |
| `searchHistory` | array | [] | Array of search history items |
| `onHistorySelect` | function | - | Called when history item is selected |
| `clearHistory` | function | - | Function to clear search history |
| `showHistory` | boolean | true | Show search history dropdown |
| `showTrendingSearches` | boolean | false | Show trending searches |
| `trendingSearches` | array | [] | Array of trending search terms |
| `onTrendingSelect` | function | - | Called when trending item is selected |

## Usage Examples

### Basic Usage
```jsx
import EnhancedSearchBar from './EnhancedSearchBar';

<EnhancedSearchBar
  placeholder="Search movies..."
  onSearch={(query) => console.log('Searching:', query)}
  onClear={() => console.log('Search cleared')}
/>
```

### Advanced Usage with History and Suggestions
```jsx
<EnhancedSearchBar
  placeholder="Search movies..."
  initialValue={searchQuery}
  onSearch={(query) => {
    setSearchQuery(query);
    searchMovies(query, 1);
    searchHistoryService.addToHistory(query, 'movie');
  }}
  onClear={() => {
    setSearchQuery('');
    setSearchResults([]);
  }}
  isLoading={isSearching}
  theme="dark"
  variant="floating"
  size="md"
  showSuggestions={true}
  suggestions={searchResults.slice(0, 5).map(movie => ({
    title: movie.title,
    name: movie.title,
    id: movie.id,
    poster_path: movie.poster_path,
    year: movie.release_date ? new Date(movie.release_date).getFullYear() : null
  }))}
  onSuggestionSelect={(suggestion) => {
    const movie = searchResults.find(m => m.id === suggestion.id);
    if (movie) {
      handleMovieClick(movie);
    }
  }}
  searchHistory={searchHistoryItems}
  showHistory={true}
  onHistorySelect={(historyItem) => {
    setSearchQuery(historyItem);
    searchMovies(historyItem, 1);
    searchHistoryService.incrementSearchCount(historyItem);
  }}
  clearHistory={() => searchHistoryService.clearHistoryByType('movie')}
  showTrendingSearches={true}
  trendingSearches={trendingSearches}
  onTrendingSelect={(trending) => {
    setSearchQuery(trending);
    searchMovies(trending, 1);
    searchHistoryService.addToHistory(trending, 'movie');
  }}
/>
```

## Search History Service

The component integrates with a search history service that provides:

### Features
- **LocalStorage persistence** with automatic cleanup
- **Type-based history** (movie, tv, general)
- **Search count tracking** for trending calculations
- **Expiry management** (30 days default)
- **Export/Import** functionality
- **Statistics** and analytics

### Usage
```jsx
import searchHistoryService from '../services/searchHistoryService';

// Add to history
searchHistoryService.addToHistory('Avengers', 'movie');

// Get history by type
const movieHistory = searchHistoryService.getHistoryByType('movie');

// Get trending searches
const trending = searchHistoryService.getTrendingSearches(5);

// Clear history
searchHistoryService.clearHistoryByType('movie');
```

## Styling

The component uses Tailwind CSS with custom animations:

### Variants
- **default**: Standard rounded input with border
- **minimal**: Clean input without border
- **floating**: Elevated input with shadow

### Themes
- **dark**: Dark background with light text
- **light**: Light background with dark text

### Sizes
- **sm**: Small input (h-9)
- **md**: Medium input (h-12)
- **lg**: Large input (h-14)

## Accessibility

- **ARIA labels** and roles
- **Keyboard navigation** support
- **Screen reader** friendly
- **Focus management**
- **High contrast** support

## Performance

- **Debounced search** to prevent excessive API calls
- **Memoized callbacks** for optimal re-renders
- **Lazy loading** of suggestions
- **Efficient state management**
- **Memory leak prevention**

## Browser Support

- **Modern browsers** (Chrome, Firefox, Safari, Edge)
- **Mobile browsers** (iOS Safari, Chrome Mobile)
- **Progressive enhancement** for older browsers

## Dependencies

- **React** 18+
- **Framer Motion** for animations
- **Lodash** for debouncing
- **Tailwind CSS** for styling

## Future Enhancements

- [ ] **Voice search** integration
- [ ] **Image search** capabilities
- [ ] **Advanced filters** (date, rating, genre)
- [ ] **Search analytics** dashboard
- [ ] **Multi-language** support
- [ ] **Search suggestions** from AI
- [ ] **Offline search** capabilities
- [ ] **Search sharing** functionality 