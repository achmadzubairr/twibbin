import React, { useState, useRef, useEffect } from 'react';
import './PhotoEditor.css';

const PhotoEditor = ({ 
  templateUrl, 
  userPhoto, 
  onPositionChange, 
  initialPosition = { x: 50, y: 50, size: 30, scale: 1 },
  currentPosition = initialPosition
}) => {
  const [position, setPosition] = useState(currentPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [photoPreview, setPhotoPreview] = useState(null);
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

  // Sync with parent position
  useEffect(() => {
    setPosition(currentPosition);
  }, [currentPosition]);

  // Notify parent component when position changes from drag only
  const notifyPositionChange = (newPosition) => {
    setPosition(newPosition);
    onPositionChange(newPosition);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const photoElement = photoRef.current;
    const photoRect = photoElement.getBoundingClientRect();
    
    // Check if click is on the photo
    if (
      e.clientX >= photoRect.left &&
      e.clientX <= photoRect.right &&
      e.clientY >= photoRect.top &&
      e.clientY <= photoRect.bottom
    ) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - rect.left - (position.x * rect.width / 100),
        y: e.clientY - rect.top - (position.y * rect.height / 100)
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newX = ((e.clientX - rect.left - dragStart.x) / rect.width) * 100;
    const newY = ((e.clientY - rect.top - dragStart.y) / rect.height) * 100;

    // Constrain to container bounds
    const constrainedX = Math.max(0, Math.min(100, newX));
    const constrainedY = Math.max(0, Math.min(100, newY));

    const newPosition = {
      ...position,
      x: constrainedX,
      y: constrainedY
    };

    notifyPositionChange(newPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };


  const resetPosition = () => {
    setPosition({ x: 50, y: 50, size: 30, scale: 1 });
  };

  // Touch events for mobile support
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const photoElement = photoRef.current;
    const photoRect = photoElement.getBoundingClientRect();
    
    if (
      touch.clientX >= photoRect.left &&
      touch.clientX <= photoRect.right &&
      touch.clientY >= photoRect.top &&
      touch.clientY <= photoRect.bottom
    ) {
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - rect.left - (position.x * rect.width / 100),
        y: touch.clientY - rect.top - (position.y * rect.height / 100)
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const newX = ((touch.clientX - rect.left - dragStart.x) / rect.width) * 100;
    const newY = ((touch.clientY - rect.top - dragStart.y) / rect.height) * 100;

    const constrainedX = Math.max(0, Math.min(100, newX));
    const constrainedY = Math.max(0, Math.min(100, newY));

    const newPosition = {
      ...position,
      x: constrainedX,
      y: constrainedY
    };

    notifyPositionChange(newPosition);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
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
  }, [isDragging, dragStart]);

  if (!userPhoto || !photoPreview) {
    return (
      <div className="text-center py-8 text-gray-500">
        Upload foto untuk mulai mengedit posisi
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Container */}
      <div 
        ref={containerRef}
        className="relative w-full bg-gray-50 overflow-hidden cursor-crosshair"
        style={{ aspectRatio: '1/1' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* User Photo - Background Layer */}
        <div
          ref={photoRef}
          className={`absolute rounded-full overflow-hidden border-2 ${isDragging ? 'border-blue-500 cursor-grabbing' : 'border-white cursor-grab'} shadow-lg`}
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            width: `${position.size}%`,
            height: `${position.size}%`,
            transform: `translate(-50%, -50%)`,
            zIndex: 1
          }}
        >
          <img
            src={photoPreview}
            alt="Your photo"
            className="w-full h-full object-cover"
            style={{
              transform: `scale(${position.scale})`,
              transformOrigin: 'center'
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

        {/* Positioning Guide */}
        {isDragging && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
            {/* Center lines */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-400 opacity-50"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-400 opacity-50"></div>
          </div>
        )}
      </div>

    </div>
  );
};

export default PhotoEditor;