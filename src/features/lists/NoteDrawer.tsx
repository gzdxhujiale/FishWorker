import { useState, useEffect, useRef } from 'react';
import { Note } from './listsTypes';
import { MoreHorizontal, Cloud } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ReactjsTiptapEditor, convertMarkdownToTipTapJson, convertTipTapJsonToMarkdown } from '../reactjs-tiptap-v1';


interface NoteDrawerProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, title: string, content: string) => void;
  onPin: (note: Note) => void;
  onDuplicate: (note: Note) => void;
  onSaveAsTemplate: (note: Note) => void;
  onDelete: (note: Note) => void;
  onOpenTemplate?: () => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}



export function NoteDrawer({ note, isOpen, onClose, onUpdate, onPin, onDuplicate, onSaveAsTemplate, onDelete, onOpenTemplate: _onOpenTemplate, showToast }: NoteDrawerProps) {
  const [drawerWidth, setDrawerWidth] = useState(600);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = drawerWidth;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const deltaX = startX.current - e.clientX;
    const newWidth = Math.min(Math.max(400, startWidth.current + deltaX), window.innerWidth - 200);
    setDrawerWidth(newWidth);
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
  };

  if (!note) return null;

  return (
    <>
      {isOpen && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 19 }}
          onClick={() => onClose()}
        />
      )}
      <div
        className={`note-drawer ${isOpen ? 'open' : ''}`}
        style={{ width: drawerWidth, right: isOpen ? 0 : -drawerWidth }}
      >
        <div
          className="drawer-resize-handle"
          onMouseDown={handleMouseDown}
        />
        <NoteDrawerContent
          key={note.id}
          note={note}
          isOpen={isOpen}
          onClose={onClose}
          onUpdate={onUpdate}
          onPin={onPin}
          onDuplicate={onDuplicate}
          onSaveAsTemplate={onSaveAsTemplate}
          onDelete={onDelete}
          showToast={showToast}
        />
      </div>
    </>
  );
}

import { useConfirmDialog } from '../../components/ui/ConfirmDeleteDialog';

function NoteDrawerContent({
  note,
  isOpen,
  onClose,
  onUpdate,
  onPin,
  onDuplicate,
  onSaveAsTemplate,
  onDelete,
  showToast,
}: {
  note: Note;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, title: string, content: string) => void;
  onPin: (note: Note) => void;
  onDuplicate: (note: Note) => void;
  onSaveAsTemplate: (note: Note) => void;
  onDelete: (note: Note) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}) {
  const { confirm: confirmDelete } = useConfirmDialog();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync external note prop changes (e.g. template selection) into local state
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || '');
    setSaveStatus('saved');
    latestDataRef.current = { title: note.title, content: note.content || '', note };
  }, [note.id, note.title, note.content]);

  const latestDataRef = useRef({ title, content, note });
  useEffect(() => {
    latestDataRef.current = { title, content, note };
  }, [title, content, note]);

  // Save unsaved changes when this note instance unmounts or drawer closes
  useEffect(() => {
    return () => {
      const currentNote = latestDataRef.current.note;
      const currentTitle = latestDataRef.current.title;
      const currentContent = latestDataRef.current.content;
      if (currentNote && (currentTitle !== currentNote.title || currentContent !== currentNote.content)) {
        onUpdate(currentNote.id, currentTitle, currentContent);
      }
    };
  }, [onUpdate]);

  // Debounced auto-save effect
  useEffect(() => {
    if (isOpen) {
      if (title !== note.title || content !== note.content) {
        setSaveStatus('saving');
        const timer = setTimeout(() => {
          onUpdate(note.id, title, content);
          setSaveStatus('saved');
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [title, content, note.id, note.title, note.content, isOpen, onUpdate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImport = async () => {
    try {
      const mdContent = await invoke<string>('pick_markdown_file');
      if (mdContent) {
        const jsonStr = convertMarkdownToTipTapJson(mdContent);
        setContent(jsonStr);
        if (showToast) showToast('导入成功！');
      }
    } catch (err) {
      console.warn('Import cancelled or failed:', err);
    }
  };

  const handleExport = async () => {
    try {
      const exportText = convertTipTapJsonToMarkdown(content);
      await invoke('save_markdown_file', {
        defaultName: `${title || '未命名笔记'}.md`,
        content: exportText,
      });
      if (showToast) showToast('导出成功！');
    } catch (err) {
      console.warn('Export cancelled or failed:', err);
    }
  };

  return (
    <>
      <div className="note-drawer-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <input
          type="text"
          className="note-drawer-title-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="笔记标题"
          style={{ flex: 1, marginRight: '16px' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span
            title={saveStatus === 'saving' ? '保存中...' : '已自动保存'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}
          >
            <Cloud
              size={18}
              style={{
                color: saveStatus === 'saved' ? '#3b82f6' : '#9ca3af',
                fill: saveStatus === 'saved' ? 'rgba(59, 130, 246, 0.18)' : 'none',
                transition: 'all 0.25s ease',
              }}
            />
          </span>
          <div style={{ position: 'relative' }} ref={menuRef}>
            <MoreHorizontal
              size={20}
              style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
              onClick={() => setMenuOpen(!menuOpen)}
            />
            {menuOpen && (
              <div className="lists-dropdown-menu" style={{ top: '100%', right: 0, marginTop: '8px' }}>
                <div className="lists-dropdown-item" onClick={() => { setMenuOpen(false); onPin(note); }}>{note.isPinned ? '取消置顶' : '置顶'}</div>
                <div className="lists-dropdown-item" onClick={() => { setMenuOpen(false); onDuplicate(note); }}>创建副本</div>
                <div className="lists-dropdown-item" onClick={() => { setMenuOpen(false); onSaveAsTemplate(note); }}>保存为模板</div>
                <div className="lists-dropdown-item" onClick={() => { setMenuOpen(false); handleImport(); }}>导入MD</div>
                <div className="lists-dropdown-item" onClick={() => { setMenuOpen(false); handleExport(); }}>导出MD</div>
                <div
                  className="lists-dropdown-item text-danger"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    const confirmed = await confirmDelete({
                      title: '删除笔记',
                      description: `确定要删除笔记"${note.title || '未命名笔记'}"吗？`,
                      confirmText: '删除',
                    });
                    if (confirmed) {
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

      <div className="note-drawer-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 0, overflow: 'hidden', position: 'relative' }}>
        <ReactjsTiptapEditor
          content={content}
          initialContent={content}
          onChange={setContent}
          enableCustomTemplates={true}
          className="note-drawer-reactjs-tiptap"
        />
      </div>
    </>
  );
}

