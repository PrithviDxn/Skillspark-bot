import React, { useEffect, useRef } from 'react';

const TrackRenderer = ({ track, ...props }) => {
  const ref = useRef();
  useEffect(() => {
    console.log('[TrackRenderer] Attempting to attach video/audio track:', track);
    if (track) {
      console.log('[TrackRenderer] Successfully attached video/audio track:', track);
    }
  }, [track]);

  return (
    <div ref={ref}>
      {/* ... existing code ... */}
    </div>
  );
};

export default TrackRenderer; 