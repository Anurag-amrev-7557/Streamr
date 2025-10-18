import React, { useState } from 'react';
import { 
  DevicePhoneMobileIcon, 
  ComputerDesktopIcon,
  DeviceTabletIcon,
  XMarkIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

const PWAInstallGuide = ({ isOpen, onClose }) => {
  const [expandedSection, setExpandedSection] = useState('mobile');

  const deviceTypes = [
    {
      id: 'mobile',
      name: 'Mobile Device',
      icon: DevicePhoneMobileIcon,
      instructions: [
        {
          platform: 'iOS (Safari)',
          steps: [
            'Tap the Share button (📤) at the bottom of the browser',
            'Scroll down and tap "Add to Home Screen"',
            'Tap "Add" to confirm',
            'The app will now appear on your home screen'
          ]
        },
        {
          platform: 'Android (Chrome)',
          steps: [
            'Tap the three dots menu (⋮) in the top right',
            'Tap "Add to Home screen" or "Install app"',
            'Tap "Add" to confirm',
            'The app will now appear on your home screen'
          ]
        },
        {
          platform: 'Android (Samsung Internet)',
          steps: [
            'Tap the three dots menu (⋮) in the top right',
            'Tap "Add page to"',
            'Select "Home screen"',
            'Tap "Add" to confirm'
          ]
        }
      ]
    },
    {
      id: 'tablet',
      name: 'Tablet',
      icon: DeviceTabletIcon,
      instructions: [
        {
          platform: 'iPad (Safari)',
          steps: [
            'Tap the Share button (📤) in the top toolbar',
            'Tap "Add to Home Screen"',
            'Tap "Add" to confirm',
            'The app will now appear on your home screen'
          ]
        },
        {
          platform: 'Android Tablet (Chrome)',
          steps: [
            'Tap the three dots menu (⋮) in the top right',
            'Tap "Add to Home screen" or "Install app"',
            'Tap "Add" to confirm',
            'The app will now appear on your home screen'
          ]
        }
      ]
    },
    {
      id: 'desktop',
      name: 'Desktop Computer',
      icon: ComputerDesktopIcon,
      instructions: [
        {
          platform: 'Chrome/Edge',
          steps: [
            'Look for the install icon (⬇️) in the address bar',
            'Click the install icon',
            'Click "Install" in the popup',
            'The app will be installed and can be launched from your desktop'
          ]
        },
        {
          platform: 'Firefox',
          steps: [
            'Click the menu button (☰) in the top right',
            'Click "Install App"',
            'Click "Install" to confirm',
            'The app will be installed and can be launched from your desktop'
          ]
        },
        {
          platform: 'Safari (macOS)',
          steps: [
            'Click "File" in the menu bar',
            'Click "Add to Dock"',
            'The app will now appear in your Dock',
            'You can also drag it to your Applications folder'
          ]
        }
      ]
    }
  ];

  const benefits = [
    '📱 Access from your home screen',
    '⚡ Faster loading and offline support',
    '🔔 Push notifications for new content',
    '💾 Automatic updates in the background',
    '🎯 App-like experience',
    '🌐 Works offline with cached content'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-600 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Install Streamr App</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Benefits Section */}
          <div className="p-6 border-b border-slate-600">
            <h3 className="text-lg font-semibold text-white mb-4">Why Install Streamr?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 text-slate-300">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Installation Instructions */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Installation Instructions</h3>
            
            {deviceTypes.map((device) => (
              <div key={device.id} className="mb-6">
                <button
                  onClick={() => setExpandedSection(expandedSection === device.id ? null : device.id)}
                  className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <device.icon className="w-6 h-6 text-blue-400" />
                    <span className="text-white font-medium">{device.name}</span>
                  </div>
                  {expandedSection === device.id ? (
                    <ChevronUpIcon className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {expandedSection === device.id && (
                  <div className="mt-3 space-y-4">
                    {device.instructions.map((instruction, index) => (
                      <div key={index} className="bg-slate-800/50 rounded-lg p-4">
                        <h4 className="text-blue-400 font-medium mb-3">{instruction.platform}</h4>
                        <ol className="space-y-2">
                          {instruction.steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="flex items-start gap-3 text-slate-300">
                              <span className="w-6 h-6 bg-blue-500/20 text-blue-400 text-sm rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                {stepIndex + 1}
                              </span>
                              <span className="text-sm leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Troubleshooting */}
          <div className="p-6 border-t border-slate-600">
            <h3 className="text-lg font-semibold text-white mb-4">Troubleshooting</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-yellow-400 font-medium mb-2">Install button not showing?</h4>
                <ul className="space-y-1 ml-4">
                  <li>• Make sure you're using a supported browser</li>
                  <li>• Try refreshing the page</li>
                  <li>• Check if you're in incognito/private mode</li>
                  <li>• Ensure you've visited the site multiple times</li>
                </ul>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-green-400 font-medium mb-2">Already installed?</h4>
                <p>If Streamr is already installed, you'll see it in your app list or home screen. You can also check your browser's app management settings.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-600 bg-slate-800/50">
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-3">
              Need help? Check our support documentation or contact us.
            </p>
            <button
              onClick={onClose}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallGuide; 