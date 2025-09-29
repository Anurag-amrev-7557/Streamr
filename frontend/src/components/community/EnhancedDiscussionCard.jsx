import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { communityService } from '../../services/communityService';
import { socketService } from '../../services/socketService';
import { formatDistanceToNow } from 'date-fns';
import UserProfileCard from './UserProfileCard';
import ReplySection from './ReplySection';
import { toast } from 'react-hot-toast';

const EnhancedDiscussionCard = ({ discussion: initialDiscussion, onUpdate, onBookmark, onFollow }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [discussion, setDiscussion] = useState(initialDiscussion);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState(null);
  const [showReplies, setShowReplies] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [views, setViews] = useState(initialDiscussion.views || 0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);

  useEffect(() => {
    setDiscussion(initialDiscussion);
    setViews(initialDiscussion.views || 0);
    setIsFollowing(initialDiscussion.isFollowed || false);
  }, [initialDiscussion]);

  useEffect(() => {
    // Set up socket listeners
    socketService.connect();

    const discussionId = discussion.id || discussion._id;
    if (!discussionId) return;

    const handleDiscussionLiked = (data) => {
      if (data.discussionId === discussionId) {
        setDiscussion(prev => ({
          ...prev,
          likes: data.likes,
          isLiked: data.isLiked
        }));
      }
    };

    const handleDiscussionUpdated = (data) => {
      if (data._id === discussionId) {
        setDiscussion(prev => ({
          ...prev,
          ...data
        }));
        if (data.views) {
          setViews(data.views);
        }
      }
    };

    const handleNewReply = (data) => {
      if (data.discussionId === discussionId) {
        setDiscussion(prev => {
          const updatedReplies = [...(prev.replies || [])];
          if (data.reply.parentReplyId) {
            const updateNestedReplies = (replies) => {
              return replies.map(reply => {
                const replyId = reply.id || reply._id;
                if (replyId === data.reply.parentReplyId) {
                  return {
                    ...reply,
                    replies: [...(reply.replies || []), data.reply]
                  };
                }
                if (reply.replies) {
                  return {
                    ...reply,
                    replies: updateNestedReplies(reply.replies)
                  };
                }
                return reply;
              });
            };
            return {
              ...prev,
              replies: updateNestedReplies(updatedReplies)
            };
          } else {
            return {
              ...prev,
              replies: [...updatedReplies, data.reply]
            };
          }
        });
      }
    };

    const handleReplyLiked = (data) => {
      if (data.discussionId === discussionId) {
        setDiscussion(prev => {
          const updateReplyLikes = (replies) => {
            return replies.map(reply => {
              const replyId = reply.id || reply._id;
              if (replyId === data.replyId) {
                return {
                  ...reply,
                  likes: data.likes,
                  isLiked: data.isLiked
                };
              }
              if (reply.replies) {
                return {
                  ...reply,
                  replies: updateReplyLikes(reply.replies)
                };
              }
              return reply;
            });
          };
          return {
            ...prev,
            replies: updateReplyLikes(prev.replies)
          };
        });
      }
    };

    // Add socket listeners
    socketService.addListener('discussion:liked', handleDiscussionLiked);
    socketService.addListener('discussion:updated', handleDiscussionUpdated);
    socketService.addListener('reply:new', handleNewReply);
    socketService.addListener('reply:liked', handleReplyLiked);

    // Cleanup
    return () => {
      socketService.removeListener('discussion:liked', handleDiscussionLiked);
      socketService.removeListener('discussion:updated', handleDiscussionUpdated);
      socketService.removeListener('reply:new', handleNewReply);
      socketService.removeListener('reply:liked', handleReplyLiked);
    };
  }, [discussion.id, discussion._id]);

  const handleVote = async (voteType) => {
    try {
      if (!user) {
        toast.error('Please log in to vote');
        navigate('/login', { state: { from: '/community' } });
        return;
      }

      setIsLiking(true);
      const response = await communityService.likeDiscussion(discussion.id || discussion._id, voteType);
      
      setDiscussion(prev => ({
        ...prev,
        likes: response.likes,
        userVote: response.userVote
      }));

      toast.success(voteType === 'like' ? 'Discussion liked!' : 'Vote updated!');
    } catch (error) {
      console.error('Error liking discussion:', error);
      if (error.response?.status === 401) {
        toast.error('Please log in to vote');
        navigate('/login', { state: { from: '/community' } });
      } else {
        toast.error('Failed to update vote. Please try again.');
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    try {
      if (!user) {
        toast.error('Please log in to bookmark');
        navigate('/login', { state: { from: '/community' } });
        return;
      }

      setIsBookmarking(true);
      const response = await communityService.bookmarkDiscussion(discussion.id || discussion._id);
      
      setDiscussion(prev => ({
        ...prev,
        isBookmarked: response.isBookmarked
      }));

      if (onBookmark) {
        onBookmark(discussion.id || discussion._id, response.isBookmarked);
      }

      toast.success(response.isBookmarked ? 'Discussion bookmarked!' : 'Bookmark removed!');
    } catch (error) {
      console.error('Error bookmarking discussion:', error);
      toast.error('Failed to bookmark. Please try again.');
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (!user) {
        toast.error('Please log in to follow');
        navigate('/login', { state: { from: '/community' } });
        return;
      }

      setIsFollowing(true);
      const response = await communityService.followDiscussion(discussion.id || discussion._id);
      
      setDiscussion(prev => ({
        ...prev,
        isFollowed: response.isFollowed
      }));

      if (onFollow) {
        onFollow(discussion.id || discussion._id, response.isFollowed);
      }

      toast.success(response.isFollowed ? 'Following discussion!' : 'Unfollowed discussion!');
    } catch (error) {
      console.error('Error following discussion:', error);
      toast.error('Failed to follow. Please try again.');
    } finally {
      setIsFollowing(false);
    }
  };

  const handleShare = async (platform) => {
    try {
      setIsSharing(true);
      const url = `${window.location.origin}/community/discussion/${discussion.id || discussion._id}`;
      const title = discussion.title;
      const text = discussion.content.substring(0, 100) + '...';

      switch (platform) {
        case 'copy':
          await navigator.clipboard.writeText(url);
          toast.success('Link copied to clipboard!');
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`);
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
          break;
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
      setShowShareMenu(false);
    }
  };

  const handleReport = async (reason) => {
    try {
      if (!user) {
        toast.error('Please log in to report');
        navigate('/login', { state: { from: '/community' } });
        return;
      }

      await communityService.reportDiscussion(discussion.id || discussion._id, reason);
      toast.success('Discussion reported successfully');
      setShowReportMenu(false);
    } catch (error) {
      console.error('Error reporting discussion:', error);
      toast.error('Failed to report. Please try again.');
    }
  };

  const renderContent = () => {
    const content = discussion.content;
    const maxLength = 300;

    if (content.length <= maxLength || showFullContent) {
      return (
        <div className="prose prose-invert max-w-none">
          {content}
        </div>
      );
    }

    return (
      <div>
        <div className="prose prose-invert max-w-none">
          {content.substring(0, maxLength)}...
        </div>
        <button
          onClick={() => setShowFullContent(true)}
          className="text-blue-400 hover:text-blue-300 text-sm mt-2 transition-colors"
        >
          Read more
        </button>
      </div>
    );
  };

  const renderMedia = () => {
    if (!discussion.media || discussion.media.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {discussion.media.map((item, index) => (
          <div key={index} className="rounded-lg overflow-hidden">
            {item.type === 'image' && (
              <img
                src={item.url}
                alt={item.alt || 'Discussion media'}
                className="w-full h-auto max-h-64 object-cover"
                loading="lazy"
              />
            )}
            {item.type === 'video' && (
              <video
                src={item.url}
                controls
                className="w-full h-auto max-h-64"
                preload="metadata"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const isAuthor = user && (user.id === discussion.author?.id || user.id === discussion.author?._id);
  const canModerate = user && (user.isModerator || user.isAdmin || isAuthor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/8 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <UserProfileCard
            userId={discussion.author?.id || discussion.author?._id}
            username={discussion.author?.username}
            avatar={discussion.author?.avatar}
            profilePicture={discussion.author?.profilePicture}
            isCompact={true}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Pinned Badge */}
          {discussion.isPinned && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
              📌 Pinned
            </span>
          )}

          {/* Locked Badge */}
          {discussion.isLocked && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
              🔒 Locked
            </span>
          )}

          {/* Category Badge */}
          {discussion.category && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
              {discussion.category}
            </span>
          )}

          {/* Time */}
          <span className="text-white/40 text-sm">
            {formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Title */}
      <Link
        to={`/community/discussion/${discussion.id || discussion._id}`}
        className="block mb-3 group"
      >
        <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
          {discussion.title}
        </h3>
      </Link>

      {/* Content */}
      <div className="mb-4">
        {renderContent()}
        {renderMedia()}
      </div>

      {/* Tags */}
      {discussion.tags && discussion.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {discussion.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex items-center justify-between mb-4 p-3 bg-white/5 rounded-lg">
        <div className="flex items-center gap-6">
          {/* Views */}
          <div className="flex items-center gap-2 text-white/60">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm">{views}</span>
          </div>

          {/* Replies */}
          <div className="flex items-center gap-2 text-white/60">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm">{discussion.replies?.length || 0}</span>
          </div>

          {/* Likes */}
          <div className="flex items-center gap-2 text-white/60">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-sm">{discussion.likes || 0}</span>
          </div>
        </div>

        {/* Last Activity */}
        {discussion.lastActivity && (
          <div className="text-white/40 text-sm">
            Last activity {formatDistanceToNow(new Date(discussion.lastActivity), { addSuffix: true })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Like Button */}
          <button
            onClick={() => handleVote('like')}
            disabled={isLiking}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              discussion.isLiked
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill={discussion.isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>Like</span>
          </button>

          {/* Reply Button */}
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Reply</span>
          </button>

          {/* Bookmark Button */}
          <button
            onClick={handleBookmark}
            disabled={isBookmarking}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              discussion.isBookmarked
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill={discussion.isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span>Bookmark</span>
          </button>

          {/* Follow Button */}
          <button
            onClick={handleFollow}
            disabled={isFollowing}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              discussion.isFollowed
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{discussion.isFollowed ? 'Following' : 'Follow'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Share Button */}
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span>Share</span>
            </button>

            {/* Share Menu */}
            <AnimatePresence>
              {showShareMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute bottom-full right-0 mb-2 bg-[#1a1d21] border border-white/10 rounded-lg shadow-xl z-50 min-w-[200px]"
                >
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => handleShare('copy')}
                      className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded transition-colors"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded transition-colors"
                    >
                      Share on Twitter
                    </button>
                    <button
                      onClick={() => handleShare('facebook')}
                      className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded transition-colors"
                    >
                      Share on Facebook
                    </button>
                    <button
                      onClick={() => handleShare('linkedin')}
                      className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded transition-colors"
                    >
                      Share on LinkedIn
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* More Options */}
          <div className="relative">
            <button
              onClick={() => setShowReportMenu(!showReportMenu)}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Report Menu */}
            <AnimatePresence>
              {showReportMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute bottom-full right-0 mb-2 bg-[#1a1d21] border border-white/10 rounded-lg shadow-xl z-50 min-w-[200px]"
                >
                  <div className="p-2 space-y-1">
                    {canModerate && (
                      <>
                        <button
                          onClick={() => {
                            // Handle pin/unpin
                            setShowReportMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded transition-colors"
                        >
                          {discussion.isPinned ? 'Unpin' : 'Pin'} Discussion
                        </button>
                        <button
                          onClick={() => {
                            // Handle lock/unlock
                            setShowReportMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded transition-colors"
                        >
                          {discussion.isLocked ? 'Unlock' : 'Lock'} Discussion
                        </button>
                        <div className="border-t border-white/10 my-1"></div>
                      </>
                    )}
                    <button
                      onClick={() => handleReport('spam')}
                      className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded transition-colors"
                    >
                      Report Spam
                    </button>
                    <button
                      onClick={() => handleReport('inappropriate')}
                      className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded transition-colors"
                    >
                      Report Inappropriate
                    </button>
                    <button
                      onClick={() => handleReport('other')}
                      className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded transition-colors"
                    >
                      Report Other
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Replies Section */}
      <AnimatePresence>
        {showReplies && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            <ReplySection
              discussionId={discussion.id || discussion._id}
              replies={discussion.replies || []}
              onReplyAdded={(newReply) => {
                setDiscussion(prev => ({
                  ...prev,
                  replies: [...(prev.replies || []), newReply]
                }));
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EnhancedDiscussionCard; 