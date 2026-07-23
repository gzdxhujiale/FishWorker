import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleGroupProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  titleColor?: string;
}

export function CollapsibleGroup({ title, count, children, defaultExpanded = true, titleColor }: CollapsibleGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (count === 0) return null;

  return (
    <div className="tm-collapsible-group">
      <div
        className="tm-collapsible-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0', cursor: 'pointer', color: titleColor || 'var(--text-faint)', fontSize: '12px' }}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontWeight: titleColor ? 600 : 500 }}>{title}</span>
        <span style={{ 
          background: titleColor ? `${titleColor}18` : 'rgba(123, 145, 169, 0.1)', 
          padding: '2px 8px', 
          borderRadius: '10px', 
          fontSize: '11px', 
          color: titleColor || 'var(--text-muted)',
          fontWeight: titleColor ? 600 : 400
        }}>{count}</span>
      </div>
      {isExpanded && (
        <div className="tm-collapsible-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px', marginTop: '-6px' }}>
          {children}
        </div>
      )}
    </div>
  );
}
