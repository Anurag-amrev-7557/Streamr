import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCodeIcon, 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { userAPI } from '../services/api';

const TwoFactorSetup = ({ onSetupComplete, onCancel }) => {
  const [step, setStep] = useState('qr'); // qr, verify, backup, complete
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    generate2FASecret();
  }, []);

  const generate2FASecret = async () => {
    try {
      setIsLoading(true);
      
      const response = await userAPI.setup2FA();
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setBackupCodes(response.data.backupCodes || []);
      
      toast.success('2FA setup ready');
      
    } catch (error) {
      console.error('Failed to generate 2FA secret:', error);
      toast.error(error.message || 'Failed to setup 2FA. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsLoading(true);
      
      await userAPI.verify2FA(verificationCode);
      toast.success('2FA verification successful!');
      setStep('backup');
      
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = async () => {
    try {
      const codesText = backupCodes.join('\n');
      await navigator.clipboard.writeText(codesText);
      setCopiedCodes(true);
      toast.success('Backup codes copied to clipboard');
      
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch (error) {
      console.error('Failed to copy codes:', error);
      toast.error('Failed to copy backup codes');
    }
  };

  const completeSetup = () => {
    onSetupComplete();
  };

  const renderQRStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Setup Two-Factor Authentication</h3>
        <p className="text-white/60 text-sm">
          Scan the QR code with your authenticator app to enable 2FA
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-2xl h-12 w-12 border-2 border-white border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 sm:p-4 rounded-2xl">
              {qrCode ? (
                <img src={qrCode} alt="2FA QR Code" className="w-40 h-40 sm:w-48 sm:h-48" />
              ) : (
                <div className="w-40 h-40 sm:w-48 sm:h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                  <QrCodeIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Manual Entry */}
          <div className="bg-[#1a1d21] rounded-2xl p-3 sm:p-4 border border-white/10">
            <h4 className="font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2">
              <QrCodeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              Manual Entry
            </h4>
            <p className="text-white/60 text-xs sm:text-sm mb-2 sm:mb-3">
              If you can't scan the QR code, enter this secret manually in your authenticator app:
            </p>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex-1 bg-black/30 rounded-full px-3 sm:px-4 py-2 sm:py-3 font-mono text-white text-xs sm:text-sm">
                {showSecret ? secret : '•'.repeat(32)}
              </div>
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="p-2 sm:p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              >
                {showSecret ? (
                  <EyeSlashIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(secret);
                  toast.success('Secret copied to clipboard');
                }}
                className="p-2 sm:p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              >
                <ClipboardDocumentIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20">
            <h4 className="font-semibold text-blue-400 mb-2">How to setup:</h4>
            <ol className="text-blue-300/80 text-sm space-y-1 list-decimal list-inside">
              <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
              <li>Scan the QR code or manually enter the secret</li>
              <li>Enter the 6-digit code from your app to verify</li>
            </ol>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onCancel()}
              className="flex-1 px-6 py-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep('verify')}
              className="flex-1 px-6 py-3 bg-white text-black rounded-full hover:bg-white/90 transition-all duration-200 font-semibold"
            >
              Next: Verify Code
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderVerifyStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Verify Your Code</h3>
        <p className="text-white/60 text-sm">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-[#1a1d21] rounded-2xl p-6 border border-white/10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheckIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div className="space-y-4">
            <label className="block text-white/60 text-sm font-medium text-center">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-[#1a1d21] border border-white/10 rounded-full px-6 py-4 text-white text-center text-2xl font-mono focus:outline-none focus:border-white/30 focus:bg-[#1a1d21]/80 transition-all duration-200"
              maxLength={6}
            />
            <p className="text-white/40 text-xs text-center">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep('qr')}
            className="flex-1 px-6 py-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-200"
          >
            Back
          </button>
          <button
            onClick={verifyCode}
            disabled={isLoading || verificationCode.length !== 6}
            className="flex-1 px-6 py-3 bg-white text-black rounded-full hover:bg-white/90 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderBackupStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Backup Codes</h3>
        <p className="text-white/60 text-sm">
          Save these backup codes in a secure location. You'll need them if you lose access to your authenticator app.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-yellow-500/10 rounded-2xl p-4 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold text-yellow-400">Important</span>
          </div>
          <p className="text-yellow-300/80 text-sm">
            These codes are your backup access method. Store them securely and don't share them with anyone.
          </p>
        </div>

        <div className="bg-[#1a1d21] rounded-2xl p-6 border border-white/10">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="bg-[#1a1d21] rounded-full px-4 py-3 font-mono text-white text-center text-sm border border-white/10"
              >
                {code}
              </div>
            ))}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={copyBackupCodes}
              className="flex-1 px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {copiedCodes ? (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  Copy All Codes
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep('verify')}
            className="flex-1 px-6 py-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-200"
          >
            Back
          </button>
          <button
            onClick={completeSetup}
            className="flex-1 px-6 py-3 bg-white text-black rounded-full hover:bg-white/90 transition-all duration-200 font-semibold"
          >
            Complete Setup
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderCompleteStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto border border-green-500/30">
        <CheckIcon className="w-10 h-10 text-green-400" />
      </div>
      
      <div>
        <h3 className="text-xl font-bold text-white mb-2">2FA Setup Complete!</h3>
        <p className="text-white/60 text-sm">
          Two-factor authentication is now enabled on your account. You'll need to enter a code from your authenticator app when signing in.
        </p>
      </div>

      <button
        onClick={completeSetup}
        className="px-8 py-3 bg-white text-black rounded-full hover:bg-white/90 transition-all duration-200 font-semibold"
      >
        Done
      </button>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1d21] rounded-2xl p-4 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10"
      >
        <AnimatePresence mode="wait">
          {step === 'qr' && renderQRStep()}
          {step === 'verify' && renderVerifyStep()}
          {step === 'backup' && renderBackupStep()}
          {step === 'complete' && renderCompleteStep()}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default TwoFactorSetup; 