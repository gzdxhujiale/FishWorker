import { ReactNode, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmBubbleProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function ConfirmBubble({ isOpen, message, onConfirm, onCancel, children, position = 'bottom' }: ConfirmBubbleProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && wrapperRef.current && bubbleRef.current) {
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const bubbleRect = bubbleRef.current.getBoundingClientRect();
      
      let top = 0;
      let left = 0;
      
      switch (position) {
        case 'top':
          top = wrapperRect.top - bubbleRect.height - 8;
          left = wrapperRect.left + wrapperRect.width / 2 - bubbleRect.width / 2;
          break;
        case 'bottom':
          top = wrapperRect.bottom + 8;
          left = wrapperRect.left + wrapperRect.width / 2 - bubbleRect.width / 2;
          break;
        case 'left':
          top = wrapperRect.top + wrapperRect.height / 2 - bubbleRect.height / 2;
          left = wrapperRect.left - bubbleRect.width - 8;
          break;
        case 'right':
          top = wrapperRect.top + wrapperRect.height / 2 - bubbleRect.height / 2;
          left = wrapperRect.right + 8;
          break;
      }
      
      // Ensure it doesn't go off-screen
      if (left < 10) left = 10;
      if (top < 10) top = 10;
      if (left + bubbleRect.width > window.innerWidth - 10) left = window.innerWidth - bubbleRect.width - 10;
      if (top + bubbleRect.height > window.innerHeight - 10) top = window.innerHeight - bubbleRect.height - 10;

      setCoords({ top, left });
    }
  }, [isOpen, position]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {isOpen && createPortal(
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
            onClick={(e) => { e.stopPropagation(); onCancel(); }}
          />
          <div 
            ref={bubbleRef}
            className={`confirm-bubble confirm-bubble-${position}`}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              background: '#ffffff',
              border: '1px solid var(--line-soft)',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 9999,
              width: 'max-content',
              maxWidth: '240px',
              opacity: coords.top === 0 && coords.left === 0 ? 0 : 1, // hide until positioned
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-strong)', marginBottom: '12px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
              {message}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                onClick={onCancel}
                style={{ padding: '4px 12px', border: '1px solid var(--line-soft)', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}
              >
                取消
              </button>
              <button 
                onClick={onConfirm}
                style={{ padding: '4px 12px', border: 'none', borderRadius: '4px', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '12px' }}
              >
                确认
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

