import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Flag, Send } from 'lucide-react';
import { QuadrantType } from '../timeManagementTypes';

interface QuickAddPopoverProps {
  quadrant: QuadrantType;
  onAdd: (title: string, quadrant: QuadrantType, deadline?: number) => void;
  onClose: () => void;
  triggerRef: React.RefObject<any>;
}

export function QuickAddPopover({ quadrant, onAdd, onClose, triggerRef }: QuickAddPopoverProps) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState<string>('');
  
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) && triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim(), quadrant, deadline ? new Date(deadline).getTime() : undefined);
      setTitle('');
      setDeadline('');
      onClose();
    }
  };

  // Calculate position simply below trigger
  const top = triggerRef.current ? triggerRef.current.getBoundingClientRect().bottom + 8 : 0;
  const left = triggerRef.current ? triggerRef.current.getBoundingClientRect().right - 280 : 0; 

  return (
    <div 
      ref={popoverRef}
      className="tm-quick-add-popover" 
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: '280px',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        border: '1px solid rgba(123, 145, 169, 0.15)',
        zIndex: 100,
        padding: '12px'
      }}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          autoFocus
          type="text"
          placeholder="准备做什么？"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            color: 'var(--text-strong)',
            width: '100%'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line-soft)', paddingTop: '8px', marginTop: '4px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '12px' }}>
              <Calendar size={14} />
              <input 
                type="date" 
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={{ border: 'none', outline: 'none', color: 'var(--text-muted)', fontSize: '12px', background: 'transparent' }}
              />
            </label>
            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 0 }}>
              <Flag size={14} />
            </button>
          </div>
          <button type="submit" disabled={!title.trim()} style={{ background: title.trim() ? 'var(--accent)' : 'var(--surface-3)', color: title.trim() ? '#fff' : 'var(--text-faint)', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: title.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            添加 <Send size={12} />
          </button>
        </div>
      </form>
    </div>
  );
}
