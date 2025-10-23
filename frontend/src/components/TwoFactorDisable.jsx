import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldExclamationIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { userAPI } from '../services/api';

const TwoFactorDisable = ({ onDisable, onCancel }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');

  const handleDisable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit verification code');
      return;
    }

    if (!password) {
      toast.error('Please enter your password to confirm');
      return;
    }

    try {
      setIsLoading(true);
      await userAPI.disable2FA(verificationCode, password);
      toast.success('Two-factor authentication has been disabled');
      onDisable();
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      toast.error(error.message || 'Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1d21] rounded-2xl p-8 max-w-md w-full border border-white/10"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <ShieldExclamationIcon className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Disable 2FA</h3>
            <p className="text-white/60 text-sm">
              This will remove two-factor authentication from your account, making it less secure.
            </p>
          </div>

          <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
              <span className="font-semibold text-red-400">Security Warning</span>
            </div>
            <p className="text-red-300/80 text-sm">
              Disabling 2FA will make your account more vulnerable to unauthorized access. Only proceed if you're certain.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm font-medium mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-[#1a1d21] border border-white/10 rounded-full px-4 py-3 text-white text-center text-lg font-mono focus:outline-none focus:border-white/30 focus:bg-[#1a1d21]/80 transition-all duration-200"
                maxLength={6}
              />
              <p className="text-white/40 text-xs mt-1 text-center">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div>
              <label className="block text-white/60 text-sm font-medium mb-2">
                Password Confirmation
              </label>
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-[#1a1d21] border border-white/10 rounded-full px-4 py-3 text-white focus:outline-none focus:border-white/30 focus:bg-[#1a1d21]/80 transition-all duration-200 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-transparent rounded-full hover:bg-white/10 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5 text-white" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              <p className="text-white/40 text-xs mt-1 text-center">
                Enter your password to confirm this action
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDisable}
              disabled={isLoading || verificationCode.length !== 6 || !password}
              className="flex-1 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TwoFactorDisable; 