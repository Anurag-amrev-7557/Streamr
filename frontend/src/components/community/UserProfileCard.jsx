import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { communityService } from '../../services/communityService';
import { formatDistanceToNow } from 'date-fns';

const UserProfileCard = ({ userId, username, avatar, profilePicture, isCompact = false }) => {
  const { user: currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId && !userProfile) {
      loadUserProfile();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const profile = await communityService.getUserProfile(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReputationBadge = (reputation) => {
    if (reputation >= 10000) return { name: 'Legendary', color: 'text-purple-400', bg: 'bg-purple-500/20' };
    if (reputation >= 5000) return { name: 'Expert', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (reputation >= 2000) return { name: 'Veteran', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (reputation >= 500) return { name: 'Regular', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (reputation >= 100) return { name: 'Member', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    return { name: 'Newcomer', color: 'text-white/60', bg: 'bg-white/10' };
  };

  const getActivityBadge = (activity) => {
    if (activity >= 50) return { name: 'Very Active', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (activity >= 20) return { name: 'Active', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (activity >= 10) return { name: 'Regular', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { name: 'Occasional', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  };

  const getQualityBadge = (quality) => {
    if (quality >= 90) return { name: 'High Quality', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (quality >= 70) return { name: 'Good Quality', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (quality >= 50) return { name: 'Decent', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { name: 'Learning', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  };

  if (isCompact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
        <div className="relative">
          <img
            src={profilePicture || avatar || '/default-avatar.png'}
            alt={username}
            className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
            onError={(e) => {
              e.target.src = '/default-avatar.png';
            }}
          />
          {userProfile?.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0f1114]"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{username}</span>
            {userProfile?.reputation && (
              <span className={`px-2 py-1 text-xs rounded-full ${getReputationBadge(userProfile.reputation).bg} ${getReputationBadge(userProfile.reputation).color}`}>
                {getReputationBadge(userProfile.reputation).name}
              </span>
            )}
          </div>
          {userProfile?.lastSeen && (
            <p className="text-xs text-white/60">
              Last seen {formatDistanceToNow(new Date(userProfile.lastSeen), { addSuffix: true })}
            </p>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-white/60 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <div className="flex items-start gap-4">
        {/* Avatar Section */}
        <div className="relative">
          <img
            src={profilePicture || avatar || '/default-avatar.png'}
            alt={username}
            className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
            onError={(e) => {
              e.target.src = '/default-avatar.png';
            }}
          />
          {userProfile?.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-[#0f1114]"></div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white truncate">{username}</h3>
            {userProfile?.reputation && (
              <span className={`px-2 py-1 text-xs rounded-full ${getReputationBadge(userProfile.reputation).bg} ${getReputationBadge(userProfile.reputation).color}`}>
                {getReputationBadge(userProfile.reputation).name}
              </span>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {userProfile?.activity && (
              <span className={`px-2 py-1 text-xs rounded-full ${getActivityBadge(userProfile.activity).bg} ${getActivityBadge(userProfile.activity).color}`}>
                {getActivityBadge(userProfile.activity).name}
              </span>
            )}
            {userProfile?.quality && (
              <span className={`px-2 py-1 text-xs rounded-full ${getQualityBadge(userProfile.quality).bg} ${getQualityBadge(userProfile.quality).color}`}>
                {getQualityBadge(userProfile.quality).name}
              </span>
            )}
            {userProfile?.isModerator && (
              <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                Moderator
              </span>
            )}
            {userProfile?.isVerified && (
              <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
                Verified
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{userProfile?.reputation || 0}</p>
              <p className="text-xs text-white/60">Reputation</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{userProfile?.discussions || 0}</p>
              <p className="text-xs text-white/60">Discussions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{userProfile?.replies || 0}</p>
              <p className="text-xs text-white/60">Replies</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {currentUser && currentUser.id !== userId && (
            <>
              <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded transition-colors">
                Follow
              </button>
              <button className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/80 text-sm rounded transition-colors">
                Message
              </button>
            </>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
              </div>
            ) : userProfile ? (
              <div className="space-y-4">
                {/* Recent Activity */}
                <div>
                  <h4 className="text-sm font-medium text-white/80 mb-2">Recent Activity</h4>
                  <div className="space-y-2">
                    {userProfile.recentActivity?.slice(0, 3).map((activity, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="text-white/60">{activity.type}</span>
                        <span className="text-white">{activity.description}</span>
                        <span className="text-white/40 text-xs">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Categories */}
                <div>
                  <h4 className="text-sm font-medium text-white/80 mb-2">Top Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.topCategories?.map((category, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded"
                      >
                        {category.name} ({category.count})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Member Since */}
                {userProfile.memberSince && (
                  <div className="text-sm text-white/60">
                    Member since {new Date(userProfile.memberSince).toLocaleDateString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-white/60">
                Failed to load profile details
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfileCard; 