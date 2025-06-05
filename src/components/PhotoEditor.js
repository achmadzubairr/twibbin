import React, { useState, useRef, useEffect, useCallback } from 'react';

const PhotoEditor = ({ 
  templateUrl, 
  userPhoto, 
  onPositionChange
}) => {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoTransform, setPhotoTransform] = useState({
    x: 0,
    y: 0,
    scale: 1
  });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState(null);
  const [lastDistance, setLastDistance] = useState(null);
  
  const containerRef = useRef(null);
  const photoRef = useRef(null);

  // Create photo preview URL
  useEffect(() => {
    if (userPhoto) {
      const url = URL.createObjectURL(userPhoto);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [userPhoto]);

  // Notify parent of changes
  useEffect(() => {
    if (onPositionChange) {
      onPositionChange({
        transform: photoTransform,
        photoPreview
      });
    }
  }, [photoTransform, photoPreview, onPositionChange]);

  // Get distance between two touches
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Touch start handler
  const handleTouchStart = (e) => {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Single touch - start dragging
      setIsDragging(true);
      setLastTouch({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      setIsDragging(false);
      const distance = getDistance(e.touches[0], e.touches[1]);
      setLastDistance(distance);
    }
  };

  // Touch move handler
  const handleTouchMove = useCallback((e) => {
    e.preventDefault();

    if (e.touches.length === 1 && isDragging && lastTouch) {
      // Single touch - drag photo
      const deltaX = e.touches[0].clientX - lastTouch.x;
      const deltaY = e.touches[0].clientY - lastTouch.y;
      
      setPhotoTransform(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastTouch({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    } else if (e.touches.length === 2 && lastDistance) {
      // Two touches - pinch zoom
      const distance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = distance / lastDistance;
      
      setPhotoTransform(prev => ({
        ...prev,
        scale: Math.max(0.5, Math.min(3, prev.scale * scaleChange))
      }));
      
      setLastDistance(distance);
    }
  }, [isDragging, lastTouch, lastDistance]);

  // Touch end handler
  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setLastTouch(null);
      setLastDistance(null);
    }
  };

  // Mouse events for desktop support
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setLastTouch({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging && lastTouch) {
      const deltaX = e.clientX - lastTouch.x;
      const deltaY = e.clientY - lastTouch.y;
      
      setPhotoTransform(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastTouch({
        x: e.clientX,
        y: e.clientY
      });
    }
  }, [isDragging, lastTouch]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setLastTouch(null);
  };

  // Wheel event for desktop zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    
    setPhotoTransform(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale * delta))
    }));
  };

  // Add global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, lastTouch, handleMouseMove, handleTouchMove]);

  // Reset photo position
  const resetPosition = () => {
    setPhotoTransform({
      x: 0,
      y: 0,
      scale: 1
    });
  };

  if (!userPhoto || !photoPreview) {
    return (
      <div className="text-center py-8 text-gray-500">
        Upload foto untuk mulai mengedit
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Photo Editor - Template with Photo Overlay */}
      <div 
        ref={containerRef}
        className="relative w-full bg-gray-50 overflow-hidden touch-none select-none"
        style={{ aspectRatio: '1/1' }}
        onTouchStart={handleTouchStart}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        {/* User Photo - Background Layer */}
        <div
          ref={photoRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 1 }}
        >
          <img
            src={photoPreview}
            alt="Your uploaded"
            className="w-full h-full object-cover"
            style={{
              transform: `translate(${photoTransform.x}px, ${photoTransform.y}px) scale(${photoTransform.scale})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            draggable={false}
          />
        </div>

        {/* Template Foreground - Over the photo */}
        <img 
          src={templateUrl} 
          alt="Template" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ zIndex: 2 }}
          crossOrigin="anonymous"
        />

        {/* Touch instruction overlay */}
        <div className="absolute top-2 left-2 right-2 text-center z-10">
          <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            👆 Drag foto • 👌 Pinch untuk zoom
          </div>
        </div>

        {/* Reset button - positioned at bottom right */}
        <button
          onClick={resetPosition}
          className="absolute bottom-3 right-3 z-10 px-3 py-2 bg-white bg-opacity-90 text-gray-700 rounded-full shadow-lg hover:bg-opacity-100 transition-all text-xs font-medium"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default PhotoEditor;