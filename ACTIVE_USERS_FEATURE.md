# Active Users Feature

## Overview
The Active Users feature displays the number of users currently using the website in real-time, whether they are logged in or not. This provides a sense of community and activity on the platform.

## Features

### 🎯 **Real-time Updates**
- Live count updates via WebSocket connections
- Updates every time a user connects or disconnects
- Fallback polling every 60 seconds for reliability

### 🎨 **Minimalist & Modern Design**
- Clean, rounded pill design with subtle animations
- Green pulse indicator showing live status
- Hover effects with tooltip information
- Responsive design for both desktop and mobile

### 📱 **Responsive Display**
- **Desktop**: Shows in the top-right navbar next to user profile
- **Mobile**: Shows in the mobile navigation bar between search and profile
- Automatically hides on smaller screens to save space

### 🔧 **Technical Implementation**

#### Frontend Components
- `ActiveUsers.jsx` - Main component with real-time updates
- Integrated into `Navbar.jsx` for global visibility
- Uses Framer Motion for smooth animations

#### Backend Services
- Global WebSocket tracking for all connections
- Anonymous user support (no login required)
- Dedicated `/api/active-users` endpoint
- Real-time broadcasting of user count changes

#### Socket Integration
- Connects to global namespace (`/`) for active user tracking
- Supports both authenticated and anonymous users
- Automatic cleanup on disconnect

## Usage

### For Users
The active users count is automatically displayed in the navigation bar:
- **Desktop**: Top-right corner of the navbar
- **Mobile**: Between search icon and profile button

### For Developers

#### Adding to Other Components
```jsx
import ActiveUsers from './components/ActiveUsers';

// Use in any component
<ActiveUsers className="custom-styles" />
```

#### Backend API
```bash
GET /api/active-users
```
Returns:
```json
{
  "count": 42,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Socket Events
- `activeUsers:update` - Emitted when user count changes
- Payload: `{ count: number }`

## Configuration

### Environment Variables
No additional environment variables required. Uses existing socket and API configurations.

### Customization
The component accepts a `className` prop for custom styling:
```jsx
<ActiveUsers className="my-custom-styles" />
```

## Performance Considerations

### Frontend
- Lazy loading with fallback values
- Efficient re-rendering with React optimizations
- Minimal bundle size impact (~2KB gzipped)

### Backend
- Efficient Set-based user tracking
- Automatic cleanup on disconnect
- Minimal memory footprint

## Browser Support
- Modern browsers with WebSocket support
- Graceful fallback for older browsers
- Progressive enhancement approach

## Future Enhancements
- [ ] Geographic distribution of active users
- [ ] Peak usage time analytics
- [ ] User activity patterns
- [ ] Integration with community features

## Troubleshooting

### Common Issues
1. **Count not updating**: Check WebSocket connection status
2. **Component not showing**: Verify API endpoint accessibility
3. **Mobile display issues**: Check responsive breakpoints

### Debug Mode
Enable console logging for debugging:
```javascript
// In browser console
localStorage.setItem('debugActiveUsers', 'true');
```

## Contributing
When modifying the active users feature:
1. Test both authenticated and anonymous scenarios
2. Verify mobile responsiveness
3. Check WebSocket connection handling
4. Update this documentation 