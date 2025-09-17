import React, { useState, useEffect, useRef, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useWatchlist } from '../contexts/WatchlistContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  Squares2X2Icon,
  ClockIcon,
  Cog6ToothIcon,
  PlayIcon,
  PlusIcon,
  StarIcon,
  EyeIcon,
  CheckCircleIcon,
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon,
  EnvelopeIcon,
  KeyIcon,
  ShieldCheckIcon,
  LinkIcon,
  TrashIcon,
  BellAlertIcon,
  PlayCircleIcon,
  GlobeAltIcon,
  EyeSlashIcon,
  FireIcon,
  LightBulbIcon,
  FilmIcon,
  TvIcon,
  TrophyIcon,
  BoltIcon,
  FlagIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { getStreamingUrl, openEmbedPlayer } from '../services/streamingService';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import userAnalyticsService from '../services/userAnalyticsService';
import AchievementDashboard from '../components/AchievementDashboard';
import TwoFactorSetup from '../components/TwoFactorSetup';
import TwoFactorDisable from '../components/TwoFactorDisable';
import BackupCodesManager from '../components/BackupCodesManager';
const MovieDetailsOverlay = lazy(() => import('../components/MovieDetailsOverlay'));

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
// Fix SERVER_URL construction for profile pictures
const SERVER_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:3001';

const ProfilePage = () => {
  const { user, reloadUser, loading, detectAndUpdateLocation } = useAuth();
  const { continueWatching, removeFromContinueWatching, clearAllContinueWatching, updateProgress } = useViewingProgress();
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const fileInputRef = useRef(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [profileSavedSuccessfully, setProfileSavedSuccessfully] = useState(false);
  const [originalProfileData, setOriginalProfileData] = useState(null);
  
  // Account tab state
  const [accountData, setAccountData] = useState({
    email: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [accountErrors, setAccountErrors] = useState({});
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isToggling2FA, setIsToggling2FA] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // 2FA state
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
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

      // Initialize account data
      setAccountData(prevData => ({
        ...prevData,
        email: userData.email || '',
        username: userData.username || ''
      }));

      // Initialize 2FA status if available
      setTwoFactorEnabled(userData.twoFactorEnabled || false);
    }
  }, [user]);

  // Calculate user statistics when viewing progress or watchlist changes
  useEffect(() => {
    if (continueWatching && watchlist) {
      const stats = userAnalyticsService.getComprehensiveStats({
        viewingProgress: continueWatching.reduce((acc, item) => {
          const key = item.type === 'movie' ? `movie_${item.id}` : `tv_${item.id}_${item.season}_${item.episode}`;
          acc[key] = item;
          return acc;
        }, {}),
        watchlist
      });
      setUserStats(stats);
    }
  }, [continueWatching, watchlist]);

  // History and resume handlers
  const handleResumeFromHistory = (item) => {
    const content = item.type === 'tv'
      ? { id: item.id, type: 'tv', season: item.season, episode: item.episode }
      : { id: item.id, type: 'movie' };
    const url = getStreamingUrl(content);
    if (url) {
      openEmbedPlayer(url);
    } else {
      // Fallback: navigate to browse if URL can't be generated
      navigate(item.type === 'tv' ? '/series' : '/movies');
    }
  };

  const handleRemoveFromHistory = (item) => {
    removeFromContinueWatching(item.id, item.type, item.season, item.episode);
  };

  const handleMarkWatched = (item) => {
    if (item.type === 'tv') {
      updateProgress(item.id, 'tv', item.season, item.episode, 100);
    } else {
      updateProgress(item.id, 'movie', null, null, 100);
    }
  };

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [loadedImages, setLoadedImages] = useState({});
  const navigate = useNavigate();

  const tabs = [
    { id: 'profile', label: 'Overview' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'collections', label: 'Collections' },
    { id: 'history', label: 'History' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'account', label: 'Account' }
  ];

  const tabIcons = {
    profile: <UserCircleIcon className="w-5 h-5 shrink-0" aria-hidden="true" />,
    achievements: <TrophyIcon className="w-5 h-5 shrink-0" aria-hidden="true" />,
    collections: <Squares2X2Icon className="w-5 h-5 shrink-0" aria-hidden="true" />,
    history: <ClockIcon className="w-5 h-5 shrink-0" aria-hidden="true" />,
    preferences: <Cog6ToothIcon className="w-5 h-5 shrink-0" aria-hidden="true" />,
    account: <ShieldCheckIcon className="w-5 h-5 shrink-0" aria-hidden="true" />,
  };

  const handleEdit = () => {
    setOriginalProfileData(profileData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Check if there are unsaved changes
    const hasChanges = JSON.stringify(profileData) !== JSON.stringify(originalProfileData);
    
    if (hasChanges) {
      setShowUnsavedChangesModal(true);
    } else {
      setProfileData(originalProfileData);
      setIsEditing(false);
      setOriginalProfileData(null);
    }
  };

  const confirmCancel = () => {
    setProfileData(originalProfileData);
    setIsEditing(false);
    setOriginalProfileData(null);
    setShowUnsavedChangesModal(false);
  };

  const continueEditing = () => {
    setShowUnsavedChangesModal(false);
  };



  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!profileData.name?.trim()) {
      toast.error('Display name is required');
      return;
    }
    
    if (!profileData.username?.trim()) {
      toast.error('Username is required');
      return;
    }
    
    if (profileData.username.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(profileData.username)) {
      toast.error('Username can only contain letters, numbers, and underscores');
      return;
    }
    
    try {
      setIsSavingProfile(true);
      
      // Prepare the data to send
      const updateData = {
        name: profileData.name.trim(),
        username: profileData.username.trim(),
        location: profileData.location?.trim() || '',
        bio: profileData.bio?.trim() || '',
        socialLinks: {
          twitter: profileData.socialLinks.twitter?.trim() || '',
          instagram: profileData.socialLinks.instagram?.trim() || '',
          letterboxd: profileData.socialLinks.letterboxd?.trim() || ''
        }
      };
      
      // Send the update request
      const response = await userAPI.updateProfile(updateData);
      
      // Reload user data to get the latest from database
      await reloadUser();
      
      // Set success state
      setProfileSavedSuccessfully(true);
      
      // Close the form after a short delay to show success
      setTimeout(() => {
        setIsEditing(false);
        setOriginalProfileData(null);
        setProfileSavedSuccessfully(false);
      }, 1500);
      
      toast.success('Profile updated successfully and saved to database', {
        duration: 4000,
        icon: '✅',
        style: {
          background: '#10B981',
          color: 'white',
          fontWeight: 'bold'
        }
      });
    } catch (error) {
      console.error('Failed to update profile', error);
      toast.error(error?.message || 'Failed to update profile');
      
      // Don't close the form on error, let user fix and retry
      if (originalProfileData) {
        // Optionally revert to original data on error
        // setProfileData(originalProfileData);
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialLinkChange = (platform, value) => {
    // Auto-add https:// if no protocol is specified
    let processedValue = value;
    if (value && !value.startsWith('http://') && !value.startsWith('https://') && value.includes('.')) {
      processedValue = `https://${value}`;
    }
    
    setProfileData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: processedValue
      }
    }));
  };

  // Validate URL format
  const isValidUrl = (url) => {
    if (!url) return true; // Empty URLs are valid (optional)
    
    // Allow URLs without protocol (will add https:// if missing)
    let urlToCheck = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      urlToCheck = `https://${url}`;
    }
    
    try {
      new URL(urlToCheck);
      return true;
    } catch {
      return false;
    }
  };

  // Enhanced social link change with validation
  const handleSocialLinkChangeWithValidation = (platform, value) => {
    
    if (value && !isValidUrl(value)) {
      toast.error(`Please enter a valid URL for ${platform}`);
      return;
    }
    
    handleSocialLinkChange(platform, value);
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

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      toast.loading(`Uploading ${file.name}...`, { id: 'photo-upload' });
      const response = await userAPI.uploadProfilePicture(file);
      if (response.success) {
        // The user object in context needs to be updated.
        // A simple way is to reload it.
        await reloadUser();
        toast.success('Profile picture updated', { id: 'photo-upload' });
      }
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      toast.error(error?.message || 'Failed to upload picture', { id: 'photo-upload' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      const url = `${window.location.origin}/profile`;
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied');
    } catch (err) {
      console.error('Share failed', err);
      toast.error('Failed to copy link');
    }
  };

  // Account form handlers
  const validateAccountForm = () => {
    const errors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!accountData.email) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(accountData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Username validation
    if (!accountData.username) {
      errors.username = 'Username is required';
    } else if (accountData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(accountData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    return errors;
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!accountData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!accountData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (accountData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(accountData.newPassword)) {
      errors.newPassword = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    if (accountData.newPassword !== accountData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handleAccountChange = (field, value) => {
    setAccountData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (accountErrors[field]) {
      setAccountErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    
    const errors = validateAccountForm();
    if (Object.keys(errors).length > 0) {
      setAccountErrors(errors);
      return;
    }

    try {
      setIsUpdatingAccount(true);
      setAccountErrors({});

      const updateData = {
        email: accountData.email,
        username: accountData.username
      };

      await userAPI.updateProfile(updateData);
      await reloadUser();
      
      toast.success('Account updated successfully');
    } catch (error) {
      console.error('Failed to update account:', error);
      toast.error(error?.message || 'Failed to update account');
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    const errors = validatePasswordForm();
    if (Object.keys(errors).length > 0) {
      setAccountErrors(errors);
      return;
    }

    try {
      setIsChangingPassword(true);
      setAccountErrors({});

      await userAPI.changePassword(accountData.currentPassword, accountData.newPassword);

      // Clear password fields
      setAccountData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error(error?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggle2FA = async () => {
    if (twoFactorEnabled) {
      setShow2FADisable(true);
    } else {
      setShow2FASetup(true);
    }
  };

  const handle2FASetupComplete = () => {
    setShow2FASetup(false);
    setTwoFactorEnabled(true);
    toast.success('Two-factor authentication enabled successfully');
  };

  const handle2FADisable = () => {
    setShow2FADisable(false);
    setTwoFactorEnabled(false);
    toast.success('Two-factor authentication disabled successfully');
  };

  const handleBackupCodes = () => {
    setShowBackupCodes(true);
  };

  const handleDeleteAccount = async () => {
    try {
      await userAPI.deleteAccount();
      
      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      toast.success('Account deleted successfully');
      
      // Redirect to home page
      navigate('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error(error?.message || 'Failed to delete account');
    }
  };

  const handleOAuthConnect = async (provider) => {
    try {
      await userAPI.connectOAuth(provider);
    } catch (error) {
      console.error(`Failed to connect ${provider}:`, error);
      toast.error(`Failed to connect ${provider}`);
    }
  };

  const handleOAuthDisconnect = async (provider) => {
    try {
      await userAPI.disconnectOAuth(provider);
      await reloadUser();
      toast.success(`${provider} disconnected successfully`);
    } catch (error) {
      console.error(`Failed to disconnect ${provider}:`, error);
      toast.error(error?.message || `Failed to disconnect ${provider}`);
    }
  };

  const renderActivityIcon = (type) => {
    switch (type) {
      case 'watch':
        return <PlayIcon className="h-5 w-5 text-green-400" aria-hidden="true" />;
      case 'add':
        return <PlusIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />;
      case 'rate':
        return <StarIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />;
      default:
        return null;
    }
  };

  const getProfileCompletion = () => {
    const socialLinks = profileData.socialLinks || {};
    const checks = [
      Boolean(profileData.name),
      Boolean(profileData.username),
      Boolean(profileData.bio),
      Boolean(profileData.location),
      Boolean(profileData.avatar),
      Object.values(socialLinks).some((url) => Boolean(url)),
      Array.isArray(profileData.preferences?.genres) && profileData.preferences.genres.length > 0,
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
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

  const renderAchievementsTab = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-[#1a1d21] rounded-xl p-4 sm:p-6 border border-white/10 h-[88vh] overflow-y-auto ">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <TrophyIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold">Achievement Dashboard</h3>
            <p className="text-white/60 text-xs sm:text-sm">Track your progress and unlock badges</p>
          </div>
        </div>
        
        <AchievementDashboard variant="full" />
      </div>
    </div>
  );

  const renderWatchlistTab = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-[#1a1d21] rounded-xl p-4 sm:p-6 h-[88vh] overflow-y-auto border border-white/10">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold">My Collections</h3>
          <span className="text-white/60 text-sm sm:text-base">{watchlist.length} items</span>
        </div>
        {watchlist.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
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
                  aria-label="Remove from watchlist"
                >
                  <XMarkIcon className="h-5 w-5 text-white" aria-hidden="true" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PlusIcon className="h-16 w-16 text-white/20 mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold mb-2">No collections yet</h2>
            <p className="text-white/60 mb-6">
              Create collections to organize movies and TV shows your way
            </p>
            <button
              onClick={() => navigate('/browse')}
              className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors"
            >
              Browse content
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
<div className="h-[88vh] overflow-y-auto rounded-2xl p-6 sm:p-8 border border-white/10 bg-[#1a1d21] shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Watch History</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/60">{continueWatching.length} items</span>
            {continueWatching.length > 0 && (
              <button onClick={clearAllContinueWatching} className="text-sm text-red-400 hover:text-red-300">Clear all</button>
            )}
          </div>
        </div>
        {continueWatching.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {continueWatching.map((item) => (
              <div key={`${item.type}-${item.id}-${item.season || ''}-${item.episode || ''}`} className="group relative rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div
                  className="relative w-full aspect-[2/3] sm:aspect-[16/9] cursor-pointer group"
                  onClick={() => setSelectedMovie({
                    id: item.id,
                    title: item.title,
                    name: item.title,
                    poster_path: item.poster_path,
                    backdrop_path: item.backdrop_path,
                    media_type: item.type,
                    type: item.type,
                    season: item.season,
                    episode: item.episode,
                    episodeTitle: item.episodeTitle
                  })}
                >
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Image or Fallback */}
                  {item.poster_path || item.backdrop_path ? (
                    <img
                      src={getImageUrl(item.backdrop_path) || getImageUrl(item.poster_path)}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Content Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none" />
                  
                  {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h4 className="text-white font-semibold text-xs sm:text-sm truncate leading-tight mb-1">
                      {item.title}
                    </h4>
                    {item.type === 'tv' && item.season && item.episode && (
                      <p className="text-white/80 text-xs truncate leading-tight mb-2">
                        S{item.season} • E{item.episode}{item.episodeTitle ? ` • ${item.episodeTitle}` : ''}
                      </p>
                    )}
                    
                    {/* Progress Percentage */}
                    <div className="space-y-2">
                      <span className="text-white/90 text-xs font-semibold block">
                        {Math.round(item.progress || 0)}% complete
                      </span>
                      <div className="w-full bg-white/20 rounded-full h-1 border border-white/10">
                        <div 
                          className="bg-gradient-to-r from-white to-white/90 h-1 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.max(Math.min(item.progress || 0, 100), 1)}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <button
                    aria-label="Remove from History"
                    onClick={(e) => { e.stopPropagation(); handleRemoveFromHistory(item); }}
                    className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  >
                    <XMarkIcon className="w-4 h-4 text-white" aria-hidden="true" />
                  </button>
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

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-6">
          <GlobeAltIcon className="w-5 h-5 text-white/70" aria-hidden="true" />
          <h3 className="text-lg font-semibold">Content Preferences</h3>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-white/60 mb-2">Favorite Genres</label>
            <div className="flex flex-wrap gap-2">
              {['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Romance', 'Thriller', 'Animation', 'Documentary'].map((genre) => (
                <button
                  key={genre}
                  className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${
                    profileData.preferences.genres.includes(genre)
                      ? 'bg-white text-black shadow-lg'
                      : 'bg-white/10 text-white/60 hover:bg-white/20 hover:scale-105'
                  }`}
                  onClick={() => handlePreferenceChange('genres', genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white/60 mb-2">Content Language</label>
              <select
                value={profileData.preferences.language}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
                className="w-full bg-[#1a1d21] border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-white focus:bg-[#1a1d21]/80"
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
                className="w-full bg-[#1a1d21] border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-white focus:bg-[#1a1d21]/80"
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

      <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-6">
          <PlayCircleIcon className="w-5 h-5 text-white/70" aria-hidden="true" />
          <h3 className="text-lg font-semibold">Playback</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Autoplay Next</h4>
              <p className="text-white/60 text-sm">Automatically play the next item in a series</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={!!profileData.preferences.autoplay} onChange={(e) => handlePreferenceChange('autoplay', e.target.checked)} />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
            </label>
          </div>
          <div>
            <label className="block text-white/60 mb-2">Default Video Quality</label>
            <select
              value={profileData.preferences.quality}
              onChange={(e) => handlePreferenceChange('quality', e.target.value)}
              className="w-full bg-[#1a1d21] border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-white focus:bg-[#1a1d21]/80"
            >
              <option value="auto">Auto</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-6">
          <BellAlertIcon className="w-5 h-5 text-white/70" aria-hidden="true" />
          <h3 className="text-lg font-semibold">Notifications</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Email Updates</h4>
              <p className="text-white/60 text-sm">Get emails about new episodes and recommendations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={!!profileData.preferences.notifications} onChange={(e) => handlePreferenceChange('notifications', e.target.checked)} />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-6">
          <EyeSlashIcon className="w-5 h-5 text-white/70" aria-hidden="true" />
          <h3 className="text-lg font-semibold">Privacy</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Watch History</h4>
              <p className="text-white/60 text-sm">Keep track of your viewing history</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
            </label>
          </div>
          <button className="w-full px-4 py-2 bg-red-500/5 text-red-400 rounded-full hover:bg-red-500/10 transition-colors border border-red-500/20 hover:border-red-500/30">
            Clear Watch History
          </button>
        </div>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Account Information */}
      <div className="bg-[#1a1d21] rounded-xl p-4 sm:p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <EnvelopeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold">Account Information</h3>
            <p className="text-white/60 text-xs sm:text-sm">Manage your basic account details</p>
          </div>
        </div>
        <form onSubmit={handleUpdateAccount} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div>
              <label className="block text-white/60 mb-2 text-sm font-medium">Email Address</label>
              <input
                type="email"
                value={accountData.email}
                onChange={(e) => handleAccountChange('email', e.target.value)}
                className={`w-full bg-[#1a1d21] border rounded-full px-4 py-3 text-white focus:outline-none transition-all duration-200 ${
                  accountErrors.email 
                    ? 'border-red-500/50 focus:border-red-400' 
                    : 'border-white/10 focus:border-white/30 focus:bg-[#1a1d21]/80'
                }`}
                placeholder="Enter your email address"
              />
              {accountErrors.email && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-3 h-3" />
                  {accountErrors.email}
                </p>
              )}
            </div>
            <div>
              <label className="block text-white/60 mb-2 text-sm font-medium">Username</label>
              <input
                type="text"
                value={accountData.username}
                onChange={(e) => handleAccountChange('username', e.target.value)}
                className={`w-full bg-[#1a1d21] border rounded-full px-4 py-3 text-white focus:outline-none transition-all duration-200 ${
                  accountErrors.username 
                    ? 'border-red-500/50 focus:border-red-400' 
                    : 'border-white/10 focus:border-white/30 focus:bg-[#1a1d21]/80'
                }`}
                placeholder="Enter your username"
              />
              {accountErrors.username && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-3 h-3" />
                  {accountErrors.username}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingAccount}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 ${
                isUpdatingAccount
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95'
              }`}
            >
              {isUpdatingAccount ? 'Updating...' : 'Update Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Security */}
      <div className="bg-[#1a1d21] rounded-xl p-4 sm:p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <KeyIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold">Security</h3>
            <p className="text-white/60 text-xs sm:text-sm">Manage your account security settings</p>
          </div>
        </div>
        
        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="space-y-6 mb-8">
          <div className="bg-[#1a1d21] rounded-xl p-4 border border-white/10">
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <KeyIcon className="w-4 h-4 text-white" />
              </div>
              Change Password
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <input
                  type="password"
                  value={accountData.currentPassword}
                  onChange={(e) => handleAccountChange('currentPassword', e.target.value)}
                  placeholder="Current password"
                                  className={`w-full bg-[#1a1d21] border rounded-full px-4 py-3 text-white focus:outline-none transition-all duration-200 ${
                  accountErrors.currentPassword 
                    ? 'border-red-500/50 focus:border-red-400' 
                    : 'border-white/10 focus:border-white/30 focus:bg-[#1a1d21]/80'
                }`}
                />
                {accountErrors.currentPassword && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    {accountErrors.currentPassword}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  value={accountData.newPassword}
                  onChange={(e) => handleAccountChange('newPassword', e.target.value)}
                  placeholder="New password"
                                  className={`w-full bg-[#1a1d21] border rounded-full px-4 py-3 text-white focus:outline-none transition-all duration-200 ${
                  accountErrors.newPassword 
                    ? 'border-red-500/50 focus:border-red-400' 
                    : 'border-white/10 focus:border-white/30 focus:bg-[#1a1d21]/80'
                }`}
                />
                {accountErrors.newPassword && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    {accountErrors.newPassword}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  value={accountData.confirmPassword}
                  onChange={(e) => handleAccountChange('confirmPassword', e.target.value)}
                  placeholder="Confirm new password"
                                  className={`w-full bg-[#1a1d21] border rounded-full px-4 py-3 text-white focus:outline-none transition-all duration-200 ${
                  accountErrors.confirmPassword 
                    ? 'border-red-500/50 focus:border-red-400' 
                    : 'border-white/10 focus:border-white/30 focus:bg-[#1a1d21]/80'
                }`}
                />
                {accountErrors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    {accountErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isChangingPassword}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                  isChangingPassword
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95'
                }`}
              >
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </form>

        {/* Two-Factor Authentication */}
        <div className="bg-[#1a1d21] rounded-xl p-4 border border-white/10">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <ShieldExclamationIcon className="w-4 h-4 text-white" />
                  </div>
                  Two-Factor Authentication
                </h4>
                <p className="text-white/60 text-sm mb-3">
                  Add an extra layer of security to your account
                </p>
                {twoFactorEnabled && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <div className="w-4 h-4 rounded-full bg-green-400/20 flex items-center justify-center">
                      <CheckIcon className="w-3 h-3" />
                    </div>
                    Two-factor authentication is enabled
                  </div>
                )}
              </div>
              <button
                onClick={handleToggle2FA}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                  twoFactorEnabled
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95'
                }`}
              >
                {twoFactorEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>

            {twoFactorEnabled && (
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-white mb-1">Backup Codes</h5>
                    <p className="text-white/50 text-xs">
                      Manage your backup codes for account recovery
                    </p>
                  </div>
                  <button
                    onClick={handleBackupCodes}
                    className="px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-200 text-sm"
                  >
                    Manage Codes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <LinkIcon className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Connected Accounts</h3>
            <p className="text-white/60 text-sm">Link your external accounts for easy access</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google */}
          <div className="flex items-center justify-between bg-[#1a1d21] rounded-full p-4 border border-white/10 hover:bg-[#1a1d21]/80 transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                </svg>
              </div>
              <div>
                <span className="text-white font-semibold">Google</span>
                {profileData.googleId ? (
                  <div className="flex items-center gap-2 text-green-400 text-xs">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Connected
                  </div>
                ) : (
                  <p className="text-white/40 text-xs">Not connected</p>
                )}
              </div>
            </div>
            {profileData.googleId ? (
              <button 
                onClick={() => handleOAuthDisconnect('google')}
                className="px-4 py-2 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 transition-all duration-200 border border-red-500/20 hover:scale-105 active:scale-95"
              >
                Disconnect
              </button>
            ) : (
              <button 
                onClick={() => handleOAuthConnect('google')}
                className="px-4 py-2 bg-white text-black rounded-full hover:bg-white/90 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Connect
              </button>
            )}
          </div>

          {/* GitHub */}
          <div className="flex items-center justify-between bg-[#1a1d21] rounded-full p-4 border border-white/10 hover:bg-[#1a1d21]/80 transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 16 16" fill="black">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
              </div>
              <div>
                <span className="text-white font-semibold">GitHub</span>
                {profileData.githubId ? (
                  <div className="flex items-center gap-2 text-green-400 text-xs">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Connected
                  </div>
                ) : (
                  <p className="text-white/40 text-xs">Not connected</p>
                )}
              </div>
            </div>
            {profileData.githubId ? (
              <button 
                onClick={() => handleOAuthDisconnect('github')}
                className="px-4 py-2 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 transition-all duration-200 border border-red-500/20 hover:scale-105 active:scale-95"
              >
                Disconnect
              </button>
            ) : (
              <button 
                onClick={() => handleOAuthConnect('github')}
                className="px-4 py-2 bg-white text-black rounded-full hover:bg-white/90 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#1a1d21] rounded-xl p-6 border border-red-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <TrashIcon className="w-5 h-5 text-red-400" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-400">Danger Zone</h3>
            <p className="text-white/60 text-sm">Irreversible actions that affect your account</p>
          </div>
        </div>
        <div className="bg-red-500/5 rounded-xl p-6 border border-red-500/20">
          <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
              <TrashIcon className="w-3 h-3 text-red-400" />
            </div>
            Delete Account
          </h4>
          <p className="text-white/60 text-sm mb-4 leading-relaxed">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <p className="text-white/60 text-sm mb-4 font-medium">
            This will permanently delete:
          </p>
          <ul className="text-white/60 text-sm mb-6 list-disc list-inside space-y-2">
            <li>Your profile and account information</li>
            <li>Your watchlist and viewing history</li>
            <li>Your reviews and ratings</li>
            <li>All associated data and preferences</li>
          </ul>
          
          {!showDeleteConfirm ? (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 hover:scale-105 active:scale-95 font-semibold"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                  </div>
                  <p className="text-red-400 font-semibold text-lg">Final Confirmation</p>
                </div>
                <p className="text-white/80 text-sm mb-4 leading-relaxed">
                  Type "DELETE" to confirm account deletion:
                </p>
                <input
                  type="text"
                  placeholder="Type DELETE to confirm"
                  className="w-full bg-[#1a1d21] border border-red-500/30 rounded-full px-4 py-3 text-white focus:outline-none focus:border-red-400 mb-4 transition-all duration-200"
                  onChange={(e) => {
                    if (e.target.value === 'DELETE') {
                      e.target.dataset.confirmed = 'true';
                    } else {
                      e.target.dataset.confirmed = 'false';
                    }
                  }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={(document.querySelector('input[placeholder="Type DELETE to confirm"]')?.dataset.confirmed !== 'true')}
                    className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 hover:scale-105 active:scale-95 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    Yes, Delete My Account
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-6 py-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-200 hover:scale-105 active:scale-95 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProfileTab = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Overview Header */}
      <div className="bg-[#1a1d21] rounded-xl p-4 sm:p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
          <div className="relative group mx-auto sm:mx-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 transition-colors relative ${
              isUploadingPhoto 
                ? 'border-blue-400/50 bg-blue-400/10' 
                : 'border-white/10 group-hover:border-white'
            }`}>
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-2 border-white border-t-transparent"></div>
                </div>
              )}
              {profileData.avatar ? (
                <img
                  src={profileData.avatar.startsWith('http') ? profileData.avatar : `${SERVER_URL}${profileData.avatar}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#2b3036] text-3xl sm:text-5xl text-white/40">
                  {profileData.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              onClick={handleFileSelect}
              disabled={isUploadingPhoto}
              className={`absolute bottom-0 right-0 p-1.5 sm:p-2 rounded-full shadow-lg transition-colors ${
                isUploadingPhoto 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-white hover:bg-white/90'
              }`}
              aria-label="Edit avatar"
            >
              <PencilSquareIcon className="h-3 w-3 sm:h-4 sm:w-4 text-black" aria-hidden="true" />
            </button>
          </div>
          {isUploadingPhoto && (
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/90 text-white text-sm rounded-full">
                <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                <span>Uploading...</span>
              </div>
            </div>
          )}
          <div className="flex-grow text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
              <h2 className="text-xl sm:text-2xl font-bold">{profileData.name}</h2>
              <span className="inline-block max-w-[60vw] sm:max-w-none px-3 py-1 bg-white/10 text-white rounded-full text-sm truncate mx-auto sm:mx-0">{profileData.plan}</span>
            </div>
            <p className="text-white/50 text-sm mb-4">@{profileData.username || 'user'} • Member since {profileData.joinDate}</p>
            <p className="text-white/70 mb-6">{profileData.bio || "No bio yet"}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-4 flex-wrap">
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
            <div className="flex flex-row flex-wrap gap-4 mt-4 items-center justify-center sm:justify-start">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile || JSON.stringify(profileData) === JSON.stringify(originalProfileData)}
                    className={`px-4 py-2 rounded-full transition-colors ${
                      isSavingProfile 
                        ? 'bg-white/60 text-black cursor-not-allowed' 
                        : JSON.stringify(profileData) === JSON.stringify(originalProfileData)
                        ? 'bg-white/40 text-black/60 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-white/90'
                    }`}
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button onClick={handleShareProfile} className="px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors">
                Share Profile
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isEditing && (
                <motion.div
                  key="inlineEditForm"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6"
                  layout
                >
                  <div className="mb-4 p-3 bg-white/10 rounded-full border border-white/20">
                    <p className="text-white/80 text-sm">
                      <span className="font-semibold">Note:</span> Fields marked with * are required. 
                      The location field is optional but can be auto-detected using the Detect button.
                    </p>
                  </div>
                  
                  {/* Success Indicator */}
                  {profileSavedSuccessfully && (
                    <div className="mb-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-green-300/80 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-semibold">Success!</span> Your profile has been saved to the database successfully.
                      </p>
                    </div>
                  )}

                  {/* Unsaved Changes Indicator */}
                  {!profileSavedSuccessfully && JSON.stringify(profileData) !== JSON.stringify(originalProfileData) && (
                    <div className="mb-4 p-3 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                      <p className="text-yellow-300/80 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="font-semibold">Unsaved Changes:</span> You have unsaved changes. 
                        Click "Save Changes" to save them or "Cancel" to discard them.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/60 mb-2">Display Name *</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => handleProfileChange('name', e.target.value)}
                        className="w-full bg-[#1a1d21] border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-white/30 focus:bg-[#1a1d21]/80 transition-all duration-200"
                        placeholder="Enter your display name"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 mb-2">Username *</label>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => handleProfileChange('username', e.target.value)}
                        className="w-full bg-[#1a1d21] border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-white/30 focus:bg-[#1a1d21]/80 transition-all duration-200"
                        placeholder="Enter your username"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 mb-2">Location</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={profileData.location}
                          onChange={(e) => handleProfileChange('location', e.target.value)}
                          className="flex-1 bg-[#1a1d21] border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-white/30 focus:bg-[#1a1d21]/80 transition-all duration-200"
                          placeholder="Enter your location"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            setIsDetectingLocation(true);
                            try {
                              const result = await detectAndUpdateLocation();
                              if (result.success) {
                                // Update local state with the detected location
                                setProfileData(prev => ({
                                  ...prev,
                                  location: result.location
                                }));
                              }
                            } finally {
                              setIsDetectingLocation(false);
                            }
                          }}
                          disabled={isDetectingLocation}
                          className="px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 border border-white/30 hover:border-white/50 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Auto-detect detailed location (City, State, Country)"
                        >
                          {isDetectingLocation ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              <span>Detecting...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>Detect</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-white/60">Bio</label>
                        <span className="text-xs text-white/40">
                          {profileData.bio?.length || 0}/250 characters
                        </span>
                      </div>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 250) {
                            handleProfileChange('bio', value);
                          }
                        }}
                        rows={3}
                        className="w-full bg-[#1a1d21] border border-white/10 rounded-2xl px-4 py-2 text-white focus:outline-none focus:border-white/30 focus:bg-[#1a1d21]/80 transition-all duration-200 resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-white/60 mb-2">Social Links</label>
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Twitter URL (optional)"
                          value={profileData.socialLinks.twitter}
                          onChange={(e) => handleSocialLinkChangeWithValidation('twitter', e.target.value)}
                          className="w-full bg-[#1a1d21] border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-white/30 focus:bg-[#1a1d21]/80 transition-all duration-200"
                        />
                        <input
                          type="text"
                          placeholder="Instagram URL (optional)"
                          value={profileData.socialLinks.instagram}
                          onChange={(e) => handleSocialLinkChangeWithValidation('instagram', e.target.value)}
                          className="w-full bg-[#1a1d21] border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-white/30 focus:bg-[#1a1d21]/80 transition-all duration-200"
                        />
                        <input
                          type="text"
                          placeholder="Letterboxd URL (optional)"
                          value={profileData.socialLinks.letterboxd}
                          onChange={(e) => handleSocialLinkChangeWithValidation('letterboxd', e.target.value)}
                          className="w-full bg-[#1a1d21] border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-white/30 focus:bg-[#1a1d21]/80 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {getProfileCompletion() < 100 && (
            <div className="w-full md:w-64 mt-6 md:mt-0">
              <div className="rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Profile completeness</span>
                  <span className="text-sm text-white/80">{getProfileCompletion()}%</span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${getProfileCompletion()}%` }} />
                </div>
                <ul className="mt-3 space-y-1 text-xs text-white/60 list-disc list-inside">
                  <li>Add a bio</li>
                  <li>Pick your favorite genres</li>
                  <li>Connect a social account</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

            {/* Continue Watching Preview */}
            {continueWatching && continueWatching.length > 0 && (
        <div className="rounded-2xl p-6 sm:p-8 border border-white/10 bg-[#1a1d21] shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/30">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Continue Watching</h3>
            </div>
            <button 
              onClick={() => setActiveTab('history')} 
              className="px-4 py-2 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-full border border-white/10 hover:border-white/20 transition-all duration-200"
            >
              See all
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {continueWatching.slice(0, 6).map((item) => (
              <div key={`cw-${item.type}-${item.id}-${item.season || ''}-${item.episode || ''}`} className="group relative rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div
                  className="relative w-full aspect-[2/3] sm:aspect-[16/9] cursor-pointer group"
                  onClick={() => setSelectedMovie({
                    id: item.id,
                    title: item.title,
                    name: item.title,
                    poster_path: item.poster_path,
                    backdrop_path: item.backdrop_path,
                    media_type: item.type,
                    type: item.type,
                    season: item.season,
                    episode: item.episode,
                    episodeTitle: item.episodeTitle
                  })}
                >
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                  <picture>
                    {item.backdrop_path && (
                      <source media="(min-width: 768px)" srcSet={getImageUrl(item.backdrop_path)} />
                    )}
                    {item.poster_path && (
                      <source media="(max-width: 767px)" srcSet={getImageUrl(item.poster_path)} />
                    )}
                    <img
                      src={getImageUrl(item.backdrop_path) || getImageUrl(item.poster_path)}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </picture>
                  

                  
                  {/* Bottom Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none" />
                  
                  {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h4 className="text-white font-semibold text-xs sm:text-sm truncate leading-tight mb-1">
                      {item.title}
                    </h4>
                    {item.type === 'tv' && item.season && item.episode && (
                      <p className="text-white/80 text-xs truncate leading-tight mb-2">
                        S{item.season} • E{item.episode}{item.episodeTitle ? ` • ${item.episodeTitle}` : ''}
                      </p>
                    )}
                    
                    {/* Progress Percentage */}
                    <div className="space-y-2">
                      <span className="text-white/90 text-xs font-semibold block">
                        {Math.round(item.progress || 0)}% complete
                      </span>
                      <div className="w-full bg-white/20 rounded-full h-1 border border-white/10">
                        <div 
                          className="bg-gradient-to-r from-white to-white/90 h-1 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.max(Math.min(item.progress || 0, 100), 1)}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-[#1a1d21] rounded-2xl p-3 sm:p-5 border border-white/10 hover:border-white/20 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:border-white/30 transition-colors">
              <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Total</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-lg sm:text-2xl font-bold text-white">
              {userStats ? userStats.watchTime.formatted : '0h'}
            </p>
            <p className="text-xs text-white/40 font-light">
              {userStats ? `${userStats.watchTime.movies}h movies, ${userStats.watchTime.tv}h TV` : 'Hours watched'}
            </p>
          </div>
        </div>

        <div className="bg-[#1a1d21] rounded-2xl p-3 sm:p-5 border border-white/10 hover:border-white/20 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:border-white/30 transition-colors">
              <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Finished</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-lg sm:text-2xl font-bold text-white">
              {userStats ? userStats.content.completed : '0'}
            </p>
            <p className="text-xs text-white/40 font-light">
              {userStats ? `${userStats.content.movies} movies, ${userStats.content.tvEpisodes} episodes` : 'Content completed'}
            </p>
          </div>
        </div>

        <div className="bg-[#1a1d21] rounded-2xl p-3 sm:p-5 border border-white/10 hover:border-white/20 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:border-white/30 transition-colors">
              <Squares2X2Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Saved</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-lg sm:text-2xl font-bold text-white">
              {userStats ? userStats.reviews.written : '0'}
            </p>
            <p className="text-xs text-white/40 font-light">
              {userStats ? `${userStats.content.inProgress} items in progress` : 'Saved items'}
            </p>
          </div>
        </div>

        {/* Viewing Streak */}
        <div className="bg-[#1a1d21] rounded-2xl p-3 sm:p-5 border border-white/10 hover:border-white/20 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:border-white/30 transition-colors">
              <FireIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Streak</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-lg sm:text-2xl font-bold text-white">
              {userStats ? userStats.preferences.viewingStreak : '0'}
            </p>
            <p className="text-xs text-white/40 font-light">
              {userStats ? 'Consecutive days' : 'Days watched'}
            </p>
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-[#1a1d21] rounded-2xl p-3 sm:p-5 border border-white/10 hover:border-white/20 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:border-white/30 transition-colors">
              <StarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Score</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-lg sm:text-2xl font-bold text-white">
              {userStats ? userStats.reviews.averageRating.toFixed(1) : '0.0'}
            </p>
            <p className="text-xs text-white/40 font-light">
              {userStats ? 'Your average score' : 'Rating given'}
            </p>
          </div>
        </div>
      </div>

      

      {/* Achievement Dashboard */}
      {userStats && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <TrophyIcon className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Achievements</h3>
              <p className="text-white/60 text-sm">Track your progress and unlock badges</p>
            </div>
          </div>
          
          <AchievementDashboard variant="compact" />
        </div>
      )}



      {/* Highlights and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl p-6 border border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-2 mb-4">
            <GlobeAltIcon className="w-5 h-5 text-white/70" aria-hidden="true" />
            <h3 className="text-lg font-semibold">Your Highlights</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/0 rounded-lg p-4 border border-white/10">
              <p className="text-white/60 text-sm mb-1">Favorite Genres</p>
              <p className="text-white font-medium">
                {userStats ? userStats.preferences.favoriteGenres.length : profileData.preferences.genres.length || 0} 
                {userStats ? ' discovered' : ' selected'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(userStats ? userStats.preferences.favoriteGenres : profileData.preferences.genres || []).slice(0, 6).map((g) => (
                  <span key={g} className="px-2 py-0.5 text-xs bg-white/10 rounded-full text-white/80">{g}</span>
                ))}
                {(userStats ? userStats.preferences.favoriteGenres : profileData.preferences.genres || []).length > 6 && (
                  <span className="px-2 py-0.5 text-xs bg-white/10 rounded-full text-white/60">
                    +{(userStats ? userStats.preferences.favoriteGenres : profileData.preferences.genres || []).length - 6} more
                  </span>
                )}
              </div>
            </div>
            <div className="bg-white/0 rounded-lg p-4 border border-white/10">
              <p className="text-white/60 text-sm mb-1">Language</p>
              <p className="text-white font-medium uppercase">{profileData.preferences.language}</p>
              <p className="text-white/60 text-xs mt-2">Content language preference</p>
            </div>
            <div className="bg-white/0 rounded-lg p-4 border border-white/10">
              <p className="text-white/60 text-sm mb-1">Rating Filter</p>
              <p className="text-white font-medium uppercase">{profileData.preferences.rating}</p>
              <p className="text-white/60 text-xs mt-2">Parental controls</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-6 border border-white/10 bg-white/[0.03]">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button onClick={() => setActiveTab('collections')} className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <Squares2X2Icon className="w-5 h-5" aria-hidden="true" />
              <span>Manage Collections</span>
            </button>
            <button onClick={() => setActiveTab('preferences')} className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <Cog6ToothIcon className="w-5 h-5" aria-hidden="true" />
              <span>Update Preferences</span>
            </button>
            <button onClick={() => setActiveTab('account')} className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <ShieldCheckIcon className="w-5 h-5" aria-hidden="true" />
              <span>Account & Security</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline edit form replaces Quick Edit when editing */}

      
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1114] text-white">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6">
          <aside className="lg:col-span-4 xl:col-span-3 order-2 lg:order-1">
            <div className="lg:sticky lg:top-8 space-y-4 sm:space-y-6">
              <div className="hidden lg:block rounded-xl p-6 border border-white/10 bg-white/[0.03]">
                {loading ? (
                  <div className="flex items-center gap-4 animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/5 rounded w-2/3" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                    <div className="h-6 w-16 bg-white/5 rounded-full" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <div className={`w-16 h-16 rounded-full overflow-hidden border transition-colors relative ${
                        isUploadingPhoto 
                          ? 'border-blue-400/50 bg-blue-400/10' 
                          : 'border-white/10 group-hover:border-white/60'
                      }`}>
                        {isUploadingPhoto && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                          </div>
                        )}
                        {profileData.avatar ? (
                          <img
                            src={profileData.avatar.startsWith('http') ? profileData.avatar : `${SERVER_URL}${profileData.avatar}`}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#2b3036] text-2xl text-white/40">
                            {profileData.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleFileSelect}
                        disabled={isUploadingPhoto}
                        className={`absolute -bottom-1 -right-1 p-1.5 rounded-full shadow-lg transition-colors ${
                          isUploadingPhoto 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-white hover:bg-white/90'
                        }`}
                        aria-label="Change profile picture"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5 text-black" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold truncate">{profileData.name}</h2>
                      <p className="text-white/50 text-sm truncate">@{profileData.username || 'user'}</p>
                    </div>
                    <span className="ml-auto px-2.5 py-1 bg-white/10 text-white rounded-full text-xs">
                      {profileData.plan}
                    </span>
                  </div>
                )}
              </div>
              <nav className="hidden lg:block rounded-xl p-2 border border-white/10 bg-white/[0.03]">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    title={tab.label}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-full transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="shrink-0">{tabIcons[tab.id]}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>
          <main className="lg:col-span-8 xl:col-span-9 order-1 lg:order-2">
            {/* Mobile Navigation Tabs */}
            <div className="lg:hidden mb-6">
              <div className="bg-black/20 rounded-full p-1 border border-white/10">
                <div className="flex overflow-x-auto scrollbar-hide">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center ${
                        activeTab === tab.id
                          ? 'bg-white text-black shadow-lg'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="flex items-center">
                        {tabIcons[tab.id]}
                        <span className="ml-2">{tab.label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-6">
                <div className="bg-[#1a1d21] h-40 rounded-xl animate-pulse" />
                <div className="bg-[#1a1d21] h-56 rounded-xl animate-pulse" />
                <div className="bg-[#1a1d21] h-80 rounded-xl animate-pulse" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-8"
                >
                  {activeTab === 'profile' && renderProfileTab()}
                  {activeTab === 'achievements' && renderAchievementsTab()}
                  {activeTab === 'collections' && renderWatchlistTab()}
                  {activeTab === 'history' && renderHistoryTab()}
                  {activeTab === 'preferences' && renderPreferencesTab()}
                  {activeTab === 'account' && renderAccountTab()}
                </motion.div>
              </AnimatePresence>
            )}
            {selectedMovie && (
              <React.Suspense fallback={null}>
                <MovieDetailsOverlay
                  movie={selectedMovie}
                  onClose={() => setSelectedMovie(null)}
                  onMovieSelect={setSelectedMovie}
                  onGenreClick={() => {}}
                />
              </React.Suspense>
            )}
          </main>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {show2FASetup && (
        <TwoFactorSetup
          onSetupComplete={handle2FASetupComplete}
          onCancel={() => setShow2FASetup(false)}
        />
      )}

      {/* 2FA Disable Modal */}
      {show2FADisable && (
        <TwoFactorDisable
          onDisable={handle2FADisable}
          onCancel={() => setShow2FADisable(false)}
        />
      )}

      {/* Backup Codes Manager Modal */}
      {showBackupCodes && (
        <BackupCodesManager
          onClose={() => setShowBackupCodes(false)}
        />
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedChangesModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[#1a1d21] rounded-2xl p-8 max-w-md w-full border border-white/10"
          >
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto border border-yellow-500/30">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Unsaved Changes</h3>
                <p className="text-white/60 text-sm">
                  You have unsaved changes to your profile. Are you sure you want to discard them?
                </p>
              </div>

              <div className="bg-yellow-500/10 rounded-2xl p-4 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="font-semibold text-yellow-400">Warning</span>
                </div>
                <p className="text-yellow-300/80 text-sm">
                  This action cannot be undone. All unsaved changes will be lost.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={continueEditing}
                  className="flex-1 px-6 py-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-200"
                >
                  Continue Editing
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 font-semibold"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}


    </div>
  );
};

export default ProfilePage;