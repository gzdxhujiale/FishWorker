import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { Note } from './listsTypes';
import { MoreHorizontal } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

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

export function NoteDrawer({ note, isOpen, onClose, onUpdate, onPin, onDuplicate, onSaveAsTemplate, onDelete, onOpenTemplate, showToast }: NoteDrawerProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content: note?.content || '',
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  // Sync state and editor content when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      if (editor && editor.getHTML() !== note.content) {
        editor.commands.setContent(note.content || '');
      }
    }
  }, [note, editor]);

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

  const isContentEmpty = !content || content === '<p></p>' || content === '<p></p>\n';

  const handleImport = async () => {
    try {
      const mdContent = await invoke<string>('pick_markdown_file');
      if (editor) {
        editor.commands.setContent(mdContent);
      }
      if (showToast) showToast('导入成功！');
    } catch (err) {
      console.warn('Import cancelled or failed:', err);
    }
  };

  const handleExport = async () => {
    if (!editor) return;
    const markdown = (editor.storage as any).markdown.getMarkdown();
    try {
      await invoke('save_markdown_file', {
        defaultName: `${title || '未命名笔记'}.md`,
        content: markdown,
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
          {isContentEmpty && (
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
          <EditorContent
            editor={editor}
            className="note-drawer-editor-container"
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
      </div>
    </>
  );
}
