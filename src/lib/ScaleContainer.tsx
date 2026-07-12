import React, { useState, useEffect } from 'react';

export const ScaleContainer: React.FC<{ children: React.ReactNode; width?: number; height?: number }> = ({ 
  children, 
  width = 1000, 
  height = 600 
}) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / width;
      const scaleY = window.innerHeight / height;
      setScale(Math.min(scaleX, scaleY));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [width, height]);

  return (
    <div 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: 'var(--surface-0)'
      }}
    >
      <div 
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {children}
      </div>
    </div>
  );
};
