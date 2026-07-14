import { useState, useRef, useEffect } from 'react';
import { ChevronDown, MoreHorizontal, FileText, Trash2 } from 'lucide-react';
import { NoteGroup, Note, List } from './listsTypes';
import { NoteItem } from './NoteItem';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { useDroppable } from '@dnd-kit/core';

interface NoteGroupViewProps {
  group: { id: string; listId: string; name: string };
  notes: Note[];
  allLists: List[];
  isUngrouped?: boolean;
  onRenameGroup: (id: string, newName: string) => void;
  onDeleteGroup: (id: string) => void;
  onNoteClick: (note: Note) => void;
  onPinNote: (note: Note) => void;
  onDuplicateNote: (note: Note) => void;
  onDeleteNote: (note: Note) => void;
  onMoveNote: (note: Note, targetListId: string) => void;
}

export function NoteGroupView({ group, notes, allLists, isUngrouped, onRenameGroup, onDeleteGroup, onNoteClick, onPinNote, onDuplicateNote, onDeleteNote, onMoveNote }: NoteGroupViewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef } = useDroppable({
    id: group.id,
    data: { type: 'group' }
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSaveRename = () => {
    if (editName.trim()) {
      onRenameGroup(group.id, editName.trim());
    } else {
      setEditName(group.name);
    }
    setIsEditing(false);
  };

  return (
    <div className="note-group">
      <div className="note-group-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <ChevronDown size={14} style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s', marginRight: '4px' }} />
        
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveRename();
              if (e.key === 'Escape') {
                setEditName(group.name);
                setIsEditing(false);
              }
            }}
            onClick={e => e.stopPropagation()}
            style={{ fontSize: '14px', fontWeight: 600, border: 'none', background: 'var(--bg-secondary)', outline: 'none', borderRadius: '4px', padding: '0 4px', color: 'var(--text-strong)' }}
          />
        ) : (
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-strong)' }}>{group.name}</span>
        )}
        
        <div className="note-group-actions-container" onClick={e => e.stopPropagation()} ref={menuRef}>
          <span className="note-group-count">{notes.length}</span>
          {!isUngrouped && (
            <>
              <div 
                className={`note-group-more-action ${menuOpen ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
              >
                <MoreHorizontal size={16} />
              </div>
              {menuOpen && (
                <div className="lists-dropdown-menu" style={{ right: 0, top: '100%', marginTop: '4px' }}>
                  <div className="lists-dropdown-item" onClick={(e) => { e.stopPropagation(); setIsEditing(true); setMenuOpen(false); }}>重命名</div>
                  <div 
                    className="lists-dropdown-item text-danger" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setMenuOpen(false);
                      onDeleteGroup(group.id);
                    }}
                  >
                    <Trash2 size={14} style={{ marginRight: '4px' }} /> 删除
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div ref={setNodeRef} className="note-group-content" style={{ minHeight: '10px' }}>
          {notes.length === 0 ? (
            <div style={{ padding: '8px 24px', fontSize: '13px', color: 'var(--text-faint)' }}>暂无笔记</div>
          ) : (
            <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
              {notes.map(note => (
                <SortableItem key={note.id} id={note.id}>
                  <NoteItem 
                    note={note}
                    allLists={allLists}
                    onClick={() => onNoteClick(note)}
                    onPin={onPinNote}
                    onDuplicate={onDuplicateNote}
                    onDelete={onDeleteNote}
                    onMove={onMoveNote}
                  />
                </SortableItem>
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
