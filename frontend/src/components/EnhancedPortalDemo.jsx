import React, { useState, useCallback } from 'react';
import { usePortal } from '../hooks/usePortal';
import { PortalTemplates } from './portal/PortalTemplates';
import portalManagerService from '../services/portalManagerService';
import portalThemingService from '../services/portalThemingService';

/**
 * Enhanced Portal Demo Component
 * 
 * Demonstrates the usage of all new enhanced portal services and templates.
 * Features:
 * - Multiple portal templates
 * - Enhanced analytics and state persistence
 * - Theme switching
 * - Animation coordination
 * - Accessibility features
 */

const EnhancedPortalDemo = () => {
  const [activeModals, setActiveModals] = useState({});
  const [currentTheme, setCurrentTheme] = useState('default');
  const [analytics, setAnalytics] = useState(null);

  // Initialize analytics
  React.useEffect(() => {
    if (portalManagerService.analyticsService) {
      setAnalytics(portalManagerService.analyticsService);
    }
  }, []);

  // Modal portal with enhanced features
  const {
    createPortal: createModalPortal,
    isReady: modalReady,
    trackInteraction: trackModalInteraction,
    savePortalState: saveModalState,
    coordinateAnimation: coordinateModalAnimation
  } = usePortal('demo-modal', {
    priority: 'high',
    group: 'demo-portals',
    animationType: 'modal',
    analytics: true,
    statePersistence: true,
    theme: 'demo-modal'
  });

  // Toast portal
  const {
    createPortal: createToastPortal,
    isReady: toastReady,
    trackInteraction: trackToastInteraction
  } = usePortal('demo-toast', {
    priority: 'normal',
    group: 'demo-portals',
    animationType: 'toast',
    analytics: true
  });

  // Sidebar portal
  const {
    createPortal: createSidebarPortal,
    isReady: sidebarReady,
    trackInteraction: trackSidebarInteraction
  } = usePortal('demo-sidebar', {
    priority: 'normal',
    group: 'demo-portals',
    animationType: 'slide',
    analytics: true
  });

  // Drawer portal
  const {
    createPortal: createDrawerPortal,
    isReady: drawerReady,
    trackInteraction: trackDrawerInteraction
  } = usePortal('demo-drawer', {
    priority: 'normal',
    group: 'demo-portals',
    animationType: 'slide',
    analytics: true
  });

  // Popover portal
  const {
    createPortal: createPopoverPortal,
    isReady: popoverReady,
    trackInteraction: trackPopoverInteraction
  } = usePortal('demo-popover', {
    priority: 'low',
    group: 'demo-portals',
    animationType: 'scale',
    analytics: true
  });

  // Toggle modal
  const toggleModal = useCallback(() => {
    const isOpen = activeModals.modal;
    setActiveModals(prev => ({ ...prev, modal: !isOpen }));
    
    if (!isOpen) {
      trackModalInteraction('modal_opened', { source: 'demo_button' });
      coordinateModalAnimation('modal');
    } else {
      trackModalInteraction('modal_closed', { source: 'demo_button' });
    }
  }, [activeModals.modal, trackModalInteraction, coordinateModalAnimation]);

  // Toggle toast
  const toggleToast = useCallback(() => {
    const isOpen = activeModals.toast;
    setActiveModals(prev => ({ ...prev, toast: !isOpen }));
    
    if (!isOpen) {
      trackToastInteraction('toast_shown', { message: 'Demo toast message' });
    }
  }, [activeModals.toast, trackToastInteraction]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    const isOpen = activeModals.sidebar;
    setActiveModals(prev => ({ ...prev, sidebar: !isOpen }));
    
    if (!isOpen) {
      trackSidebarInteraction('sidebar_opened', { position: 'right' });
    }
  }, [activeModals.sidebar, trackSidebarInteraction]);

  // Toggle drawer
  const toggleDrawer = useCallback(() => {
    const isOpen = activeModals.drawer;
    setActiveModals(prev => ({ ...prev, drawer: !isOpen }));
    
    if (!isOpen) {
      trackDrawerInteraction('drawer_opened', { position: 'bottom' });
    }
  }, [activeModals.drawer, trackDrawerInteraction]);

  // Toggle popover
  const togglePopover = useCallback(() => {
    const isOpen = activeModals.popover;
    setActiveModals(prev => ({ ...prev, popover: !isOpen }));
    
    if (!isOpen) {
      trackPopoverInteraction('popover_opened', { trigger: 'button' });
    }
  }, [activeModals.popover, trackPopoverInteraction]);

  // Theme switching
  const switchTheme = useCallback((theme) => {
    setCurrentTheme(theme);
    portalThemingService.applyTheme(theme);
    
    if (analytics) {
      analytics.trackEvent('theme_changed', { theme });
    }
  }, [analytics]);

  // Get analytics metrics
  const getAnalyticsMetrics = useCallback(() => {
    if (analytics) {
      return analytics.getSessionMetrics();
    }
    return null;
  }, [analytics]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    return portalManagerService.getPerformanceMetrics();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Enhanced Portal Management System Demo
        </h1>

        {/* Theme Controls */}
        <div className="mb-8 p-6 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Theme Controls</h2>
          <div className="flex gap-4 flex-wrap">
            {['default', 'dark', 'light', 'high-contrast'].map(theme => (
              <button
                key={theme}
                onClick={() => switchTheme(theme)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentTheme === theme
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Portal Templates Demo */}
        <div className="mb-8 p-6 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Portal Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={toggleModal}
              className="p-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg border border-blue-500/30 text-white transition-colors"
            >
              <h3 className="font-semibold mb-2">Modal Template</h3>
              <p className="text-sm text-white/70">Standard modal with enhanced features</p>
            </button>

            <button
              onClick={toggleToast}
              className="p-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg border border-green-500/30 text-white transition-colors"
            >
              <h3 className="font-semibold mb-2">Toast Template</h3>
              <p className="text-sm text-white/70">Notification toast with animations</p>
            </button>

            <button
              onClick={toggleSidebar}
              className="p-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 text-white transition-colors"
            >
              <h3 className="font-semibold mb-2">Sidebar Template</h3>
              <p className="text-sm text-white/70">Slide-out sidebar panel</p>
            </button>

            <button
              onClick={toggleDrawer}
              className="p-4 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg border border-orange-500/30 text-white transition-colors"
            >
              <h3 className="font-semibold mb-2">Drawer Template</h3>
              <p className="text-sm text-white/70">Bottom drawer with handle</p>
            </button>

            <button
              onClick={togglePopover}
              className="p-4 bg-pink-500/20 hover:bg-pink-500/30 rounded-lg border border-pink-500/30 text-white transition-colors"
            >
              <h3 className="font-semibold mb-2">Popover Template</h3>
              <p className="text-sm text-white/70">Contextual popover overlay</p>
            </button>
          </div>
        </div>

        {/* Analytics & Performance */}
        <div className="mb-8 p-6 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Analytics & Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-2">Session Metrics</h3>
              <pre className="bg-black/20 p-3 rounded text-xs text-white/80 overflow-auto">
                {JSON.stringify(getAnalyticsMetrics(), null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Performance Metrics</h3>
              <pre className="bg-black/20 p-3 rounded text-xs text-white/80 overflow-auto">
                {JSON.stringify(getPerformanceMetrics(), null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Portal Renders */}
        {modalReady && createModalPortal(
          <PortalTemplates.Modal
            isOpen={activeModals.modal}
            onClose={() => {
              trackModalInteraction('modal_closed', { method: 'close_button' });
              setActiveModals(prev => ({ ...prev, modal: false }));
            }}
            title="Enhanced Modal Demo"
            size="large"
          >
            <div className="space-y-4">
              <p className="text-white/80">
                This modal demonstrates enhanced portal features including:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Analytics tracking</li>
                <li>State persistence</li>
                <li>Animation coordination</li>
                <li>Accessibility features</li>
                <li>Theme integration</li>
              </ul>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => trackModalInteraction('button_clicked', { button: 'demo' })}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
                >
                  Track Interaction
                </button>
                <button
                  onClick={() => saveModalState({ demoData: 'saved at ' + new Date().toISOString() })}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white transition-colors"
                >
                  Save State
                </button>
              </div>
            </div>
          </PortalTemplates.Modal>
        )}

        {toastReady && createToastPortal(
          <PortalTemplates.Toast
            isOpen={activeModals.toast}
            type="success"
            position="top-right"
            duration={3000}
          >
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>Enhanced toast notification with analytics!</span>
            </div>
          </PortalTemplates.Toast>
        )}

        {sidebarReady && createSidebarPortal(
          <PortalTemplates.Sidebar
            isOpen={activeModals.sidebar}
            onClose={() => {
              trackSidebarInteraction('sidebar_closed', { method: 'close_button' });
              setActiveModals(prev => ({ ...prev, sidebar: false }));
            }}
            position="right"
            width="md"
          >
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-semibold text-white">Enhanced Sidebar</h3>
              <p className="text-white/70">
                This sidebar demonstrates advanced portal features with analytics tracking.
              </p>
              <button
                onClick={() => trackSidebarInteraction('sidebar_action', { action: 'demo' })}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
              >
                Track Sidebar Action
              </button>
            </div>
          </PortalTemplates.Sidebar>
        )}

        {drawerReady && createDrawerPortal(
          <PortalTemplates.Drawer
            isOpen={activeModals.drawer}
            onClose={() => {
              trackDrawerInteraction('drawer_closed', { method: 'close_button' });
              setActiveModals(prev => ({ ...prev, drawer: false }));
            }}
            height="md"
          >
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-semibold text-white">Enhanced Drawer</h3>
              <p className="text-white/70">
                This drawer demonstrates bottom sheet functionality with enhanced features.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => trackDrawerInteraction('drawer_action', { action: 'demo1' })}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
                >
                  Action 1
                </button>
                <button
                  onClick={() => trackDrawerInteraction('drawer_action', { action: 'demo2' })}
                  className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white transition-colors"
                >
                  Action 2
                </button>
              </div>
            </div>
          </PortalTemplates.Drawer>
        )}

        {popoverReady && createPopoverPortal(
          <PortalTemplates.Popover
            trigger={
              <button
                onClick={togglePopover}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg text-white transition-colors"
              >
                Toggle Popover
              </button>
            }
            placement="bottom"
            offset={8}
          >
            <div className="p-4 space-y-2">
              <h4 className="font-semibold text-white">Enhanced Popover</h4>
              <p className="text-white/70 text-sm">
                This popover demonstrates contextual overlays with analytics.
              </p>
              <button
                onClick={() => trackPopoverInteraction('popover_action', { action: 'demo' })}
                className="w-full px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-white text-sm transition-colors"
              >
                Track Action
              </button>
            </div>
          </PortalTemplates.Popover>
        )}
      </div>
    </div>
  );
};

export default EnhancedPortalDemo;
