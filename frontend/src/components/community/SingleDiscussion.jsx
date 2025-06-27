import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { communityService } from '../../services/communityService';
import { socketService } from '../../services/socketService';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import ReplySection from './ReplySection';

const SingleDiscussion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [discussion, setDiscussion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDiscussion();
    
    // Set up socket listeners
    socketService.connect();
    
    const handleNewReply = (data) => {
      if (data.discussionId === id) {
        loadDiscussion(); // Reload discussion to get updated data
      }
    };

    const handleDiscussionLiked = (data) => {
      if (data.discussionId === id) {
        setDiscussion(prev => ({
          ...prev,
          likes: data.likes,
          isLiked: data.isLiked
        }));
      }
    };

    const handleReplyLiked = (data) => {
      if (data.discussionId === id) {
        loadDiscussion(); // Reload discussion to get updated reply data
      }
    };

    // Add socket listeners
    socketService.addListener('reply:new', handleNewReply);
    socketService.addListener('discussion:liked', handleDiscussionLiked);
    socketService.addListener('reply:liked', handleReplyLiked);

    // Cleanup
    return () => {
      socketService.removeListener('reply:new', handleNewReply);
      socketService.removeListener('discussion:liked', handleDiscussionLiked);
      socketService.removeListener('reply:liked', handleReplyLiked);
    };
  }, [id]);

  const loadDiscussion = async () => {
    try {
      setLoading(true);
      const data = await communityService.getDiscussion(id);
      setDiscussion(data);
      setError(null);
    } catch (err) {
      setError('Failed to load discussion. Please try again later.');
      console.error('Error loading discussion:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please log in to like discussions');
      navigate('/login', { state: { from: `/community/discussion/${id}` } });
      return;
    }

    try {
      const updatedDiscussion = await communityService.likeDiscussion(id);
      setDiscussion(updatedDiscussion);
      
      // Emit socket event for real-time updates using the correct method
      socketService.emitDiscussionLike({
        discussionId: id,
        likes: updatedDiscussion.likes,
        isLiked: updatedDiscussion.isLiked
      });
    } catch (error) {
      console.error('Error liking discussion:', error);
      if (error.response?.status === 401) {
        toast.error('Please log in to like');
        navigate('/login', { state: { from: `/community/discussion/${id}` } });
      } else {
        toast.error('Failed to update like. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1114] text-white p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded w-1/4"></div>
          <div className="h-32 bg-white/10 rounded"></div>
          <div className="h-32 bg-white/10 rounded"></div>
        </div>
      </div>
    );
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

  if (!discussion) {
    return (
      <div className="min-h-screen bg-[#0f1114] text-white p-8">
        <div className="text-center text-white/60">
          Discussion not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1114] text-white p-3 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">{discussion.title}</h1>
          <div className="flex items-center gap-4 mb-4">
            <img
              src={discussion.author.profilePicture || '/default-avatar.png'}
              alt={discussion.author.username}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-medium">{discussion.author.username}</p>
              <p className="text-sm text-white/60">
                {formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="prose prose-invert max-w-none mb-6">
            {discussion.content}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                discussion.isLiked
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill={discussion.isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>{discussion.likes.length}</span>
            </button>
            <div className="text-sm text-white/60">
              {discussion.views} views
            </div>
          </div>
        </div>

        <ReplySection
          discussionId={id}
          replies={discussion.replies}
          onReplyAdded={loadDiscussion}
        />
      </div>
    </div>
  );
};

export default SingleDiscussion; 