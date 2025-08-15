import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { communityService } from '../services/communityService';
import DiscussionCard from './community/DiscussionCard';
import CreateDiscussion from './community/CreateDiscussion';
import DiscussionFilters from './community/DiscussionFilters';
import CommunityStats from './community/CommunityStats';
import CommunityPageSkeleton from './community/CommunityPageSkeleton';
import DiscussionCardSkeleton from './community/DiscussionCardSkeleton';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { socketService } from '../services/socketService';
import { debugCommunityAPI, testCommunityService } from '../utils/communityDebug';

const CommunityPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('discussions');
  const [searchQuery, setSearchQuery] = useState('');
  const [discussions, setDiscussions] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [categories, setCategories] = useState([]);
  const [topTags, setTopTags] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const statsPanelRef = useRef(null);

  useEffect(() => {
    loadInitialData();
    
    // Set up socket listeners
    socketService.connect();

    const handleNewDiscussion = (discussion) => {
      setDiscussions(prevDiscussions => [discussion, ...prevDiscussions]);
      setStats(prevStats => ({
        ...prevStats,
        totalDiscussions: (prevStats?.totalDiscussions || 0) + 1,
        recentActivity: [
          {
            icon: (
              <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            ),
            description: `New discussion created: "${discussion.title}"`,
            time: 'Just now'
          },
          ...(prevStats?.recentActivity || []).slice(0, 4)
        ]
      }));
    };

    const handleDiscussionLiked = (data) => {
      setDiscussions(prevDiscussions => 
        prevDiscussions.map(discussion => {
          const discussionId = discussion.id || discussion._id;
          return discussionId === data.discussionId 
            ? { 
                ...discussion, 
                likes: data.likes,
                isLiked: data.isLiked,
                likesCount: data.likes.length
              }
            : discussion;
        })
      );
    };

    const handleNewReply = (data) => {
      setDiscussions(prevDiscussions => 
        prevDiscussions.map(discussion => {
          const discussionId = discussion.id || discussion._id;
          if (discussionId === data.discussionId) {
            return {
              ...discussion,
              replies: [...(discussion.replies || []), data.reply]
            };
          }
          return discussion;
        })
      );

      setStats(prevStats => ({
        ...prevStats,
        totalComments: (prevStats?.totalComments || 0) + 1,
        recentActivity: [
          {
            icon: (
              <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            ),
            description: `New reply on "${data.discussionTitle}"`,
            time: 'Just now'
          },
          ...(prevStats?.recentActivity || []).slice(0, 4)
        ]
      }));
    };

    const handleReplyLiked = (data) => {
      setDiscussions(prevDiscussions => 
        prevDiscussions.map(discussion => {
          const discussionId = discussion.id || discussion._id;
          if (discussionId === data.discussionId) {
            return {
              ...discussion,
              replies: discussion.replies.map(reply => {
                const replyId = reply.id || reply._id;
                return replyId === data.replyId
                  ? { 
                      ...reply, 
                      likes: data.likes,
                      isLiked: data.isLiked,
                      likesCount: data.likes.length
                    }
                  : reply;
              })
            };
          }
          return discussion;
        })
      );
    };

    const handleUserJoined = (data) => {
      setStats(prevStats => ({
        ...prevStats,
        activeUsers: (prevStats?.activeUsers || 0) + 1,
        recentActivity: [
          {
            icon: (
              <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ),
            description: `New user ${data.username} joined the community`,
            time: 'Just now'
          },
          ...(prevStats?.recentActivity || []).slice(0, 4)
        ]
      }));
    };

    // Add socket listeners
    socketService.addListener('discussion:new', handleNewDiscussion);
    socketService.addListener('discussion:liked', handleDiscussionLiked);
    socketService.addListener('reply:new', handleNewReply);
    socketService.addListener('reply:liked', handleReplyLiked);
    socketService.addListener('user:joined', handleUserJoined);

    // Cleanup
    return () => {
      socketService.removeListener('discussion:new', handleNewDiscussion);
      socketService.removeListener('discussion:liked', handleDiscussionLiked);
      socketService.removeListener('reply:new', handleNewReply);
      socketService.removeListener('reply:liked', handleReplyLiked);
      socketService.removeListener('user:joined', handleUserJoined);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'discussions' && !isSearching) {
      loadDiscussions();
    }
  }, [activeTab, sortBy, selectedCategory, selectedTag]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isStatsExpanded && statsPanelRef.current && !statsPanelRef.current.contains(event.target)) {
        setIsStatsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatsExpanded]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading initial community data...');
      
      // Stagger requests to avoid rate limiting
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Load discussions first (most important)
      let discussionsData;
      try {
        discussionsData = await communityService.getDiscussions(1, 10, sortBy, selectedCategory, selectedTag);
        setDiscussions(discussionsData.discussions || []);
        setHasMore(discussionsData.currentPage < discussionsData.totalPages);
        console.log('✅ Discussions loaded successfully');
      } catch (err) {
        console.warn('⚠️ Failed to load discussions:', err.message);
        setDiscussions([]);
        setHasMore(false);
        
        // If it's a rate limit error, show appropriate message
        if (err.message.includes('Rate limit') || err.message.includes('429')) {
          setError('Rate limit exceeded. Please wait a moment and refresh the page.');
          return; // Don't continue with other requests
        }
      }
      
      // Wait longer before next request to avoid rate limiting
      await delay(1000);
      
      // Load other data in parallel but with staggered start
      const loadSecondaryData = async () => {
        try {
          // Load trending and stats with a small delay between them
          const trendingData = await communityService.getTrendingTopics();
          setTrendingTopics(trendingData || []);
          console.log('✅ Trending topics loaded successfully');
          
          await delay(500); // Small delay between requests
          
          const statsData = await communityService.getCommunityStats();
          setStats(statsData || {});
          console.log('✅ Community stats loaded successfully');
        } catch (err) {
          console.warn('⚠️ Failed to load trending/stats:', err.message);
          setTrendingTopics([]);
          setStats({});
        }
      };
      
      const loadFilterData = async () => {
        try {
          // Load categories and tags with a small delay between them
          const categoriesData = await communityService.getCategories();
          setCategories(categoriesData || []);
          console.log('✅ Categories loaded successfully');
          
          await delay(500); // Small delay between requests
          
          const tagsData = await communityService.getTopTags();
          setTopTags(tagsData || []);
          console.log('✅ Top tags loaded successfully');
        } catch (err) {
          console.warn('⚠️ Failed to load categories/tags:', err.message);
          setCategories([]);
          setTopTags([]);
        }
      };
      
      // Start secondary data loading with longer delays
      setTimeout(loadSecondaryData, 2000);
      setTimeout(loadFilterData, 3000);
      
      setError(null);
    } catch (err) {
      console.error('❌ Error loading initial data:', err);
      const errorMessage = err.message || err.error || 'Failed to load community data';
      
      // Check if it's a rate limiting error
      if (err.response?.status === 429 || err.message.includes('Rate limit')) {
        setError('Rate limit exceeded. Please wait a moment and refresh the page.');
      } else {
        setError(`Error: ${errorMessage}. Please check the console for more details.`);
      }
      
      // Log additional error details
      if (err.response) {
        console.error('Response error details:', err.response);
      }
      if (err.request) {
        console.error('Request error details:', err.request);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDiscussions = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading discussions with params:', {
        page: currentPage,
        sortBy,
        category: selectedCategory,
        tag: selectedTag
      });
      
      const data = await communityService.getDiscussions(
        currentPage,
        10,
        sortBy,
        selectedCategory,
        selectedTag
      );
      console.log('✅ Discussions loaded successfully:', data);
      
      setDiscussions(data.discussions || []);
      // Calculate hasMore based on currentPage and totalPages
      setHasMore(data.currentPage < data.totalPages);
      setError(null);
    } catch (err) {
      console.error('❌ Error loading discussions:', err);
      
      // Handle rate limiting errors specifically
      if (err.response?.status === 429 || err.message.includes('Rate limit')) {
        const retryAfter = err.response?.data?.retryAfter || '15 minutes';
        setError(`Rate limit exceeded. Please wait ${retryAfter} before trying again.`);
      } else {
        const errorMessage = err.message || err.error || 'Failed to load discussions';
        setError(`Error: ${errorMessage}. Please check the console for more details.`);
      }
      
      // Log additional error details
      if (err.response) {
        console.error('Response error details:', err.response);
      }
      if (err.request) {
        console.error('Request error details:', err.request);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearching(false);
      loadDiscussions();
      return;
    }

    try {
      setLoading(true);
      setIsSearching(true);
      const results = await communityService.searchDiscussions(searchQuery);
      setDiscussions(results);
      setHasMore(false);
      setError(null);
    } catch (err) {
      // Handle rate limiting errors specifically
      if (err.response?.status === 429 || err.message.includes('Rate limit')) {
        const retryAfter = err.response?.data?.retryAfter || '15 minutes';
        setError(`Rate limit exceeded. Please wait ${retryAfter} before trying again.`);
      } else {
        setError(err.message || 'Search failed. Please try again later.');
      }
      console.error('Error searching discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    loadDiscussions();
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      const data = await communityService.getDiscussions(
        nextPage,
        10,
        sortBy,
        selectedCategory,
        selectedTag
      );
      setDiscussions([...discussions, ...data.discussions]);
      setCurrentPage(nextPage);
      // Calculate hasMore based on currentPage and totalPages
      setHasMore(data.currentPage < data.totalPages);
    } catch (err) {
      // Handle rate limiting errors specifically
      if (err.response?.status === 429 || err.message.includes('Rate limit')) {
        const retryAfter = err.response?.data?.retryAfter || '15 minutes';
        setError(`Rate limit exceeded. Please wait ${retryAfter} before trying again.`);
      } else {
        setError('Failed to load more discussions. Please try again later.');
      }
      console.error('Error loading more discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscussionCreated = (newDiscussion) => {
    setDiscussions([newDiscussion, ...discussions]);
  };

  const handleDiscussionDeleted = (deletedDiscussionId) => {
    // Remove the deleted discussion from the list
    setDiscussions(prevDiscussions => 
      prevDiscussions.filter(discussion => 
        discussion._id !== deletedDiscussionId && discussion.id !== deletedDiscussionId
      )
    );
    
    // Update stats
    setStats(prevStats => ({
      ...prevStats,
      totalDiscussions: Math.max(0, (prevStats?.totalDiscussions || 0) - 1),
      recentActivity: [
        {
          icon: (
            <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ),
          description: 'Discussion deleted',
          time: 'Just now'
        },
        ...(prevStats?.recentActivity || []).slice(0, 4)
      ]
    }));
  };

  const handleVote = async (discussionId, voteType) => {
    try {
      if (!user) {
        toast.error('Please log in to vote');
        navigate('/login', { state: { from: '/community' } });
        return;
      }

      const response = await communityService.likeDiscussion(discussionId, voteType);
      
      // Update the discussions list with the new vote count
      setDiscussions(prevDiscussions => 
        prevDiscussions.map(discussion => {
          const currentDiscussionId = discussion.id || discussion._id;
          return currentDiscussionId === discussionId 
            ? { 
                ...discussion, 
                likes: response.likes,
                userVote: response.userVote 
              }
            : discussion;
        })
      );
    } catch (error) {
      console.error('Error liking discussion:', error);
      if (error.response?.status === 401) {
        toast.error('Please log in to vote');
        navigate('/login', { state: { from: '/community' } });
      } else {
        toast.error('Failed to update vote. Please try again.');
      }
    }
  };

  if (loading && !discussions.length) {
    return <CommunityPageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1114] text-white p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1114] text-white">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 sm:py-8">
        {/* Header with Search, Filters and Tabs */}
        <div className="flex flex-col space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">Community</h1>
            <div className="flex items-center gap-2">
              {/* Debug buttons for development */}
              {import.meta.env.DEV && (
                <>
                  <button
                    onClick={debugCommunityAPI}
                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors"
                  >
                    Debug API
                  </button>
                  <button
                    onClick={testCommunityService}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                  >
                    Test Service
                  </button>
                </>
              )}
              {user && (
                <CreateDiscussion onDiscussionCreated={handleDiscussionCreated} />
              )}
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="w-full lg:w-1/2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search discussions..."
                  className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-10 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>
            </form>

            {/* Filter Options */}
            <div className="w-full lg:w-auto">
              <DiscussionFilters
                sortBy={sortBy}
                onSortChange={setSortBy}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedTag={selectedTag}
                onTagChange={setSelectedTag}
                categories={categories}
                topTags={topTags}
                onClearFilters={() => {
                  setSelectedCategory('');
                  setSelectedTag('');
                }}
              />
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 w-full lg:w-auto">
              <button
                onClick={() => {
                  setActiveTab('discussions');
                  if (isSearching) {
                    handleClearSearch();
                  }
                }}
                className={`px-4 py-2 rounded-full whitespace-nowrap flex-1 lg:flex-none transition-colors ${
                  activeTab === 'discussions'
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Discussions
              </button>
              <button
                onClick={() => {
                  setActiveTab('trending');
                  if (isSearching) {
                    handleClearSearch();
                  }
                }}
                className={`px-4 py-2 rounded-full whitespace-nowrap flex-1 lg:flex-none transition-colors ${
                  activeTab === 'trending'
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Trending
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
          {/* Left Column - Discussions List */}
          <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
            {loading ? (
              <DiscussionCardSkeleton count={3} />
            ) : error ? (
              <div className="text-red-500 text-center p-4 bg-white/5 rounded-lg">Error: {error}</div>
            ) : discussions.length === 0 ? (
              <div className="text-center p-8 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-white/70">No discussions found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {discussions.map((discussion) => (
                  <DiscussionCard
                    key={discussion.id || discussion._id}
                    discussion={discussion}
                    onUpdate={(updatedDiscussion) => {
                      if (updatedDiscussion === null) {
                        // Discussion was deleted
                        handleDiscussionDeleted(discussion._id || discussion.id);
                      } else {
                        // Discussion was updated, reload to get latest data
                        loadDiscussions();
                      }
                    }}
                  />
                ))}
                {hasMore && !isSearching && (
                  <>
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                    {loading && <DiscussionCardSkeleton count={2} />}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Stats and Trending */}
          <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
            {/* Minimalist Stats View */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 sm:p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Community Overview</h2>
                <button
                  onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {isStatsExpanded ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                  <p className="text-sm text-white/60">Total Discussions</p>
                  <p className="text-2xl font-bold text-white">{stats?.totalDiscussions || 0}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                  <p className="text-sm text-white/60">Active Users</p>
                  <p className="text-2xl font-bold text-white">{stats?.activeUsers || 0}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                  <p className="text-sm text-white/60">Total Comments</p>
                  <p className="text-2xl font-bold text-white">{stats?.totalComments || 0}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                  <p className="text-sm text-white/60">Avg. Engagement</p>
                  <p className="text-2xl font-bold text-white">{stats?.averageEngagement || 0}%</p>
                </div>
              </div>
            </div>

            {/* Expanded Stats Panel */}
            <AnimatePresence>
              {isStatsExpanded && (
                <motion.div
                  ref={statsPanelRef}
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed top-[40px] bottom-0 right-0 w-[400px] bg-[#0f1114] border-l border-white/10 h-full shadow-xl z-50 overflow-y-auto"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-white">Community Stats</h2>
                      <button
                        onClick={() => setIsStatsExpanded(false)}
                        className="text-white/60 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                          <p className="text-sm text-white/60">Total Discussions</p>
                          <p className="text-2xl font-bold text-white">{stats?.totalDiscussions || 0}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                          <p className="text-sm text-white/60">Active Users</p>
                          <p className="text-2xl font-bold text-white">{stats?.activeUsers || 0}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                          <p className="text-sm text-white/60">Total Comments</p>
                          <p className="text-2xl font-bold text-white">{stats?.totalComments || 0}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                          <p className="text-sm text-white/60">Avg. Engagement</p>
                          <p className="text-2xl font-bold text-white">{stats?.averageEngagement || 0}%</p>
                        </div>
                      </div>

                      {/* Top Categories */}
                      <div className="bg-white/5 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Top Categories</h3>
                        <div className="space-y-3">
                          {stats?.topCategories?.map((category) => (
                            <div key={`category-${category._id || category.name}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/10 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-white/60 w-6">{category._id || category.name}</span>
                                <span className="text-white">{category.name}</span>
                              </div>
                              <span className="text-sm text-white/60">{category.count} posts</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="bg-white/5 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                        <div className="space-y-4">
                          {stats?.recentActivity?.map((activity) => (
                            <div key={`activity-${activity.description}-${activity.time}`} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors">
                              <div className="mt-1 text-white/90">
                                {activity.icon}
                              </div>
                              <div>
                                <p className="text-sm text-white">{activity.description}</p>
                                <p className="text-xs text-white/50 mt-1">{activity.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Backdrop for expanded panel */}
            {isStatsExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-x-0 top-0 bg-black/80 z-40"
                onClick={() => setIsStatsExpanded(false)}
              />
            )}

            {/* Trending Topics */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 sm:p-4">
              <h2 className="text-lg font-semibold text-white mb-4">Trending Topics</h2>
              <div className="space-y-3">
                {topTags.map((tag) => (
                  <div
                    key={tag.name}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => setSelectedTag(tag.name)}
                  >
                    <span className="text-sm text-white">#{tag.name}</span>
                    <span className="text-xs text-white/60">{tag.count} posts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage; 