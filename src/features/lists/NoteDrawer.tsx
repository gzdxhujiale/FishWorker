import { useState, useEffect, useRef } from 'react';
import { Note } from './listsTypes';
import { MoreHorizontal } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ReactjsTiptapEditor } from '../reactjs-tiptap-v1';
import { convertMarkdownToTipTapJson, convertTipTapJsonToMarkdown } from '../tiptap/jsonMarkdownAdapter';

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
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

const checkJsonEmpty = (val?: string): boolean => {
  if (!val) return true;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '{}') return true;
  try {
    const json = JSON.parse(trimmed);
    if (!json.content || !Array.isArray(json.content) || json.content.length === 0) return true;
    if (json.content.length === 1) {
      const p = json.content[0];
      if (p.type === 'paragraph' && (!p.content || p.content.length === 0)) return true;
    }
    return false;
  } catch {
    return false;
  }
};

export function NoteDrawer({ note, isOpen, onClose, onUpdate, onPin, onDuplicate, onSaveAsTemplate, onDelete, onOpenTemplate, showToast }: NoteDrawerProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    // Prevent text selection while dragging
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

  const latestDataRef = useRef({ title, content, note });
  useEffect(() => {
    latestDataRef.current = { title, content, note };
  }, [title, content, note]);

  // Sync state when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || '');
    }
  }, [note]);

  // Save unsaved changes on note switch or drawer close
  useEffect(() => {
    return () => {
      const currentNote = latestDataRef.current.note;
      const currentTitle = latestDataRef.current.title;
      const currentContent = latestDataRef.current.content;
      if (currentNote && (currentTitle !== currentNote.title || currentContent !== currentNote.content)) {
        onUpdate(currentNote.id, currentTitle, currentContent);
      }
    };
  }, [note, isOpen, onUpdate]);

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

  const isContentEmpty = checkJsonEmpty(content);

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
        <div className="note-drawer-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <input
            type="text"
            className="note-drawer-title-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="笔记标题"
            style={{ flex: 1, marginRight: '16px' }}
          />
          <div style={{ position: 'relative', flexShrink: 0 }} ref={menuRef}>
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

        <div className="note-drawer-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 0, overflow: 'hidden', position: 'relative' }}>
          <ReactjsTiptapEditor
            initialContent={content}
            onChange={setContent}
            className="note-drawer-reactjs-tiptap"
          />
          {isContentEmpty && (
            <div style={{ position: 'absolute', top: '72px', left: '36px', color: 'var(--text-faint)', fontSize: '15px', pointerEvents: 'none', zIndex: 2 }}>
              记录你的想法，或{' '}
              <span
                style={{ pointerEvents: 'auto', color: 'var(--accent)', cursor: 'pointer' }}
                onClick={onOpenTemplate}
              >
                使用模板
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
