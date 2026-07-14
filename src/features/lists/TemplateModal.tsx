import { Template } from './listsTypes';
import { X } from 'lucide-react';

interface TemplateModalProps {
  templates: Template[];
  onSelect: (template: Template) => void;
  onClose: () => void;
}

export function TemplateModal({ templates, onSelect, onClose }: TemplateModalProps) {
  return (
    <div className="list-modal-overlay">
      <div className="list-modal-content" style={{ width: '700px', maxWidth: '95vw' }}>
        <div className="list-modal-header" style={{ padding: '24px 32px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>笔记模板</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="search-box" style={{ margin: 0, width: '200px' }}>
              <input type="text" placeholder="搜索..." />
            </div>
            <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
          </div>
        </div>
        
        <div className="list-modal-body" style={{ padding: '0 32px 24px', overflowY: 'auto', maxHeight: '60vh' }}>
          <div className="template-grid">
            {templates.map(tpl => (
              <div key={tpl.id} className="template-card" onClick={() => onSelect(tpl)}>
                <div className="template-card-title">{tpl.name}</div>
                <div className="template-card-preview">{tpl.content}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="list-modal-footer" style={{ justifyContent: 'center', borderTop: '1px solid var(--line-soft)', padding: '16px', marginTop: 'auto' }}>
          <span style={{ color: '#6366f1', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>管理模板</span>
        </div>
      </div>
    </div>
  );
}
