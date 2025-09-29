import React, { useState } from 'react';
import TwoFactorSetup from '../components/TwoFactorSetup';
import TwoFactorDisable from '../components/TwoFactorDisable';
import BackupCodesManager from '../components/BackupCodesManager';

const TwoFactorTestPage = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleSetupComplete = () => {
    setShowSetup(false);
    setTwoFactorEnabled(true);
  };

  const handleDisable = () => {
    setShowDisable(false);
    setTwoFactorEnabled(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Two-Factor Authentication Test</h1>
          <p className="text-white/60 text-lg">
            Test all 2FA components and functionality
          </p>
        </div>

        {/* Status Display */}
        <div className="bg-black/40 rounded-full p-6 border border-white/10">
          <h2 className="text-xl font-bold mb-4">Current Status</h2>
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${twoFactorEnabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-lg">
              2FA is currently {twoFactorEnabled ? 'enabled' : 'disabled'}
            </span>
          </div>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Setup 2FA */}
          <div className="bg-black/40 rounded-full p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Setup 2FA</h3>
            <p className="text-white/60 text-sm mb-4">
              Test the complete 2FA setup flow including QR code, verification, and backup codes.
            </p>
            <button
              onClick={() => setShowSetup(true)}
              disabled={twoFactorEnabled}
              className={`w-full px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                twoFactorEnabled
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95'
              }`}
            >
              {twoFactorEnabled ? 'Already Enabled' : 'Setup 2FA'}
            </button>
          </div>

          {/* Disable 2FA */}
          <div className="bg-black/40 rounded-full p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Disable 2FA</h3>
            <p className="text-white/60 text-sm mb-4">
              Test the 2FA disable flow with verification code and password confirmation.
            </p>
            <button
              onClick={() => setShowDisable(true)}
              disabled={!twoFactorEnabled}
              className={`w-full px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                !twoFactorEnabled
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 active:scale-95'
              }`}
            >
              {!twoFactorEnabled ? 'Not Enabled' : 'Disable 2FA'}
            </button>
          </div>

          {/* Manage Backup Codes */}
          <div className="bg-black/40 rounded-full p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Backup Codes</h3>
            <p className="text-white/60 text-sm mb-4">
              Test backup codes management including viewing, copying, and regenerating codes.
            </p>
            <button
              onClick={() => setShowBackupCodes(true)}
              disabled={!twoFactorEnabled}
              className={`w-full px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                !twoFactorEnabled
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 active:scale-95'
              }`}
            >
              {!twoFactorEnabled ? '2FA Required' : 'Manage Codes'}
            </button>
          </div>
        </div>

        {/* API Endpoints Documentation */}
        <div className="bg-black/40 rounded-full p-6 border border-white/10">
          <h2 className="text-xl font-bold mb-4">2FA API Endpoints</h2>
          <div className="space-y-3 text-sm font-mono">
            <div className="flex gap-4">
              <span className="text-green-400">POST</span>
              <span className="text-white/60">/user/2fa/setup</span>
              <span className="text-white/40">- Generate 2FA secret and QR code</span>
            </div>
            <div className="flex gap-4">
              <span className="text-green-400">POST</span>
              <span className="text-white/60">/user/2fa/verify</span>
              <span className="text-white/40">- Verify 2FA setup with code</span>
            </div>
            <div className="flex gap-4">
              <span className="text-green-400">POST</span>
              <span className="text-white/60">/user/2fa/disable</span>
              <span className="text-white/40">- Disable 2FA with verification</span>
            </div>
            <div className="flex gap-4">
              <span className="text-blue-400">GET</span>
              <span className="text-white/60">/user/2fa/backup-codes</span>
              <span className="text-white/40">- Fetch existing backup codes</span>
            </div>
            <div className="flex gap-4">
              <span className="text-green-400">POST</span>
              <span className="text-white/60">/user/2fa/backup-codes/regenerate</span>
              <span className="text-white/40">- Generate new backup codes</span>
            </div>
          </div>
        </div>

        {/* Test Scenarios */}
        <div className="bg-black/40 rounded-full p-6 border border-white/10">
          <h2 className="text-xl font-bold mb-4">Test Scenarios</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
              <div>
                <h4 className="font-medium text-white">Complete 2FA Setup</h4>
                <p className="text-white/60">Test the full setup flow: QR code → verification → backup codes → completion</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
              <div>
                <h4 className="font-medium text-white">2FA Disable Flow</h4>
                <p className="text-white/60">Test disabling 2FA with verification code and password confirmation</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
              <div>
                <h4 className="font-medium text-white">Backup Codes Management</h4>
                <p className="text-white/60">Test viewing, copying, downloading, and regenerating backup codes</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
              <div>
                <h4 className="font-medium text-white">Error Handling</h4>
                <p className="text-white/60">Test various error scenarios like invalid codes, network failures, etc.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Component Features */}
        <div className="bg-black/40 rounded-full p-6 border border-white/10">
          <h2 className="text-xl font-bold mb-4">Component Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-white mb-2">TwoFactorSetup</h4>
              <ul className="text-white/60 space-y-1">
                <li>• QR code generation and display</li>
                <li>• Manual secret entry with show/hide</li>
                <li>• Step-by-step setup flow</li>
                <li>• Code verification</li>
                <li>• Backup codes generation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">TwoFactorDisable</h4>
              <ul className="text-white/60 space-y-1">
                <li>• Verification code input</li>
                <li>• Password confirmation</li>
                <li>• Security warnings</li>
                <li>• Confirmation flow</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">BackupCodesManager</h4>
              <ul className="text-white/60 space-y-1">
                <li>• View backup codes</li>
                <li>• Copy to clipboard</li>
                <li>• Download as file</li>
                <li>• Regenerate codes</li>
                <li>• Show/hide toggle</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">General Features</h4>
              <ul className="text-white/60 space-y-1">
                <li>• Responsive design</li>
                <li>• Smooth animations</li>
                <li>• Error handling</li>
                <li>• Loading states</li>
                <li>• Toast notifications</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {showSetup && (
        <TwoFactorSetup
          onSetupComplete={handleSetupComplete}
          onCancel={() => setShowSetup(false)}
        />
      )}

      {/* 2FA Disable Modal */}
      {showDisable && (
        <TwoFactorDisable
          onDisable={handleDisable}
          onCancel={() => setShowDisable(false)}
        />
      )}

      {/* Backup Codes Manager Modal */}
      {showBackupCodes && (
        <BackupCodesManager
          onClose={() => setShowBackupCodes(false)}
        />
      )}
    </div>
  );
};

export default TwoFactorTestPage; 