import React, { useState, useRef, useEffect, useCallback } from 'react';

const PhotoEditor = ({ 
  templateUrl, 
  userPhoto, 
  onPositionChange,
  onGestureStateChange
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
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const containerRef = useRef(null);
  const photoRef = useRef(null);
  const notifyTimeoutRef = useRef(null);

  // Create photo preview URL
  useEffect(() => {
    if (userPhoto) {
      const url = URL.createObjectURL(userPhoto);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [userPhoto]);

  // Only notify parent when gesture is not active
  useEffect(() => {
    if (onPositionChange && containerRef.current && !isGestureActive) {
      // Clear previous timeout
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
      }
      
      // Small delay to ensure gesture is really finished
      notifyTimeoutRef.current = setTimeout(() => {
        const containerSize = containerRef.current?.getBoundingClientRect();
        if (containerSize && !isGestureActive) {
          onPositionChange({
            transform: photoTransform,
            photoPreview,
            previewSize: {
              width: containerSize.width,
              height: containerSize.height
            }
          });
        }
      }, 200);
    }
    
    // Cleanup timeout
    return () => {
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
      }
    };
  }, [photoTransform, photoPreview, onPositionChange, isGestureActive]);

  // Get distance between two touches
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Touch start handler
  const handleTouchStart = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent elements
    setIsGestureActive(true);
    if (onGestureStateChange) onGestureStateChange(true);
    
    if (e.touches.length === 1) {
      // Single touch - start dragging
      setIsDragging(true);
      setLastTouch({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
      setLastDistance(null); // Clear distance for single touch
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      setIsDragging(false);
      setLastTouch(null); // Clear single touch
      const distance = getDistance(e.touches[0], e.touches[1]);
      setLastDistance(distance);
    }
  };

  // Touch move handler
  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent elements

    if (e.touches.length === 1 && isDragging && lastTouch && !lastDistance) {
      // Single touch - drag photo (only if not in pinch mode)
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
    } else if (e.touches.length === 2 && lastDistance !== null) {
      // Two touches - pinch zoom
      const newDistance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = newDistance / lastDistance;
      
      // Apply scale change with bounds checking
      setPhotoTransform(prev => {
        const newScale = prev.scale * scaleChange;
        const clampedScale = Math.max(0.5, Math.min(2.5, newScale)); // Reduced max zoom
        return {
          ...prev,
          scale: clampedScale
        };
      });
      
      setLastDistance(newDistance);
    }
  }, [isDragging, lastTouch, lastDistance]);

  // Touch end handler
  const handleTouchEnd = (e) => {
    e.stopPropagation(); // Prevent event bubbling to parent elements
    if (e.touches.length === 0) {
      // All touches ended
      setIsDragging(false);
      setLastTouch(null);
      setLastDistance(null);
      setIsGestureActive(false);
      if (onGestureStateChange) onGestureStateChange(false);
    } else if (e.touches.length === 1 && lastDistance !== null) {
      // Went from 2 touches to 1 touch - switch from pinch to drag
      setLastDistance(null);
      setIsDragging(true);
      setLastTouch({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  // Mouse events for desktop support
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent elements
    setIsGestureActive(true);
    if (onGestureStateChange) onGestureStateChange(true);
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
    setIsGestureActive(false);
    if (onGestureStateChange) onGestureStateChange(false);
  };

  // Wheel event for desktop zoom - only when hovering over editor
  // Mouse enter/leave handlers
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Wheel event for desktop zoom - only when hovering over editor
  const handleWheel = useCallback((e) => {
    if (!isHovered) {
      return; // Allow normal page scroll when not hovering
    }
    
    // Always prevent default when hovering over editor
    e.preventDefault();
    e.stopPropagation();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    
    setPhotoTransform(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(2.5, prev.scale * delta))
    }));
  }, [isHovered]);

  // Add wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isHovered, handleWheel]); // Re-attach when hover state changes

  // Add global event listeners for gestures
  useEffect(() => {
    // Always listen for touch events, not just when dragging
    const handleGlobalTouchMove = (e) => {
      if (isDragging || lastDistance !== null) {
        handleTouchMove(e);
      }
    };
    
    const handleGlobalTouchEnd = (e) => {
      handleTouchEnd(e);
    };

    if (isDragging || lastDistance !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [isDragging, lastDistance, lastTouch, handleMouseMove, handleTouchMove]);

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
        className={`relative w-full bg-gray-50 overflow-hidden select-none transition-colors ${isHovered ? 'bg-gray-100' : ''}`}
        style={{ 
          aspectRatio: '1/1',
          touchAction: 'none' // Prevent default browser touch behaviors
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press
        onDoubleClick={(e) => e.preventDefault()} // Prevent double-click issues
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
            👆 Drag foto • 👌 Pinch untuk zoom {isHovered && '• 🖱️ Scroll untuk zoom'}
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