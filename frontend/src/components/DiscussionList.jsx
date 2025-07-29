import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';

const DiscussionList = () => {
  const { addListener, isConnected } = useSocket();
  const [discussions, setDiscussions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isConnected) {
      setError('Socket connection not available');
      return;
    }

    setError(null);
    
    // Add listeners and get cleanup functions
    const cleanupNew = addListener('discussion:new', (discussion) => {
      setDiscussions(prev => [...prev, discussion]);
    });

    const cleanupLiked = addListener('discussion:liked', (data) => {
      setDiscussions(prev => 
        prev.map(disc => 
          disc.id === data.discussionId 
            ? { ...disc, likes: data.likes }
            : disc
        )
      );
    });

    const cleanupUpdated = addListener('discussion:updated', (data) => {
      setDiscussions(prev => 
        prev.map(disc => 
          disc.id === data.id 
            ? { ...disc, ...data }
            : disc
        )
      );
    });

    // Cleanup listeners when component unmounts
    return () => {
      cleanupNew();
      cleanupLiked();
      cleanupUpdated();
    };
  }, [addListener, isConnected]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div>
      {discussions.map(discussion => (
        <div key={discussion.id}>
          <h3>{discussion.title}</h3>
          <p>{discussion.content}</p>
          <span>Likes: {discussion.likes}</span>
        </div>
      ))}
    </div>
  );
};

export default DiscussionList; 