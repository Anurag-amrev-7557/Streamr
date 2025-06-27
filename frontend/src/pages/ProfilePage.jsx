import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWatchlist } from '../contexts/WatchlistContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');

const ProfilePage = () => {
  const { user, reloadUser } = useAuth();
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [originalProfileData, setOriginalProfileData] = useState(null);
  const fileInputRef = useRef(null);
  const [profileData, setProfileData] = useState({
    name: 'User',
    username: 'user',
    email: 'user@example.com',
    location: 'New York, USA',
    joinDate: 'January 2024',
    bio: 'Movie enthusiast and tech lover',
    avatar: null,
    plan: 'Premium',
    socialLinks: {
      twitter: '',
      instagram: '',
      letterboxd: ''
    },
    stats: {
      watchTime: '0',
      completed: '0',
      reviews: '0'
    },
    preferences: {
      language: 'en',
      quality: '1080p',
      autoplay: true,
      notifications: true,
      darkMode: true,
      genres: [],
      rating: 'all'
    }
  });

  useEffect(() => {
    if (user) {
      const userData = user;
      setProfileData(prevData => ({
        ...prevData,
        name: userData.name || userData.username || '',
        username: userData.username || '',
        email: userData.email || '',
        avatar: userData.profilePicture,
        location: userData.location || '',
        bio: userData.bio || '',
        joinDate: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
        }) : prevData.joinDate,
        preferences: {
          ...prevData.preferences,
          ...userData.preferences,
        },
        googleId: userData.googleId,
        githubId: userData.githubId,
        socialLinks: userData.socialLinks || { twitter: '', instagram: '', letterboxd: '' },
      }));
    }
  }, [user]);

  // Add watch history data
  const [watchHistory] = useState([
    {
      id: 1,
      title: 'Inception',
      type: 'movie',
      poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      year: '2010',
      watchedAt: '2024-03-15T14:30:00Z',
      progress: 100,
      rating: 5
    },
    {
      id: 2,
      title: 'Breaking Bad',
      type: 'tv',
      poster_path: '/3x1UIs1f12VULiB8VZJ1e7YEW3I.jpg',
      year: '2008-2013',
      watchedAt: '2024-03-14T20:15:00Z',
      progress: 75,
      rating: 5
    }
  ]);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [loadedImages, setLoadedImages] = useState({});
  const navigate = useNavigate();

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'watchlist', label: 'Watchlist' },
    { id: 'history', label: 'Watch History' },
    { id: 'settings', label: 'Settings' }
  ];

  const handleEdit = () => {
    setOriginalProfileData(profileData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setProfileData(originalProfileData);
    setIsEditing(false);
    setOriginalProfileData(null);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const { name, username, location, bio, socialLinks } = profileData;
      await userAPI.updateProfile({ name, username, location, bio, socialLinks });
      setIsEditing(false);
      setOriginalProfileData(null);
    } catch (error) {
      console.error('Failed to update profile', error);
      // Optionally, show an error to the user
      if (originalProfileData) {
        handleCancel();
      }
    }
  };

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialLinkChange = (platform, value) => {
    setProfileData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const handlePreferenceChange = async (field, value) => {
    const updatedPreferences = {
      ...profileData.preferences,
      [field]: value
    };

    if (field === 'genres') {
      const currentGenres = profileData.preferences.genres;
      const newGenres = currentGenres.includes(value)
        ? currentGenres.filter(g => g !== value)
        : [...currentGenres, value];
      updatedPreferences.genres = newGenres;
    }

    setProfileData(prev => ({
      ...prev,
      preferences: updatedPreferences
    }));

    try {
      await userAPI.updatePreferences({ [field]: updatedPreferences[field] });
    } catch (error) {
      console.error('Failed to update preferences', error);
      // Optionally revert state or show an error
    }
  };

  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
  };

  const handleImageLoad = (movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: true
    }));
  };

  const handleImageError = (movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: 'error'
    }));
  };

  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await userAPI.uploadProfilePicture(formData);
      if (response.success) {
        // The user object in context needs to be updated.
        // A simple way is to reload it.
        await reloadUser();
      }
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      // Handle error, e.g., show a notification
    }
  };

  const renderActivityIcon = (type) => {
    switch (type) {
      case 'watch':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        );
      case 'add':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        );
      case 'rate':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${TMDB_IMAGE_BASE_URL}/w500${path}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const renderWatchlistTab = () => (
    <div className="space-y-6">
      <div className="bg-[#1a1d21] rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">My Watchlist</h3>
          <span className="text-white/60">{watchlist.length} items</span>
        </div>
        {watchlist.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
          >
            {watchlist.map((movie) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1a1d21]"
              >
                {/* Movie Poster */}
                <div
                  className="relative w-full h-full cursor-pointer"
                  onClick={() => handleMovieSelect(movie)}
                >
                  {!loadedImages[movie.id] && (
                    <div className="absolute inset-0 bg-[#1a1d21] animate-pulse" />
                  )}
                  <img
                    src={getImageUrl(movie.poster_path)}
                    alt={movie.title}
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
                      loadedImages[movie.id] ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => handleImageLoad(movie.id)}
                    onError={() => handleImageError(movie.id)}
                  />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-medium truncate">{movie.title}</h3>
                    <p className="text-white/60 text-sm">{movie.year}</p>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFromWatchlist(movie.id)}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-white/20 mb-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            <h2 className="text-2xl font-bold mb-2">Your watchlist is empty</h2>
            <p className="text-white/60 mb-6">
              Add movies and TV shows to your watchlist to keep track of what you want to watch
            </p>
            <button
              onClick={() => navigate('/browse')}
              className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors"
            >
              Browse Movies & TV Shows
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <div className="bg-[#1a1d21] rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Watch History</h3>
          <span className="text-white/60">{watchHistory.length} items</span>
        </div>
        {watchHistory.length > 0 ? (
          <div className="space-y-4">
            {watchHistory.map((item) => (
              <div key={item.id} className="flex gap-4 bg-[#2b3036] rounded-lg p-4">
                <div className="w-24 h-36 flex-shrink-0">
                  <img
                    src={getImageUrl(item.poster_path)}
                    alt={item.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-white/60 text-sm">{item.year}</p>
                    </div>
                    <span className="text-white/60 text-sm">{formatDate(item.watchedAt)}</span>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-white/60 text-sm">{item.progress}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span className="text-white/60 text-sm">{item.rating}/5</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors">
                      Continue Watching
                    </button>
                    <button className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
                      Remove from History
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-white/60 mb-4">No watch history yet</p>
            <button
              onClick={() => navigate('/browse')}
              className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
            >
              Start Watching
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Account Settings */}
      <div className="bg-[#1a1d21] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Account Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-white/60 mb-2">Email Address</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
              className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
            />
          </div>
          <div>
            <label className="block text-white/60 mb-2">Password</label>
            <input
              type="password"
              value="********"
              className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-white/60 text-sm">Add an extra layer of security to your account</p>
            </div>
            <button className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors">
              Enable
            </button>
          </div>
        </div>
      </div>

      {/* Playback Settings */}
      <div className="bg-[#1a1d21] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Playback Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Autoplay Next Episode</h4>
              <p className="text-white/60 text-sm">Automatically play the next episode in a series</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Autoplay Previews</h4>
              <p className="text-white/60 text-sm">Show previews while browsing</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
            </label>
          </div>
          <div>
            <label className="block text-white/60 mb-2">Default Video Quality</label>
            <select className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white">
              <option value="auto">Auto</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-[#1a1d21] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Notification Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Email Notifications</h4>
              <p className="text-white/60 text-sm">Receive updates about your account</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">New Episode Alerts</h4>
              <p className="text-white/60 text-sm">Get notified when new episodes are available</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-[#1a1d21] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Privacy Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Watch History</h4>
              <p className="text-white/60 text-sm">Keep track of what you've watched</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Viewing Activity</h4>
              <p className="text-white/60 text-sm">Share your viewing activity with friends</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
            </label>
          </div>
          <button className="w-full px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
            Clear Watch History
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#1a1d21] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-red-400">Danger Zone</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-red-400">Delete Account</h4>
            <p className="text-white/60 text-sm mb-4">Permanently delete your account and all associated data</p>
            <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-[#1a1d21] rounded-xl p-6">
        <div className="flex items-start gap-6">
          <div className="relative group">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 group-hover:border-white transition-colors">
              {profileData.avatar ? (
                <img
                  src={`${SERVER_URL}${profileData.avatar}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#2b3036] text-5xl text-white/40">
                  {profileData.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              onClick={handleFileSelect}
              className="absolute bottom-0 right-0 bg-white p-2 rounded-full hover:bg-white/90 transition-colors shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
          </div>
          <div className="flex-grow">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl font-bold">{profileData.name}</h2>
              <span className="px-3 py-1 bg-white/10 text-white rounded-full text-sm">
                {profileData.plan}
              </span>
            </div>
            <p className="text-white/60 mb-6">{profileData.bio || "No bio yet"}</p>
            <div className="flex items-center gap-4">
              {profileData.googleId && (
                <span className="flex items-center gap-2 px-3 py-1 bg-[#4285F4]/10 text-[#8ab4f8] rounded-full text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 48 48" fill="currentColor">
                    <path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                    <path fill="#34A853" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8V44c5.268 0 10.046-1.953 13.611-5.657c3.566-3.704 5.657-8.895 5.657-14.426c0-1.341-.138-2.65-.389-3.917z"/>
                    <path fill="#FBBC05" d="M10.389 28.417c-1.649-4.657-1.649-9.176 0-13.833L4.732 8.926C1.953 14.774 1.953 21.226 4.732 27.074l5.657-4.657z"/>
                    <path fill="#EA4335" d="M24 36c-2.459 0-4.729-.691-6.611-1.917l-5.657 5.657C13.954 42.047 18.732 44 24 44s10.046-1.953 13.611-5.657L31.303 32c-1.649 2.657-4.08 4-6.611 4z"/>
                  </svg>
                  Logged in with Google
                </span>
              )}
              {profileData.githubId && (
                <span className="flex items-center gap-2 px-3 py-1 bg-white/10 text-white/80 rounded-full text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                  Logged in with GitHub
                </span>
              )}
              {Object.entries(profileData.socialLinks).map(([platform, url]) => (
                url && (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      {platform === 'twitter' && (
                        <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                      )}
                      {platform === 'instagram' && (
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.012-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                      )}
                      {platform === 'letterboxd' && (
                        <path d="M19.098 10.638c-3.868-1.88-8.854-1.326-11.317 1.294-2.977 3.145-2.762 8.788.588 11.537 3.346 2.75 8.893 2.555 11.317-1.294 2.424-3.85 1.168-9.082-2.588-11.537zm-3.267 5.711c-.33.44-.83.66-1.33.66-.5 0-1-.22-1.33-.66-.33-.44-.33-1.1 0-1.54.33-.44.83-.66 1.33-.66.5 0 1 .22 1.33.66.33.44.33 1.1 0 1.54z"/>
                      )}
                    </svg>
                  </a>
                )
              ))}
            </div>
            <div className="flex gap-4 mt-4">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                Share Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1a1d21] rounded-xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Watch Time</h3>
          </div>
          <p className="text-2xl font-bold mb-1">{profileData.stats.watchTime}</p>
          <p className="text-white/60 text-sm">Hours watched this month</p>
        </div>

        <div className="bg-[#1a1d21] rounded-xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Completed</h3>
          </div>
          <p className="text-2xl font-bold mb-1">{profileData.stats.completed}</p>
          <p className="text-white/60 text-sm">Movies and shows completed</p>
        </div>

        <div className="bg-[#1a1d21] rounded-xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Reviews</h3>
          </div>
          <p className="text-2xl font-bold mb-1">{profileData.stats.reviews}</p>
          <p className="text-white/60 text-sm">Reviews written</p>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-[#1a1d21] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-white/60 mb-2">Display Name</label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => handleProfileChange('name', e.target.value)}
              readOnly={!isEditing}
              className={`w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white ${!isEditing ? 'text-white/60' : ''}`}
            />
          </div>
          <div>
            <label className="block text-white/60 mb-2">Username</label>
            <input
              type="text"
              value={profileData.username}
              onChange={(e) => handleProfileChange('username', e.target.value)}
              readOnly={!isEditing}
              className={`w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white ${!isEditing ? 'text-white/60' : ''}`}
            />
          </div>
          <div>
            <label className="block text-white/60 mb-2">Location</label>
            <input
              type="text"
              value={profileData.location}
              onChange={(e) => handleProfileChange('location', e.target.value)}
              readOnly={!isEditing}
              className={`w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white ${!isEditing ? 'text-white/60' : ''}`}
            />
          </div>
          <div>
            <label className="block text-white/60 mb-2">Join Date</label>
            <input
              type="text"
              value={profileData.joinDate}
              className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white/60"
              readOnly
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-white/60 mb-2">Bio</label>
            <textarea
              value={profileData.bio}
              onChange={(e) => handleProfileChange('bio', e.target.value)}
              rows={3}
              readOnly={!isEditing}
              className={`w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white resize-none ${!isEditing ? 'text-white/60' : ''}`}
              placeholder="Tell us about yourself..."
            />
          </div>
          {isEditing && (
            <>
              <div className="md:col-span-2">
                <label className="block text-white/60 mb-2">Social Links</label>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Twitter URL"
                    value={profileData.socialLinks.twitter}
                    onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                    className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
                  />
                  <input
                    type="text"
                    placeholder="Instagram URL"
                    value={profileData.socialLinks.instagram}
                    onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                    className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
                  />
                  <input
                    type="text"
                    placeholder="Letterboxd URL"
                    value={profileData.socialLinks.letterboxd}
                    onChange={(e) => handleSocialLinkChange('letterboxd', e.target.value)}
                    className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-[#1a1d21] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Content Preferences</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-white/60 mb-2">Favorite Genres</label>
            <div className="flex flex-wrap gap-2">
              {['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Romance'].map((genre) => (
                <button
                  key={genre}
                  className={`px-3 py-1 rounded-full text-sm ${
                    profileData.preferences.genres.includes(genre)
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                  onClick={() => handlePreferenceChange('genres', genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-white/60 mb-2">Content Language</label>
            <select
              value={profileData.preferences.language}
              onChange={(e) => handlePreferenceChange('language', e.target.value)}
              className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          <div>
            <label className="block text-white/60 mb-2">Content Rating</label>
            <select
              value={profileData.preferences.rating}
              onChange={(e) => handlePreferenceChange('rating', e.target.value)}
              className="w-full bg-[#2b3036] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white"
            >
              <option value="all">All Ratings</option>
              <option value="pg">PG and below</option>
              <option value="pg13">PG-13 and below</option>
              <option value="r">R and below</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1114] text-white">
      {/* Profile Header */}
      <div className="relative h-[300px] bg-gradient-to-b from-[#1a1d21] to-[#0f1114]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1114] via-transparent to-transparent"></div>
        
        <div className="relative container mx-auto px-6 pt-20">
          <div className="flex items-end gap-6">
            <div className="relative group">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 group-hover:border-white transition-colors">
                {profileData.avatar ? (
                  <img
                    src={`${SERVER_URL}${profileData.avatar}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#2b3036] text-5xl text-white/40">
                    {profileData.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                onClick={handleFileSelect}
                className="absolute bottom-0 right-0 bg-white p-2 rounded-full hover:bg-white/90 transition-colors shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
            </div>
            <div className="pb-4">
              <h1 className="text-3xl font-bold mb-2">{profileData.name}</h1>
              <p className="text-white/60 mb-3">Member since {profileData.joinDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Stats and Activity */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-[#1a1d21] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Watch Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Total Watch Time</span>
                  <span className="font-medium">{profileData.stats.watchTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Watchlist</span>
                  <span className="font-medium">{watchlist.length} items</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Completed</span>
                  <span className="font-medium">{profileData.stats.completed} items</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">In Progress</span>
                  <span className="font-medium">{watchlist.length - profileData.stats.completed} items</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1a1d21] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Favorite Genres</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.preferences.genres.map((genre, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white/5 rounded-full text-sm text-white/80 hover:bg-white/10 transition-colors"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-[#1a1d21] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {watchlist.map((movie) => (
                  <div key={movie.id} className="flex items-start gap-3">
                    <div className="mt-1">
                      {renderActivityIcon('watch')}
                    </div>
                    <div>
                      <p className="text-white/80">{movie.title}</p>
                      <p className="text-white/40 text-sm">{formatDate(movie.watchedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Profile Form and Preferences */}
          <div className="md:col-span-2 space-y-6">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'watchlist' && renderWatchlistTab()}
            {activeTab === 'history' && renderHistoryTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;