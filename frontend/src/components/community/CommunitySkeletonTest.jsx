import React, { useState } from 'react';
import CommunityPageSkeleton from './CommunityPageSkeleton';
import DiscussionCardSkeleton from './DiscussionCardSkeleton';

const CommunitySkeletonTest = () => {
  const [showFullSkeleton, setShowFullSkeleton] = useState(true);
  const [showCardSkeleton, setShowCardSkeleton] = useState(false);
  const [cardCount, setCardCount] = useState(3);

  return (
    <div className="min-h-screen bg-[#0f1114] text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Community Skeleton Test</h1>
        
        {/* Controls */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showFullSkeleton}
                onChange={(e) => setShowFullSkeleton(e.target.checked)}
                className="rounded"
              />
              <span>Show Full Page Skeleton</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showCardSkeleton}
                onChange={(e) => setShowCardSkeleton(e.target.checked)}
                className="rounded"
              />
              <span>Show Card Skeleton</span>
            </label>
            
            <div className="flex items-center gap-2">
              <label>Card Count:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={cardCount}
                onChange={(e) => setCardCount(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-white"
              />
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-6">
          {showFullSkeleton && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Full Page Skeleton</h2>
              <CommunityPageSkeleton />
            </div>
          )}
          
          {showCardSkeleton && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Discussion Card Skeleton ({cardCount} cards)</h2>
              <div className="space-y-4">
                <DiscussionCardSkeleton count={cardCount} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunitySkeletonTest; 