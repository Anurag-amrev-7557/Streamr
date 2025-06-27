import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { communityService } from '../../services/communityService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = [
  'Movies',
  'TV Shows',
  'Anime',
  'Documentaries',
  'Reviews',
  'Recommendations',
  'News',
  'General'
];

const CreateDiscussion = ({ onDiscussionCreated }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please log in to create a discussion');
        setIsOpen(false);
        navigate('/login', { state: { from: '/community' } });
        return;
      }

      if (!category) {
        setError('Please select a category');
        setIsSubmitting(false);
        return;
      }

      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const discussion = await communityService.createDiscussion({
        title,
        content,
        tags: tagArray,
        category
      });

      setTitle('');
      setContent('');
      setTags('');
      setCategory('');
      setIsOpen(false);
      if (onDiscussionCreated) {
        onDiscussionCreated(discussion);
      }
    } catch (error) {
      if (error.message === 'Authentication required') {
        setError('Please log in to create a discussion');
        setIsOpen(false);
        navigate('/login', { state: { from: '/community' } });
      } else {
        setError(error.message || 'Error creating discussion');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenModal = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login', { state: { from: '/community' } });
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="fixed bottom-8 right-8 bg-white text-black px-6 py-3 rounded-full font-medium shadow-lg hover:bg-white/90 transition-all duration-200 flex items-center gap-2"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        New Discussion
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1d21] rounded-lg w-full max-w-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create Discussion</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white/80 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Enter discussion title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                    required
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white/80 mb-2">Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 min-h-[200px]"
                    placeholder="Write your discussion content..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="e.g., movies, action, 2024"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-sm">{error}</div>
                )}

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-2 text-white/60 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Discussion'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CreateDiscussion; 