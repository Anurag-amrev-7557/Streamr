# User Analytics System

A comprehensive system for calculating and displaying user watch time, content completion, and engagement metrics across the Streamr website.

## 🎯 Overview

The User Analytics System provides real-time insights into user behavior by tracking:
- **Watch Time**: Total hours spent watching movies and TV shows
- **Content Completion**: Number of movies and episodes completed
- **User Engagement**: Watchlist size, viewing streaks, and rating patterns
- **Achievement System**: Gamified badges based on user activity

## 🏗️ Architecture

### Core Components

1. **UserAnalyticsService** (`/src/services/userAnalyticsService.js`)
   - Main service for calculating user statistics
   - Handles data processing and metric calculations
   - Provides achievement system logic

2. **useUserAnalytics Hook** (`/src/hooks/useUserAnalytics.js`)
   - React hook for accessing analytics data
   - Memoized calculations for performance
   - Real-time updates when data changes

3. **UserStatsDisplay Component** (`/src/components/UserStatsDisplay.jsx`)
   - Reusable component for displaying statistics
   - Multiple display variants (minimal, compact, detailed)
   - Customizable stat selection

4. **ProfilePage Integration** (`/src/pages/ProfilePage.jsx`)
   - Enhanced profile page with real-time statistics
   - Achievement badges display
   - Comprehensive analytics dashboard

## 📊 Metrics Calculated

### Watch Time
- **Total Hours**: Combined watch time from all content
- **Movie Hours**: Time spent watching movies (estimated 120 min average)
- **TV Hours**: Time spent watching TV episodes (estimated 45 min average)
- **Formatting**: Smart display (minutes, hours, or days)

### Content Completion
- **Movies Completed**: Movies watched to 90%+ completion
- **TV Episodes**: Episodes watched to 90%+ completion
- **Total Completed**: Combined completion count
- **In Progress**: Items currently being watched

### User Engagement
- **Watchlist Size**: Number of saved items
- **Viewing Streak**: Consecutive days with viewing activity
- **Average Rating**: Mean rating given to content
- **Favorite Genres**: Top 3 genres based on watchlist

### Achievement System
- **Century Watcher**: 100+ hours watched
- **Half-Century**: 50+ hours watched
- **Getting Started**: 10+ hours watched
- **Century Finisher**: 100+ items completed
- **Monthly Warrior**: 30+ day viewing streak
- **Weekly Warrior**: 7+ day viewing streak

## 🚀 Usage

### Basic Hook Usage

```jsx
import useUserAnalytics from '../hooks/useUserAnalytics';

const MyComponent = () => {
  const { analytics, isLoading, getQuickStats } = useUserAnalytics();
  
  if (isLoading) return <div>Loading...</div>;
  
  const quickStats = getQuickStats();
  
  return (
    <div>
      <p>Total Hours: {quickStats.totalHours}</p>
      <p>Completed: {quickStats.completedItems}</p>
      <p>Streak: {quickStats.currentStreak}</p>
    </div>
  );
};
```

### Component Usage

```jsx
import UserStatsDisplay from '../components/UserStatsDisplay';

// Minimal variant for headers
<UserStatsDisplay 
  variant="minimal" 
  statsToShow={['watchTime', 'streak']} 
/>

// Compact variant for sidebars
<UserStatsDisplay 
  variant="compact" 
  statsToShow={['completed', 'reviews', 'rating']} 
/>

// Detailed variant for dashboards
<UserStatsDisplay 
  variant="detailed" 
  statsToShow={['watchTime', 'completed', 'reviews', 'streak', 'rating']} 
/>
```

### Service Usage

```jsx
import userAnalyticsService from '../services/userAnalyticsService';

// Get comprehensive stats
const stats = userAnalyticsService.getComprehensiveStats({
  viewingProgress: userProgressData,
  watchlist: userWatchlist
});

// Calculate specific metrics
const watchTime = userAnalyticsService.calculateTotalWatchTime(viewingProgress);
const completed = userAnalyticsService.calculateContentCompleted(viewingProgress);
const reviews = userAnalyticsService.calculateReviewsWritten(watchlist, viewingProgress);

// Get achievement badges
const badges = userAnalyticsService.getAchievementBadges(stats);
```

## 🔧 Configuration

### Display Variants

- **minimal**: Inline display with icons and labels
- **compact**: Small cards with icons and values
- **detailed**: Full cards with descriptions and breakdowns

### Stat Options

Available statistics to display:
- `watchTime`: Total watch time
- `completed`: Content completion count
- `reviews`: Watchlist size
- `streak`: Viewing streak
- `rating`: Average rating

### Customization

```jsx
<UserStatsDisplay
  variant="detailed"
  statsToShow={['watchTime', 'completed']}
  showIcons={true}
  showLabels={true}
  className="my-custom-class"
/>
```

## 📈 Performance Features

### Memoization
- Analytics calculations are memoized to prevent unnecessary recalculations
- Hook dependencies are optimized for minimal re-renders
- Service methods cache results when possible

### Lazy Loading
- Statistics are calculated only when needed
- Progressive loading for large datasets
- Background processing for complex calculations

### Real-time Updates
- Automatic updates when viewing progress changes
- Live watchlist synchronization
- Instant achievement updates

## 🎨 Styling

### Color Scheme
- **Blue**: Watch time metrics
- **Green**: Completion metrics
- **Yellow**: Review/watchlist metrics
- **Orange**: Streak metrics
- **Purple**: Rating metrics

### Responsive Design
- Grid layouts adapt to screen size
- Mobile-optimized touch targets
- Consistent spacing across variants

### Dark Theme
- Optimized for dark backgrounds
- High contrast for accessibility
- Subtle gradients and borders

## 🔄 Data Flow

```
ViewingProgress Context → useUserAnalytics Hook → UserAnalyticsService → Components
Watchlist Context ↗
```

1. **Data Sources**: ViewingProgress and Watchlist contexts provide raw data
2. **Processing**: Hook processes and memoizes data
3. **Calculation**: Service calculates metrics and statistics
4. **Display**: Components render formatted statistics
5. **Updates**: Real-time updates when source data changes

## 🧪 Testing

### Demo Page
Visit `/analytics-demo` to see all features in action:
- Interactive variant selection
- Dynamic stat toggling
- Live data visualization
- Usage examples

### Development
```bash
# Run the demo page
npm run dev
# Navigate to /analytics-demo
```

## 📱 Integration Examples

### Header Stats
```jsx
// Minimal stats in navigation header
<UserStatsDisplay 
  variant="minimal" 
  statsToShow={['watchTime', 'streak']} 
  className="flex gap-4"
/>
```

### Sidebar Widget
```jsx
// Compact stats in sidebar
<UserStatsDisplay 
  variant="compact" 
  statsToShow={['completed', 'reviews']} 
  className="mb-6"
/>
```

### Dashboard
```jsx
// Full analytics dashboard
<UserStatsDisplay 
  variant="detailed" 
  statsToShow={['watchTime', 'completed', 'reviews', 'streak', 'rating']} 
  className="mb-8"
/>
```

### Movie Cards
```jsx
// Individual content statistics
const { getQuickStats } = useUserAnalytics();
const stats = getQuickStats();

<div className="movie-card-stats">
  <span>Total: {stats.totalHours}h</span>
  <span>Completed: {stats.completedItems}</span>
</div>
```

## 🚀 Future Enhancements

### Planned Features
- **Export Analytics**: PDF/CSV reports
- **Social Sharing**: Share achievements on social media
- **Advanced Metrics**: Genre preferences, time patterns
- **Goal Setting**: User-defined viewing goals
- **Comparison**: Compare with other users

### API Integration
- **Backend Storage**: Persistent analytics storage
- **Real-time Sync**: Cross-device synchronization
- **Analytics Dashboard**: Admin analytics overview
- **Machine Learning**: Personalized recommendations

## 🤝 Contributing

### Adding New Metrics
1. Add calculation method to `UserAnalyticsService`
2. Update `getComprehensiveStats` method
3. Add to `useUserAnalytics` hook
4. Update `UserStatsDisplay` component
5. Add to achievement system if applicable

### Custom Components
1. Extend `UserStatsDisplay` or create new component
2. Use `useUserAnalytics` hook for data
3. Follow established styling patterns
4. Add responsive design considerations

## 📚 API Reference

### UserAnalyticsService Methods

- `calculateTotalWatchTime(viewingProgress)`
- `calculateContentCompleted(viewingProgress)`
- `calculateReviewsWritten(watchlist, viewingProgress)`
- `calculateWatchTimeByType(viewingProgress)`
- `calculateAverageRating(watchlist)`
- `calculateFavoriteGenres(watchlist)`
- `calculateViewingStreak(viewingProgress)`
- `getComprehensiveStats(userData)`
- `getAchievementBadges(stats)`

### useUserAnalytics Hook Returns

- `analytics`: Complete analytics object
- `isLoading`: Loading state
- `getQuickStats()`: Quick statistics helper
- `getProgressStats()`: Progress statistics helper
- `getAchievements()`: Achievement badges
- `getWatchTimeBreakdown()`: Watch time details
- `getGenreInsights()`: Genre preferences

### UserStatsDisplay Props

- `variant`: Display variant ('minimal', 'compact', 'detailed')
- `showIcons`: Toggle icon display
- `showLabels`: Toggle label display
- `className`: Additional CSS classes
- `statsToShow`: Array of stats to display

## 🔍 Troubleshooting

### Common Issues

1. **Stats not updating**: Check if contexts are properly connected
2. **Performance issues**: Verify memoization is working
3. **Styling conflicts**: Check for CSS specificity issues
4. **Data inconsistencies**: Validate source data structure

### Debug Mode
```jsx
// Enable debug logging
const { analytics, isLoading } = useUserAnalytics();
console.log('Analytics Debug:', { analytics, isLoading });
```

## 📄 License

This analytics system is part of the Streamr project and follows the same licensing terms.

---

**Note**: This system is designed to work with the existing ViewingProgress and Watchlist contexts. Ensure these are properly set up before implementing the analytics system. 