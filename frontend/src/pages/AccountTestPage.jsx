import React, { useState } from 'react';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

const AccountTestPage = () => {
  const [testData, setTestData] = useState({
    email: 'test@example.com',
    username: 'testuser',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    twoFA: false,
    delete: false
  });

  const handleInputChange = (field, value) => {
    setTestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testUpdateProfile = async () => {
    try {
      setLoading(prev => ({ ...prev, profile: true }));
      await userAPI.updateProfile({
        email: testData.email,
        username: testData.username
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const testChangePassword = async () => {
    try {
      setLoading(prev => ({ ...prev, password: true }));
      await userAPI.changePassword(testData.currentPassword, testData.newPassword);
      toast.success('Password changed successfully');
      setTestData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  const testToggle2FA = async (enable) => {
    try {
      setLoading(prev => ({ ...prev, twoFA: true }));
      await userAPI.toggle2FA(enable);
      toast.success(`2FA ${enable ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      toast.error(error.message || 'Failed to toggle 2FA');
    } finally {
      setLoading(prev => ({ ...prev, twoFA: false }));
    }
  };

  const testOAuthConnect = async (provider) => {
    try {
      await userAPI.connectOAuth(provider);
    } catch (error) {
      toast.error(error.message || `Failed to connect ${provider}`);
    }
  };

  const testOAuthDisconnect = async (provider) => {
    try {
      await userAPI.disconnectOAuth(provider);
      toast.success(`${provider} disconnected successfully`);
    } catch (error) {
      toast.error(error.message || `Failed to disconnect ${provider}`);
    }
  };

  const testDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to test account deletion? This is for testing only.')) {
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, delete: true }));
      await userAPI.deleteAccount();
      toast.success('Account deletion test completed');
    } catch (error) {
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Account Functionality Test</h1>
          <p className="text-white/60 text-lg">
            Test all account management features
          </p>
        </div>

        {/* Profile Update Test */}
        <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Profile Update Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white/60 mb-2">Email</label>
              <input
                type="email"
                value={testData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="block text-white/60 mb-2">Username</label>
              <input
                type="text"
                value={testData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>
          <button
            onClick={testUpdateProfile}
            disabled={loading.profile}
            className="px-6 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading.profile ? 'Updating...' : 'Test Profile Update'}
          </button>
        </div>

        {/* Password Change Test */}
        <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Password Change Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-white/60 mb-2">Current Password</label>
              <input
                type="password"
                value={testData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="block text-white/60 mb-2">New Password</label>
              <input
                type="password"
                value={testData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="block text-white/60 mb-2">Confirm Password</label>
              <input
                type="password"
                value={testData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>
          <button
            onClick={testChangePassword}
            disabled={loading.password}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading.password ? 'Changing...' : 'Test Password Change'}
          </button>
        </div>

        {/* 2FA Test */}
        <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication Test</h2>
          <div className="flex gap-4">
            <button
              onClick={() => testToggle2FA(true)}
              disabled={loading.twoFA}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {loading.twoFA ? 'Processing...' : 'Test Enable 2FA'}
            </button>
            <button
              onClick={() => testToggle2FA(false)}
              disabled={loading.twoFA}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {loading.twoFA ? 'Processing...' : 'Test Disable 2FA'}
            </button>
          </div>
        </div>

        {/* OAuth Test */}
        <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">OAuth Connection Test</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-medium mb-3">Google</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => testOAuthConnect('google')}
                  className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
                >
                  Connect Google
                </button>
                <button
                  onClick={() => testOAuthDisconnect('google')}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Disconnect Google
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">GitHub</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => testOAuthConnect('github')}
                  className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
                >
                  Connect GitHub
                </button>
                <button
                  onClick={() => testOAuthDisconnect('github')}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Disconnect GitHub
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Account Test */}
        <div className="bg-[#1a1d21] rounded-xl p-6 border border-red-500/20">
          <h2 className="text-xl font-semibold mb-4 text-red-400">Account Deletion Test</h2>
          <p className="text-white/60 mb-4">⚠️ This is for testing purposes only</p>
          <button
            onClick={testDeleteAccount}
            disabled={loading.delete}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading.delete ? 'Testing...' : 'Test Account Deletion'}
          </button>
        </div>

        {/* API Endpoints Documentation */}
        <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">API Endpoints</h2>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex gap-4">
              <span className="text-green-400">PUT</span>
              <span className="text-white/60">/user/profile</span>
              <span className="text-white/40">- Update profile information</span>
            </div>
            <div className="flex gap-4">
              <span className="text-green-400">PUT</span>
              <span className="text-white/60">/user/password</span>
              <span className="text-white/40">- Change password</span>
            </div>
            <div className="flex gap-4">
              <span className="text-blue-400">POST</span>
              <span className="text-white/60">/user/2fa</span>
              <span className="text-white/40">- Enable 2FA</span>
            </div>
            <div className="flex gap-4">
              <span className="text-red-400">DELETE</span>
              <span className="text-white/60">/user/2fa</span>
              <span className="text-white/40">- Disable 2FA</span>
            </div>
            <div className="flex gap-4">
              <span className="text-red-400">DELETE</span>
              <span className="text-white/60">/user/oauth/:provider</span>
              <span className="text-white/40">- Disconnect OAuth</span>
            </div>
            <div className="flex gap-4">
              <span className="text-red-400">DELETE</span>
              <span className="text-white/60">/user/account</span>
              <span className="text-white/40">- Delete account</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountTestPage;