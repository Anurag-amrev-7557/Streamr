import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { communityService } from '../../services/communityService';
import { socketService } from '../../services/socketService';
import { formatDistanceToNow, isValid } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const formatDate = (dateString) => {
  if (!dateString) return 'Just now';
  
  const date = new Date(dateString);
  if (!isValid(date)) return 'Just now';
  
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Just now';
  }
};

const ReplySection = ({ discussionId, replies: initialReplies, onReplyAdded }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [replies, setReplies] = useState(initialReplies || []);
  const [newReply, setNewReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    setReplies(initialReplies || []);
  }, [initialReplies]);

  useEffect(() => {
    // Set up socket listeners
    socketService.connect();

    const handleNewReply = (data) => {
      console.log('ReplySection received new reply event:', data);
      if (data.discussionId === discussionId) {
        // If it's a reply to another reply, find and update the parent reply
        if (data.reply.parentReplyId) {
          setReplies(prev => 
            prev.map(reply => {
              if (reply._id === data.reply.parentReplyId) {
                return {
                  ...reply,
                  replies: [...(reply.replies || []), data.reply]
                };
              }
              if (reply.replies) {
                return {
                  ...reply,
                  replies: reply.replies.map(r => 
                    r._id === data.reply.parentReplyId
                      ? { ...r, replies: [...(r.replies || []), data.reply] }
                      : r
                  )
                };
              }
              return reply;
            })
          );
        } else {
          // If it's a top-level reply, add it to the main replies array
          setReplies(prev => [...prev, data.reply]);
        }
      }
    };

    const handleReplyLiked = (data) => {
      console.log('ReplySection received reply liked event:', data);
      if (data.discussionId === discussionId) {
        setReplies(prev => {
          const updateReplyLikes = (replies) => {
            return replies.map(reply => {
              if (reply._id === data.replyId) {
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
          return updateReplyLikes(prev);
        });
      }
    };

    // Add socket listeners
    socketService.addListener('reply:new', handleNewReply);
    socketService.addListener('reply:liked', handleReplyLiked);

    // Cleanup
    return () => {
      socketService.removeListener('reply:new', handleNewReply);
      socketService.removeListener('reply:liked', handleReplyLiked);
    };
  }, [discussionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newReply.trim() || !discussionId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const reply = await communityService.addReply(discussionId, {
        content: newReply.trim(),
        parentReplyId: replyingTo?._id
      });

      // Update local state immediately with the reply from the server
      if (replyingTo?._id) {
        setReplies(prev => 
          prev.map(r => {
            if (r._id === replyingTo._id) {
              return {
                ...r,
                replies: [...(r.replies || []), reply]
              };
            }
            if (r.replies) {
              return {
                ...r,
                replies: r.replies.map(nestedReply => 
                  nestedReply._id === replyingTo._id
                    ? { ...nestedReply, replies: [...(nestedReply.replies || []), reply] }
                    : nestedReply
                )
              };
            }
            return r;
          })
        );
      } else {
        setReplies(prev => [...prev, reply]);
      }

      setNewReply('');
      setShowReplyForm(false);
      setReplyingTo(null);
      if (onReplyAdded) {
        onReplyAdded();
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      setError('Failed to add reply. Please try again.');
      if (error.message === 'Authentication required') {
        toast.error('Please log in to reply');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (replyId) => {
    if (!user) {
      toast.error('Please log in to like replies');
      return;
    }

    try {
      const updatedReply = await communityService.likeReply(discussionId, replyId);
      // Emit socket event for real-time update
      socketService.emitReplyLike({
        discussionId,
        replyId,
        likes: updatedReply.likes,
        isLiked: updatedReply.isLiked
      });
    } catch (error) {
      console.error('Error liking reply:', error);
      toast.error('Failed to update like. Please try again.');
    }
  };

  const handleReplyClick = (reply = null) => {
    if (!user) {
      toast.error('Please log in to reply');
      navigate('/login', { state: { from: '/community' } });
      return;
    }
    setReplyingTo(reply);
    setShowReplyForm(true);
  };

  const renderReply = (reply, level = 0) => {
    return (
      <div key={reply._id} className={`ml-${level * 4} mt-4`}>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <img
                src={reply.author?.avatar || reply.author?.profilePicture || '/default-avatar.png'}
                alt={`${reply.author?.username || 'Anonymous'}'s avatar`}
                className="w-8 h-8 rounded-full"
              />
              <div>
                <span className="text-white font-medium">{reply.author?.username || 'Anonymous'}</span>
                <span className="text-white/40 text-sm ml-2">
                  {formatDate(reply.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <p className="text-white/80 mt-2">{reply.content}</p>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => handleReplyClick(reply)}
              className="text-white/60 hover:text-white text-sm flex items-center gap-1"
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
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              Reply
            </button>
          </div>
        </div>
        {reply.replies?.map((nestedReply) => renderReply(nestedReply, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Replies ({replies.length})</h2>

      {user ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Write your reply..."
            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
            rows={4}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting || !newReply.trim()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Posting...' : 'Post Reply'}
          </button>
        </form>
      ) : (
        <p className="text-white/60">Please log in to reply to this discussion.</p>
      )}

      {showReplyForm && (
        <form onSubmit={handleSubmit} className="mt-6">
          <div className="bg-white/5 rounded-lg p-4">
            {replyingTo && (
              <div className="mb-2 text-sm text-white/60">
                Replying to <span className="text-white">{replyingTo.author.username}</span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="ml-2 text-white/40 hover:text-white"
                >
                  ×
                </button>
              </div>
            )}
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Write your reply..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 min-h-[100px]"
              required
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyingTo(null);
                  setNewReply('');
                }}
                className="px-4 py-2 text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {replies.map((reply) => renderReply(reply))}
      </div>
    </div>
  );
};

export default ReplySection; 