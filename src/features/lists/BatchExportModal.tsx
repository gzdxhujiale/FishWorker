import { useState } from 'react';
import { Note } from './listsTypes';
import { X } from 'lucide-react';

interface BatchExportModalProps {
  notes: Note[];
  onExport: (selectedNoteIds: string[]) => void;
  onClose: () => void;
}

export function BatchExportModal({ notes, onExport, onClose }: BatchExportModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(notes.map(n => n.id)));

  const handleToggleSelectAll = () => {
    if (selectedIds.size === notes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notes.map(n => n.id)));
    }
  };

  const handleToggleNote = (noteId: string) => {
    const next = new Set(selectedIds);
    if (next.has(noteId)) {
      next.delete(noteId);
    } else {
      next.add(noteId);
    }
    setSelectedIds(next);
  };

  const handleConfirm = () => {
    if (selectedIds.size === 0) {
      alert('请至少选择一条笔记进行导出。');
      return;
    }
    onExport(Array.from(selectedIds));
  };

  const allSelected = selectedIds.size === notes.length && notes.length > 0;

  return (
    <div 
      className="list-modal-overlay" 
      style={{ zIndex: 100 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="list-modal-content" style={{ width: '500px', maxWidth: '90vw' }}>
        <div className="list-modal-header" style={{ padding: '24px 32px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>批量导出笔记</h2>
          <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
        </div>

        <div className="list-modal-body" style={{ padding: '0 32px 24px', overflowY: 'auto', maxHeight: '50vh' }}>
          {notes.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              当前清单暂无笔记。
            </div>
          ) : (
            <>
              <label 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '12px 16px', 
                  borderBottom: '1px solid var(--border-color)', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  userSelect: 'none'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  onChange={handleToggleSelectAll} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                全选 ({notes.length})
              </label>

              <div style={{ marginTop: '8px' }}>
                {notes.map(note => {
                  const isChecked = selectedIds.has(note.id);
                  return (
                    <label 
                      key={note.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '10px 16px', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background 0.2s',
                      }}
                      className="batch-export-item"
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => handleToggleNote(note.id)} 
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        color: 'var(--text-color)',
                        fontSize: '14px'
                      }}>
                        {note.title || '未命名笔记'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="list-modal-footer" style={{ padding: '16px 32px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)' }}>
          <button className="list-btn secondary" onClick={onClose}>取消</button>
          <button 
            className="list-btn primary" 
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || notes.length === 0}
            style={{ opacity: (selectedIds.size === 0 || notes.length === 0) ? 0.6 : 1 }}
          >
            导出选中的笔记 ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}
