import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleGroupProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsibleGroup({ title, count, children, defaultExpanded = true }: CollapsibleGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (count === 0) return null;

  return (
    <div className="tm-collapsible-group">
      <div
        className="tm-collapsible-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '12px' }}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontWeight: 500 }}>{title}</span>
        <span style={{ background: 'rgba(123, 145, 169, 0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>{count}</span>
      </div>
      {isExpanded && (
        <div className="tm-collapsible-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px', marginTop: '-6px' }}>
          {children}
        </div>
      )}
    </div>
  );
}
