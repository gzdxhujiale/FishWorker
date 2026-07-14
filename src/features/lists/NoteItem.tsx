import { useState, useRef, useEffect } from 'react';
import { FileText, MoreHorizontal, ChevronRight, Search } from 'lucide-react';
import { Note, List } from './listsTypes';

interface NoteItemProps {
  note: Note;
  allLists: List[];
  onClick: () => void;
  onPin: (note: Note) => void;
  onDuplicate: (note: Note) => void;
  onDelete: (note: Note) => void;
  onMove: (note: Note, targetListId: string) => void;
}

export function NoteItem({ note, allLists, onClick, onPin, onDuplicate, onDelete, onMove }: NoteItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMoveTo, setShowMoveTo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setShowMoveTo(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const otherLists = allLists.filter(l => l.id !== note.listId && l.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="note-list-item" onClick={onClick} style={{ position: 'relative' }}>
      <FileText size={16} className="note-item-icon" />
      <div className="note-item-title">{note.title || '无标题笔记'}</div>
      {note.isPinned && <span style={{fontSize: '12px', color: 'var(--accent)', marginRight: '8px'}}>📌 置顶</span>}
      
      <div className="note-item-actions-container" onClick={e => e.stopPropagation()} ref={menuRef}>
        <div 
          className={`note-item-more-action ${menuOpen ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
            setShowMoveTo(false);
            setSearchQuery('');
          }}
        >
          <MoreHorizontal size={16} />
        </div>
        
        {menuOpen && (
          <div className="lists-dropdown-menu" style={{ right: 0, top: '100%', marginTop: '4px' }}>
            {showMoveTo ? (
              <div className="move-to-menu">
                <div style={{ display: 'flex', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--line-soft)' }}>
                  <ChevronRight 
                    size={14} 
                    style={{ transform: 'rotate(180deg)', cursor: 'pointer', marginRight: '4px' }}
                    onClick={(e) => { e.stopPropagation(); setShowMoveTo(false); }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>移动到...</span>
                </div>
                <div style={{ padding: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: '4px', padding: '4px 8px' }}>
                    <Search size={12} color="var(--text-faint)" style={{ marginRight: '4px' }} />
                    <input 
                      type="text" 
                      placeholder="搜索清单" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '100%' }}
                    />
                  </div>
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {otherLists.length === 0 ? (
                    <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>无匹配清单</div>
                  ) : (
                    otherLists.map(list => (
                      <div 
                        key={list.id}
                        className="lists-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          setShowMoveTo(false);
                          onMove(note, list.id);
                        }}
                      >
                        {list.name}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="lists-dropdown-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onPin(note); }}>{note.isPinned ? '取消置顶' : '置顶'}</div>
                <div className="lists-dropdown-item" onClick={(e) => { e.stopPropagation(); setShowMoveTo(true); }}>
                  移动到 <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
                </div>
                <div className="lists-dropdown-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(note); }}>创建副本</div>
                <div 
                  className="lists-dropdown-item text-danger" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setMenuOpen(false);
                    onDelete(note);
                  }}
                >
                  删除
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
