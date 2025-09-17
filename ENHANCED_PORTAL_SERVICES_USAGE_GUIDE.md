# Enhanced Portal Services Usage Guide

## Overview

This guide demonstrates how to use the new enhanced portal services in your React components. The enhanced system provides advanced features including analytics, state persistence, theming, accessibility, and performance optimizations.

## 🚀 Quick Start

### Basic Enhanced Portal Usage

```javascript
import { usePortal } from '../hooks/usePortal';

function MyComponent() {
  const {
    createPortal,
    isReady,
    trackInteraction,
    savePortalState,
    loadPortalState,
    coordinateAnimation,
    analytics
  } = usePortal('my-portal', {
    priority: 'high',
    group: 'my-portals',
    animationType: 'modal',
    analytics: true,
    statePersistence: true,
    theme: 'my-theme'
  });

  if (!isReady) return null;

  return createPortal(
    <div>
      <h1>Enhanced Portal</h1>
      <button onClick={() => trackInteraction('button_clicked', { button: 'demo' })}>
        Track Interaction
      </button>
    </div>
  );
}
```

## 📊 Analytics Integration

### Automatic Tracking

The enhanced portal system automatically tracks:
- Portal creation and destruction
- User interactions (clicks, key presses, focus events)
- Performance metrics
- Error events

### Manual Interaction Tracking

```javascript
const { trackInteraction } = usePortal('my-portal', { analytics: true });

// Track custom interactions
const handleButtonClick = () => {
  trackInteraction('custom_action', {
    action: 'button_click',
    data: { value: 'example' }
  });
};

// Track user behavior
const handleFormSubmit = (formData) => {
  trackInteraction('form_submitted', {
    formType: 'contact',
    fields: Object.keys(formData).length
  });
};
```

### Analytics Metrics

```javascript
// Get session metrics
const metrics = analytics.getSessionMetrics();
console.log('Portal metrics:', metrics);

// Get performance metrics
const performance = portalManagerService.getPerformanceMetrics();
console.log('Performance:', performance);
```

## 💾 State Persistence

### Automatic State Saving

```javascript
const { savePortalState, loadPortalState } = usePortal('my-portal', {
  statePersistence: true
});

// State is automatically saved on interactions
const handleStateChange = (newState) => {
  savePortalState({
    formData: newState,
    timestamp: Date.now(),
    user: currentUser
  });
};

// Load saved state on mount
useEffect(() => {
  const savedState = loadPortalState();
  if (savedState) {
    setFormData(savedState.formData);
  }
}, [loadPortalState]);
```

### State Snapshots and Rollback

```javascript
import portalStateService from '../services/portalStateService';

// Create snapshot
const snapshotId = portalStateService.createSnapshot('my-portal');

// Make changes...

// Rollback if needed
const success = portalStateService.rollbackToSnapshot('my-portal', snapshotId);
```

## 🎨 Theming System

### Theme Switching

```javascript
import portalThemingService from '../services/portalThemingService';

// Apply theme
portalThemingService.applyTheme('dark');

// Customize brand
portalThemingService.customizeBrand({
  primaryColor: '#ff6b6b',
  secondaryColor: '#4ecdc4',
  fontFamily: 'Inter, sans-serif'
});

// Set custom properties
portalThemingService.setCustomProperty('border-radius', '12px');
```

### Theme-Aware Portals

```javascript
const { createPortal } = usePortal('my-portal', {
  theme: 'custom-theme'
});

// Portal automatically applies theme styles
return createPortal(
  <div className="portal-themed-content">
    <h1>Theme-aware content</h1>
  </div>
);
```

## 🎭 Animation Coordination

### Coordinated Animations

```javascript
const { coordinateAnimation } = usePortal('my-portal', {
  animationType: 'modal'
});

// Coordinate animations on open
useEffect(() => {
  if (isOpen) {
    coordinateAnimation('modal');
  }
}, [isOpen, coordinateAnimation]);
```

### Custom Animation Presets

```javascript
import portalAnimationService from '../services/portalAnimationService';

// Queue custom animation
portalAnimationService.queueAnimation('my-portal', {
  type: 'enter',
  preset: 'scale',
  priority: 'normal'
});

// Create coordinated animations for multiple portals
const portalIds = ['modal-1', 'modal-2', 'modal-3'];
portalAnimationService.createCoordinatedAnimation(portalIds, 'modal');
```

## ♿ Accessibility Features

### Automatic Accessibility Setup

```javascript
const { createPortal } = usePortal('my-portal', {
  accessibility: true
});

// Portal automatically includes:
// - Focus management
// - ARIA attributes
// - Keyboard navigation
// - Screen reader support
```

### Manual Accessibility Control

```javascript
import portalAccessibilityService from '../services/portalAccessibilityService';

// Setup focus trap
const cleanup = portalAccessibilityService.setupFocusTrap(portalContainer);

// Announce to screen readers
portalAccessibilityService.announce('Modal opened', 'assertive');

// Validate accessibility
const validation = portalAccessibilityService.validateAccessibility(portalContainer);
console.log('Accessibility valid:', validation.isValid);
```

## 🧪 Testing with Enhanced Services

### Unit Testing

```javascript
import { portalTestingUtils } from '../utils/portalTestingUtils';

test('portal analytics tracking', () => {
  const component = render(<MyPortalComponent />);
  
  // Test interaction tracking
  const button = screen.getByTestId('track-button');
  fireEvent.click(button);
  
  // Verify analytics were called
  expect(mockAnalytics.trackUserInteraction).toHaveBeenCalledWith(
    'clicks',
    'my-portal',
    expect.any(Object)
  );
});

test('portal state persistence', () => {
  const testState = { formData: 'test' };
  
  // Test state saving
  portalTestingUtils.testStatePersistence('my-portal', testState);
  
  // Verify state was saved and loaded
  expect(mockStateService.savePortalState).toHaveBeenCalledWith('my-portal', testState);
});
```

### Integration Testing

```javascript
test('enhanced portal integration', async () => {
  await portalTestingUtils.testIntegration({
    component: <EnhancedPortalComponent />,
    expectedBehavior: [
      { type: 'open', trigger: '[data-testid="open-button"]' },
      { type: 'interact', element: '[data-testid="track-button"]' },
      { type: 'keyboard', key: 'Escape' }
    ]
  });
});
```

## 🎯 Portal Templates

### Using Pre-built Templates

```javascript
import { PortalTemplates } from '../components/portal/PortalTemplates';

const { createPortal } = usePortal('my-modal', { analytics: true });

return createPortal(
  <PortalTemplates.Modal
    title="Enhanced Modal"
    size="large"
    onClose={handleClose}
  >
    <p>Modal content with enhanced features</p>
  </PortalTemplates.Modal>
);
```

### Custom Template Usage

```javascript
// Toast notification
<PortalTemplates.Toast
  isOpen={showToast}
  type="success"
  position="top-right"
  duration={5000}
>
  <div>Success message with analytics tracking!</div>
</PortalTemplates.Toast>

// Sidebar panel
<PortalTemplates.Sidebar
  isOpen={showSidebar}
  position="right"
  width="md"
  onClose={handleClose}
>
  <div>Sidebar content</div>
</PortalTemplates.Sidebar>

// Bottom drawer
<PortalTemplates.Drawer
  isOpen={showDrawer}
  height="md"
  onClose={handleClose}
>
  <div>Drawer content</div>
</PortalTemplates.Drawer>
```

## 🔧 Advanced Configuration

### Portal Groups

```javascript
// Create portal group
const group = portalManagerService.createPortalGroup('modals', {
  analytics: true,
  coordinateAnimations: true
});

// Add portals to group
const modal1 = group.createPortal('modal-1', { priority: 'high' });
const modal2 = group.createPortal('modal-2', { priority: 'normal' });

// Coordinate group animations
group.coordinateAnimations('modal');
```

### Cross-Device Synchronization

```javascript
// Enable sync
portalManagerService.enableSync(true);

// Portals will automatically sync across devices
const { createPortal } = usePortal('sync-portal', {
  sync: true
});
```

### Performance Monitoring

```javascript
// Get comprehensive metrics
const metrics = portalManagerService.getPerformanceMetrics();
console.log('Portal performance:', metrics);

// Monitor specific portal
const portalMetrics = analytics.getPortalSummary();
console.log('Portal summary:', portalMetrics);
```

## 📱 Responsive and Mobile Features

### Device-Aware Animations

```javascript
// Animations automatically adapt to device capabilities
const { coordinateAnimation } = usePortal('my-portal', {
  animationType: 'modal' // Automatically optimized for device
});
```

### Touch and Gesture Support

```javascript
// Enhanced touch support
const { trackInteraction } = usePortal('touch-portal', {
  analytics: true
});

const handleTouch = (e) => {
  trackInteraction('touch', {
    type: e.type,
    touches: e.touches.length
  });
};
```

## 🚨 Error Handling

### Error Tracking

```javascript
import portalAnalyticsService from '../services/portalAnalyticsService';

try {
  // Portal operations
} catch (error) {
  // Automatic error tracking
  portalAnalyticsService.trackError(error, 'my-portal', {
    context: 'portal_operation',
    user: currentUser
  });
}
```

### Graceful Degradation

```javascript
const { createPortal, isReady } = usePortal('my-portal', {
  analytics: true,
  statePersistence: true
});

// Graceful fallback if services aren't available
if (!isReady) {
  return <div>Loading enhanced portal...</div>;
}

return createPortal(<MyContent />);
```

## 🔄 Migration from Basic Portals

### Step 1: Update usePortal Hook

```javascript
// Old
const { createPortal } = usePortal('my-portal');

// New
const { createPortal, trackInteraction, savePortalState } = usePortal('my-portal', {
  analytics: true,
  statePersistence: true
});
```

### Step 2: Add Interaction Tracking

```javascript
// Old
<button onClick={handleClick}>Click me</button>

// New
<button onClick={() => {
  trackInteraction('button_clicked', { button: 'demo' });
  handleClick();
}}>
  Click me
</button>
```

### Step 3: Enable State Persistence

```javascript
// Old
const [formData, setFormData] = useState({});

// New
const [formData, setFormData] = useState({});

useEffect(() => {
  const saved = loadPortalState();
  if (saved) setFormData(saved.formData);
}, [loadPortalState]);

const handleFormChange = (newData) => {
  setFormData(newData);
  savePortalState({ formData: newData });
};
```

## 📈 Best Practices

### 1. Use Appropriate Priorities

```javascript
// Critical portals (streaming players, error modals)
usePortal('critical-portal', { priority: 'critical' });

// Normal portals (modals, forms)
usePortal('normal-portal', { priority: 'normal' });

// Low priority portals (tooltips, notifications)
usePortal('low-portal', { priority: 'low' });
```

### 2. Group Related Portals

```javascript
// Group related portals for coordinated management
usePortal('modal-1', { group: 'user-modals' });
usePortal('modal-2', { group: 'user-modals' });
usePortal('modal-3', { group: 'user-modals' });
```

### 3. Optimize Analytics

```javascript
// Track meaningful interactions
trackInteraction('form_submitted', { 
  formType: 'contact',
  fields: Object.keys(formData).length 
});

// Avoid tracking every click
// ❌ Don't do this
trackInteraction('click', { element: 'div' });

// ✅ Do this instead
trackInteraction('important_action', { action: 'purchase' });
```

### 4. Use State Persistence Wisely

```javascript
// Save important state
savePortalState({
  formData: formData,
  scrollPosition: window.scrollY,
  selectedTab: activeTab
});

// Don't save everything
// ❌ Don't do this
savePortalState({ mouseX: e.clientX, mouseY: e.clientY });
```

## 🎉 Conclusion

The enhanced portal services provide a comprehensive solution for managing portals in React applications. By following this guide, you can leverage advanced features like analytics, state persistence, theming, and accessibility to create superior user experiences.

Key benefits:
- **Better User Experience**: Smooth animations, state persistence, accessibility
- **Developer Productivity**: Comprehensive testing, debugging tools, templates
- **Performance**: Device-aware optimizations, memory management
- **Analytics**: Detailed insights into user behavior and performance
- **Maintainability**: Clean architecture, extensive documentation

Start with basic features and gradually adopt more advanced capabilities as needed. The system is designed to be backward compatible, so you can migrate incrementally.
