import React from 'react';
import './LoadingSpinner.css';

interface SkeletonLoaderProps {
  type?: 'text' | 'avatar' | 'button' | 'card';
  lines?: number;
  width?: 'short' | 'medium' | 'long' | string;
  height?: string;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'text', 
  lines = 1, 
  width = 'medium',
  height,
  className = ''
}) => {
  const getSkeletonClass = () => {
    const baseClass = 'skeleton';
    const typeClass = `skeleton-${type}`;
    const widthClass = typeof width === 'string' && ['short', 'medium', 'long'].includes(width) 
      ? `skeleton-text-${width}` 
      : '';
    
    return `${baseClass} ${typeClass} ${widthClass} ${className}`.trim();
  };

  const getSkeletonStyle = () => {
    const style: React.CSSProperties = {};
    
    if (height) {
      style.height = height;
    }
    
    if (typeof width === 'string' && !['short', 'medium', 'long'].includes(width)) {
      style.width = width;
    }
    
    return style;
  };

  if (type === 'text') {
    return (
      <div className="skeleton-text-container">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={getSkeletonClass()}
            style={getSkeletonStyle()}
          />
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="skeleton-card">
        <div className="skeleton skeleton-text skeleton-text-short" />
        <div className="skeleton skeleton-text skeleton-text-medium" />
        <div className="skeleton skeleton-text skeleton-text-long" />
        <div className="skeleton skeleton-text skeleton-text-medium" />
      </div>
    );
  }

  return (
    <div
      className={getSkeletonClass()}
      style={getSkeletonStyle()}
    />
  );
};

export default SkeletonLoader;
