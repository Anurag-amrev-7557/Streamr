# Undo Functionality for Streamr

This document describes the implementation of undo functionality for deleted items from the Continue Watching and Watchlist sections.

## Overview

The undo functionality allows users to restore recently deleted items within a 5-second window after deletion. This provides a better user experience by preventing accidental data loss.

## Features

- **5-second undo window** for deleted items
- **Automatic cleanup** of expired undo opportunities
- **Visual countdown** with progress bar
- **Multiple undo toasts** support for different sections
- **Graceful fallback** when undo context is not available

## Architecture

### 1. UndoContext (`frontend/src/contexts/UndoContext.jsx`)

The main context that manages deleted items and their undo timeouts.

**Key Functions:**
- `addDeletedItem(section, item, timeoutMs)` - Adds an item to the deleted items list
- `undoDelete(section, item)` - Restores a deleted item
- `getRemainingTime(section, item)` - Gets remaining time for undo
- `clearDeletedItems(section)` - Clears all deleted items for a section

**State Management:**
- `deletedItems` - Object containing arrays of deleted items for each section
- `undoTimeouts` - Map of timeout references for automatic cleanup

### 2. ViewingProgressContext Integration

Modified to support undo functionality for continue watching items.

**New Functions:**
- `restoreToContinueWatching(item)` - Restores a deleted continue watching item

**Modified Functions:**
- `removeFromContinueWatching()` - Now adds deleted items to undo context

### 3. WatchlistContext Integration

Modified to support undo functionality for watchlist items.

**New Functions:**
- `restoreToWatchlist(movie)` - Restores a deleted watchlist item

**Modified Functions:**
- `removeFromWatchlist()` - Now adds deleted items to undo context

### 4. UI Components

#### UndoToast (`frontend/src/components/UndoToast.jsx`)
Individual toast notification for each deleted item.

**Features:**
- Countdown timer with visual progress bar
- Undo and dismiss buttons
- Responsive design for mobile and desktop
- Smooth animations using Framer Motion

#### UndoManager (`frontend/src/components/UndoManager.jsx`)
Manages multiple undo toasts and handles restoration logic.

**Features:**
- Staggered toast animations
- Automatic positioning and spacing
- Integration with restoration functions

## Usage

### For Users

1. **Delete an item** from Continue Watching or Watchlist
2. **Undo toast appears** at the bottom of the screen
3. **Click "Undo"** within 5 seconds to restore the item
4. **Click "Dismiss"** or wait for timeout to permanently delete

### For Developers

#### Adding Undo to New Sections

1. **Import the safe hook:**
```javascript
import { useUndoSafe } from './contexts/UndoContext';
```

2. **Get the undo context:**
```javascript
const undoContext = useUndoSafe();
```

3. **Add deleted items:**
```javascript
if (undoContext) {
  undoContext.addDeletedItem('sectionName', itemToDelete);
}
```

4. **Implement restoration:**
```javascript
const restoreItem = (item) => {
  // Your restoration logic here
};
```

#### Customizing Undo Timeout

```javascript
// Default is 5000ms (5 seconds)
undoContext.addDeletedItem('section', item, 10000); // 10 seconds
```

## Configuration

### Undo Timeout
- **Default**: 5 seconds
- **Configurable**: Per item basis
- **Maximum**: No hard limit (but recommended to keep under 30 seconds)

### Toast Positioning
- **Location**: Bottom center of screen
- **Z-index**: 50 (above most content)
- **Spacing**: 12px between multiple toasts

## Testing

Visit `/test-undo` to test the undo functionality:

1. **Add test items** to Continue Watching and Watchlist
2. **Remove items** to trigger undo toasts
3. **Test undo functionality** within the time limit
4. **Verify restoration** works correctly

## Error Handling

- **Graceful fallback** when undo context is unavailable
- **Safe hooks** prevent crashes during initialization
- **Automatic cleanup** prevents memory leaks
- **Timeout validation** ensures proper cleanup

## Performance Considerations

- **Lazy loading** of undo components
- **Debounced updates** for countdown timers
- **Efficient state management** with useCallback
- **Automatic cleanup** of expired items

## Browser Compatibility

- **Modern browsers** with ES6+ support
- **Mobile responsive** design
- **Touch-friendly** interactions
- **Progressive enhancement** approach

## Future Enhancements

- **Custom undo timeouts** per user preference
- **Undo history** for longer-term recovery
- **Bulk undo** operations
- **Undo analytics** and user behavior tracking
- **Keyboard shortcuts** for undo operations

## Troubleshooting

### Common Issues

1. **Undo toasts not appearing**
   - Check if UndoProvider is properly wrapped
   - Verify context integration in your component

2. **Items not restoring**
   - Ensure restoration functions are implemented
   - Check console for error messages

3. **Memory leaks**
   - Verify cleanup functions are called
   - Check timeout management

### Debug Mode

Enable debug logging by checking the browser console for:
- Undo context initialization
- Item deletion and restoration
- Timeout management
- Error messages

## Contributing

When adding new features to the undo system:

1. **Follow the existing patterns** for consistency
2. **Add proper error handling** for edge cases
3. **Include tests** for new functionality
4. **Update documentation** for any API changes
5. **Consider performance implications** of changes

## License

This undo functionality is part of the Streamr project and follows the same licensing terms. 