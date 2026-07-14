import { useState, useEffect, useRef } from 'react';
import { Note } from './listsTypes';
import { MoreHorizontal } from 'lucide-react';

interface NoteDrawerProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, title: string, content: string) => void;
  onPin: (note: Note) => void;
  onDuplicate: (note: Note) => void;
  onSaveAsTemplate: (note: Note) => void;
  onDelete: (note: Note) => void;
  onOpenTemplate: () => void;
}

export function NoteDrawer({ note, isOpen, onClose, onUpdate, onPin, onDuplicate, onSaveAsTemplate, onDelete, onOpenTemplate }: NoteDrawerProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  // Debounced auto-save effect
  useEffect(() => {
    if (note && isOpen) {
      const timer = setTimeout(() => {
        if (title !== note.title || content !== note.content) {
          onUpdate(note.id, title, content);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [title, content, note, isOpen, onUpdate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!note) return null;

  return (
    <>
      {isOpen && (
        <div 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 19 }}
          onClick={() => onClose()}
        />
      )}
      <div className={`note-drawer ${isOpen ? 'open' : ''}`}>
        <div className="note-drawer-header">
          <input 
            type="text"
            className="note-drawer-title-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="笔记标题"
          />
        </div>
        
        <div className="note-drawer-content" style={{ position: 'relative' }}>
          {content === '' && (
            <div style={{ position: 'absolute', top: '24px', left: '24px', color: 'var(--text-faint)', fontSize: '15px', pointerEvents: 'none', zIndex: 2 }}>
              记录你的想法，或{' '}
              <span 
                style={{ pointerEvents: 'auto', color: 'var(--accent)', cursor: 'pointer' }} 
                onClick={onOpenTemplate}
              >
                使用模板
              </span>
            </div>
          )}
          <textarea 
            className="note-drawer-textarea"
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ background: 'transparent', position: 'relative', zIndex: 1 }}
          />
        </div>
        
        <div className="note-drawer-footer">
          <div style={{ position: 'relative' }} ref={menuRef}>
            <MoreHorizontal 
              size={20} 
              style={{ cursor: 'pointer', color: 'var(--text-muted)' }} 
              onClick={() => setMenuOpen(!menuOpen)}
            />
            {menuOpen && (
              <div className="lists-dropdown-menu" style={{ bottom: '100%', top: 'auto', right: 0, marginBottom: '8px' }}>
                <div className="lists-dropdown-item" onClick={() => { setMenuOpen(false); onPin(note); }}>{note.isPinned ? '取消置顶' : '置顶'}</div>
                <div className="lists-dropdown-item" onClick={() => { setMenuOpen(false); onDuplicate(note); }}>创建副本</div>
                <div className="lists-dropdown-item" onClick={() => { setMenuOpen(false); onSaveAsTemplate(note); }}>保存为模板</div>
                <div 
                  className="lists-dropdown-item text-danger" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (window.confirm('确定要删除这条笔记吗？')) {
                      setMenuOpen(false);
                      onDelete(note);
                      onClose();
                    }
                  }}
                >
                  删除
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
