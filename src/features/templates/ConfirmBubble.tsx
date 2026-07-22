import React, { useEffect, useRef } from 'react';

interface ConfirmBubbleProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const ConfirmBubble: React.FC<ConfirmBubbleProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel]);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: '8px',
            background: 'var(--surface-2, #ffffff)',
            border: '1px solid var(--line-soft, rgba(123, 145, 169, 0.2))',
            borderRadius: '8px',
            padding: '12px 14px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            zIndex: 100,
            whiteSpace: 'nowrap',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-strong, #1f2937)', fontWeight: 500 }}>
            {message}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '3px 8px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid var(--line-soft)',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '3px 8px',
                fontSize: '12px',
                borderRadius: '4px',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
