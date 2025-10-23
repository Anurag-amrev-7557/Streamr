import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { communityService } from '../../services/communityService';
import { socketService } from '../../services/socketService';
import { formatDistanceToNow } from 'date-fns';
import ReplySection from './ReplySection';
import { toast } from 'react-hot-toast';

const DiscussionCard = ({ discussion: initialDiscussion, onUpdate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [discussion, setDiscussion] = useState(initialDiscussion);
  const [isLiking, setIsLiking] = useState(false);
  const [error, setError] = useState(null);
  const [showReplies, setShowReplies] = useState(false);
  const [views, setViews] = useState(initialDiscussion.views || 0);

  useEffect(() => {
    setDiscussion(initialDiscussion);
    setViews(initialDiscussion.views || 0);
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
      console.log('Received new reply event:', data);
      if (data.discussionId === discussionId) {
        setDiscussion(prev => {
          const updatedReplies = [...(prev.replies || [])];
          if (data.reply.parentReplyId) {
            // If it's a reply to another reply, find and update the parent reply
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
            // If it's a top-level reply, add it to the main replies array
            return {
              ...prev,
              replies: [...updatedReplies, data.reply]
            };
          }
        });
      }
    };

    const handleReplyLiked = (data) => {
      console.log('Received reply liked event:', data);
      if (data.discussionId === discussionId) {
        setDiscussion(prev => {
          const updateReplyLikes = (replies) => {
            return replies.map(reply => {
              const replyId = reply.id || reply._id;
              if (replyId === data.replyId) {
                return {
                  ...reply,
                  likes: data.likes,
                  isLiked: data.isLiked,
                  likesCount: data.likes.length
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
            replies: updateReplyLikes(prev.replies || [])
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

  const handleDiscussionClick = async (e) => {
    e.preventDefault();
    const discussionId = discussion.id || discussion._id;
    if (!discussionId) {
      console.error('Discussion ID is undefined');
      return;
    }
    
    try {
      const updatedDiscussion = await communityService.getDiscussion(discussionId);
      setViews(updatedDiscussion.views);
      if (onUpdate) {
        onUpdate(updatedDiscussion);
      }
      // Navigate after updating views
      navigate(`/community/discussion/${discussionId}`);
    } catch (error) {
      console.error('Error updating views:', error);
      // Navigate even if there's an error
      navigate(`/community/discussion/${discussionId}`);
    }
  };

  const handleLike = async () => {
    if (!user) {
      setError('Please login to like discussions');
      return;
    }
    
    const discussionId = discussion.id || discussion._id;
    if (!discussionId) {
      setError('Discussion ID is undefined');
      return;
    }
    
    setIsLiking(true);
    setError(null);
    
    try {
      const updatedDiscussion = await communityService.likeDiscussion(discussionId);
      setDiscussion(prev => ({
        ...prev,
        likes: updatedDiscussion.likes,
        isLiked: updatedDiscussion.isLiked
      }));
      // Emit socket event for real-time updates
      socketService.emitDiscussionLike({
        discussionId: discussionId,
        likes: updatedDiscussion.likes,
        isLiked: updatedDiscussion.isLiked
      });
    } catch (error) {
      console.error('Error liking discussion:', error);
      setError('Failed to like discussion. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const discussionId = discussion.id || discussion._id;
    if (!discussionId) {
      console.error('Discussion ID is undefined');
      return;
    }
    
    try {
      await navigator.share({
        title: discussion.title,
        text: discussion.content.substring(0, 100) + '...',
        url: window.location.origin + `/community/discussion/${discussionId}`
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReplyAdded = (updatedDiscussion) => {
    if (onUpdate) {
      onUpdate(updatedDiscussion);
    }
  };

  const handleDelete = async () => {
    const discussionId = discussion.id || discussion._id;
    if (!discussionId) {
      toast.error('Discussion ID is undefined');
      return;
    }
    
    if (!user) {
      toast.error('Please log in to delete discussions');
      navigate('/login', { state: { from: `/community/discussion/${discussionId}` } });
      return;
    }

    // Check if user is the author
    if (discussion.author._id !== user.id) {
      toast.error('You can only delete your own discussions');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this discussion? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      await communityService.deleteDiscussion(discussionId);
      toast.success('Discussion deleted successfully');
      // Remove the discussion from the list by calling onUpdate with null
      if (onUpdate) {
        onUpdate(null);
      }
    } catch (error) {
      console.error('Error deleting discussion:', error);
      if (error.response?.status === 403) {
        toast.error('You are not authorized to delete this discussion');
      } else if (error.response?.status === 404) {
        toast.error('Discussion not found');
      } else {
        toast.error('Failed to delete discussion. Please try again.');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-all duration-200"
      role="article"
      aria-labelledby={`discussion-title-${discussion.id || discussion._id}`}
    >
      {error && (
        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={discussion.author.avatar || '/default-avatar.png'}
            alt={`${discussion.author.username}'s avatar`}
            className="w-10 h-10 rounded-full"
            loading="lazy"
          />
          <div>
            <Link
              to={`/profile/${discussion.author._id}`}
              className="text-white font-medium hover:text-white/80 transition-colors"
              aria-label={`View ${discussion.author.username}'s profile`}
            >
              {discussion.author.username}
            </Link>
            <p className="text-white/40 text-sm" title={new Date(discussion.createdAt).toLocaleString()}>
              {formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`p-2 rounded-lg transition-all duration-200 ${
              discussion.isLiked
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            aria-label={discussion.isLiked ? 'Unlike discussion' : 'Like discussion'}
          >
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill={discussion.isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              whileTap={{ scale: 0.9 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </motion.svg>
          </button>
          <span className="text-white/60 text-sm" aria-label={`${discussion.likes.length} likes`}>
            {discussion.likes.length}
          </span>
          <button
            onClick={handleShare}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
            aria-label="Share discussion"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
          
          {/* Delete button - only show if user is the author */}
          {user && discussion.author._id === user.id && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
              aria-label="Delete discussion"
              title="Delete discussion"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <Link 
        to={`/community/discussion/${discussion.id || discussion._id}`}
        className="block group"
        onClick={handleDiscussionClick}
      >
        <h3 
          id={`discussion-title-${discussion.id || discussion._id}`}
          className="text-xl font-semibold mb-2 group-hover:text-white/80 transition-colors"
        >
          {discussion.title}
        </h3>
      </Link>

      <p className="text-white/60 mb-4 line-clamp-3">{discussion.content}</p>

      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {discussion.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-white/10 rounded-full text-sm text-white/80 hover:bg-white/20 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm text-white/40">
          <span aria-label={`${views} views`}>
            {views} views
          </span>
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 hover:text-white/60 transition-colors"
            aria-label={`${discussion.replies.length} replies`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {discussion.replies.length} replies
          </button>
        </div>
      </div>

      {showReplies && (
        <ReplySection
          discussionId={discussion.id || discussion._id}
          replies={discussion.replies}
          onReplyAdded={handleReplyAdded}
        />
      )}
    </motion.div>
  );
};

export default DiscussionCard; 