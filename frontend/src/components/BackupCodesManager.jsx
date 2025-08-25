import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  KeyIcon, 
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { userAPI } from '../services/api';

const BackupCodesManager = ({ onClose }) => {
  const [backupCodes, setBackupCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [showCodes, setShowCodes] = useState(false);

  useEffect(() => {
    fetchBackupCodes();
  }, []);

  const fetchBackupCodes = async () => {
    try {
      setIsLoading(true);
      const response = await userAPI.getBackupCodes();
      setBackupCodes(response.data.backupCodes || []);
    } catch (error) {
      console.error('Failed to fetch backup codes:', error);
      toast.error('Failed to load backup codes');
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateBackupCodes = async () => {
    if (!window.confirm('This will invalidate all existing backup codes. Are you sure you want to continue?')) {
      return;
    }

    try {
      setIsRegenerating(true);
      const response = await userAPI.regenerateBackupCodes();
      setBackupCodes(response.data.backupCodes || []);
      setShowCodes(true);
      toast.success('Backup codes regenerated successfully');
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error);
      toast.error('Failed to regenerate backup codes');
    } finally {
      setIsRegenerating(false);
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

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1d21] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <KeyIcon className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Backup Codes Management</h3>
            <p className="text-white/60 text-sm">
              Manage your backup codes for two-factor authentication
            </p>
          </div>

          <div className="bg-yellow-500/10 rounded-2xl p-4 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold text-yellow-400">Important</span>
            </div>
            <p className="text-yellow-300/80 text-sm">
              Backup codes are your last resort for accessing your account if you lose your authenticator app. 
              Store them securely and never share them with anyone.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {backupCodes.length > 0 ? (
                <>
                  <div className="bg-[#1a1d21] rounded-full p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-white">Your Backup Codes</h4>
                      <button
                        onClick={() => setShowCodes(!showCodes)}
                        className="px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-200 text-sm"
                      >
                        {showCodes ? 'Hide Codes' : 'Show Codes'}
                      </button>
                    </div>

                    {showCodes && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          {backupCodes.map((code, index) => (
                            <div
                              key={index}
                              className="bg-[#1a1d21] rounded-full px-4 py-3 font-mono text-white text-center text-sm border border-white/10"
                            >
                              {code}
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-3 pt-4">
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
                          <button
                            onClick={downloadBackupCodes}
                            className="flex-1 px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-200"
                          >
                            Download
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="bg-[#1a1d21] rounded-full p-4 border border-white/10">
                    <h4 className="font-semibold text-white mb-3">Regenerate Codes</h4>
                    <p className="text-white/60 text-sm mb-4">
                      Generate new backup codes. This will invalidate all existing codes.
                    </p>
                    <button
                      onClick={regenerateBackupCodes}
                      disabled={isRegenerating}
                      className="w-full px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isRegenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <ArrowPathIcon className="w-4 h-4" />
                          Regenerate Backup Codes
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <KeyIcon className="w-8 h-8 text-white/40" />
                  </div>
                  <p className="text-white/40 text-sm">No backup codes found</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center pt-4">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-200 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BackupCodesManager; 