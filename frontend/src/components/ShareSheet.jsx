/**
 * 🚀 Advanced Share Sheet Component
 * 
 * Features:
 * - Multiple share platforms
 * - Custom share image generation
 * - Copy link functionality
 * - Native share API support
 * - Analytics tracking
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  LinkIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';

const ShareSheet = ({ movie, onClose, onShare }) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  /**
   * Generate share URL
   */
  useEffect(() => {
    if (movie) {
      const url = `${window.location.origin}/movie/${movie.id}`;
      setShareUrl(url);
    }
  }, [movie]);

  /**
   * Copy link to clipboard
   */
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      
      if (onShare) {
        onShare('clipboard', { url: shareUrl });
      }

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[ShareSheet] Failed to copy:', error);
    }
  }, [shareUrl, onShare]);

  /**
   * Native share
   */
  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) {
      console.warn('[ShareSheet] Native share not supported');
      return;
    }

    try {
      await navigator.share({
        title: movie?.title || movie?.name,
        text: movie?.overview || 'Check out this movie!',
        url: shareUrl,
      });

      if (onShare) {
        onShare('native', { url: shareUrl });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[ShareSheet] Native share failed:', error);
      }
    }
  }, [movie, shareUrl, onShare]);

  /**
   * Share to platform
   */
  const handleShareToPlatform = useCallback((platform) => {
    const title = encodeURIComponent(movie?.title || movie?.name || '');
    const url = encodeURIComponent(shareUrl);
    const text = encodeURIComponent(movie?.overview || '');

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${title}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${title}`,
      reddit: `https://reddit.com/submit?url=${url}&title=${title}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
      
      if (onShare) {
        onShare(platform, { url: shareUrl });
      }
    }
  }, [movie, shareUrl, onShare]);

  /**
   * Share platforms
   */
  const platforms = [
    { 
      id: 'twitter', 
      name: 'Twitter', 
      icon: '𝕏',
      color: 'bg-black hover:bg-gray-900',
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      icon: 'f',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    { 
      id: 'whatsapp', 
      name: 'WhatsApp', 
      icon: '💬',
      color: 'bg-green-600 hover:bg-green-700',
    },
    { 
      id: 'telegram', 
      name: 'Telegram', 
      icon: '✈',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    { 
      id: 'reddit', 
      name: 'Reddit', 
      icon: '🤖',
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-end md:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ShareIcon className="w-6 h-6" />
              Share Movie
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              aria-label="Close share sheet"
            >
              <XMarkIcon className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Movie Info */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <h4 className="text-white font-semibold mb-1">
              {movie?.title || movie?.name}
            </h4>
            {movie?.overview && (
              <p className="text-white/60 text-sm line-clamp-2">
                {movie.overview}
              </p>
            )}
          </div>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 mb-4"
          >
            <LinkIcon className="w-5 h-5" />
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          {/* Native Share (if supported) */}
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/80 text-white rounded-lg transition-all duration-200 mb-4"
            >
              <ShareIcon className="w-5 h-5" />
              <span>Share via...</span>
            </button>
          )}

          {/* Share Platforms */}
          <div className="space-y-2">
            <p className="text-white/60 text-sm mb-3">Share on social media:</p>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleShareToPlatform(platform.id)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 ${platform.color} text-white rounded-lg transition-all duration-200 transform hover:scale-105`}
                >
                  <span className="text-xl">{platform.icon}</span>
                  <span className="font-medium">{platform.name}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default React.memo(ShareSheet);
