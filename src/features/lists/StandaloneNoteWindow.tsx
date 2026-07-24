import { useState, useEffect, useRef } from 'react';
import { useListsStore } from './listsStore';
import { Note } from './listsTypes';
import { MoreHorizontal, Pin, Save } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ReactjsTiptapEditor, convertMarkdownToTipTapJson, convertTipTapJsonToMarkdown } from '../reactjs-tiptap-v1';
import './lists.css';

export function StandaloneNoteWindow() {
  const store = useListsStore();
  const [noteId, setNoteId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('noteId');
    if (id) {
      setNoteId(id);
    }
  }, []);

  useEffect(() => {
    store.init();
  }, [store]);

  const note = store.data.notes.find(n => n.id === noteId) || null;

  if (!noteId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888' }}>
        未指定笔记 ID
      </div>
    );
  }

  if (!note) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888' }}>
        正在加载笔记或笔记不存在...
      </div>
    );
  }

  return <StandaloneNoteEditorContent key={note.id} note={note} />;
}

function StandaloneNoteEditorContent({ note }: { note: Note }) {
  const store = useListsStore();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const menuRef = useRef<HTMLDivElement>(null);

  // Synchronize when note prop is updated externally
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || '');
    document.title = note.title ? `${note.title} - 笔记` : '笔记编辑';
    latestDataRef.current = { title: note.title, content: note.content || '', noteId: note.id };
  }, [note.id, note.title, note.content]);

  const latestDataRef = useRef({ title, content, noteId: note.id });
  useEffect(() => {
    latestDataRef.current = { title, content, noteId: note.id };
  }, [title, content, note.id]);

  // Save changes on unmount or window close
  useEffect(() => {
    return () => {
      const currentId = latestDataRef.current.noteId;
      const currentTitle = latestDataRef.current.title;
      const currentContent = latestDataRef.current.content;
      if (currentId && (currentTitle !== note.title || currentContent !== note.content)) {
        store.updateNote(currentId, { title: currentTitle, content: currentContent });
      }
    };
  }, [store, note.title, note.content]);

  // Debounced auto-save effect
  useEffect(() => {
    if (title !== note.title || content !== note.content) {
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        store.updateNote(note.id, { title, content });
        setSaveStatus('saved');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [title, content, note.id, note.title, note.content, store]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCloseWindow = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch {
      window.close();
    }
  };

  const handlePin = () => {
    store.updateNote(note.id, { isPinned: !note.isPinned });
  };

  const handleImport = async () => {
    try {
      const mdContent = await invoke<string>('pick_markdown_file');
      if (mdContent) {
        const jsonStr = convertMarkdownToTipTapJson(mdContent);
        setContent(jsonStr);
      }
    } catch (err) {
      console.warn('Import failed:', err);
    }
  };

  const handleExport = async () => {
    try {
      const exportText = convertTipTapJsonToMarkdown(content);
      await invoke('save_markdown_file', {
        defaultName: `${title || '未命名笔记'}.md`,
        content: exportText,
      });
    } catch (err) {
      console.warn('Export failed:', err);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`确定要删除笔记"${note.title || '未命名笔记'}"吗？`)) {
      store.deleteNote(note.id);
      handleCloseWindow();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app, #ffffff)', color: 'var(--text-strong, #1f2937)' }}>
      {/* Top Header Bar */}
      <div
        data-tauri-drag-region
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid var(--line-soft, #e5e7eb)',
          background: 'var(--bg-surface, #ffffff)',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, marginRight: '16px' }} data-tauri-drag-region>
          <input
            type="text"
            className="note-drawer-title-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="笔记标题"
            style={{
              flex: 1,
              fontSize: '18px',
              fontWeight: 600,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-strong, #111827)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Save size={14} />
            {saveStatus === 'saving' ? '保存中...' : '已自动保存'}
          </span>

          <button
            type="button"
            onClick={handlePin}
            title={note.isPinned ? '取消置顶' : '置顶'}
            style={{
              border: 'none',
              background: note.isPinned ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: note.isPinned ? '#3b82f6' : 'var(--text-muted, #6b7280)',
              borderRadius: '4px',
              padding: '6px',
              cursor: 'pointer',
            }}
          >
            <Pin size={16} />
          </button>

          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              title="更多操作"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted, #6b7280)',
                borderRadius: '4px',
                padding: '6px',
                cursor: 'pointer',
              }}
            >
              <MoreHorizontal size={18} />
            </button>

            {menuOpen && (
              <div className="lists-dropdown-menu" style={{ top: '100%', right: 0, marginTop: '4px', zIndex: 100 }}>
                <div className="lists-dropdown-item" onClick={() => { setMenuOpen(false); handlePin(); }}>{note.isPinned ? '取消置顶' : '置顶笔记'}</div>
                <div className="lists-dropdown-item" onClick={() => { setMenuOpen(false); handleImport(); }}>导入 MD</div>
                <div className="lists-dropdown-item" onClick={() => { setMenuOpen(false); handleExport(); }}>导出 MD</div>
                <div className="lists-dropdown-item text-danger" onClick={() => { setMenuOpen(false); handleDelete(); }}>删除笔记</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <ReactjsTiptapEditor
          key={note.id}
          content={content}
          initialContent={content}
          onChange={setContent}
          enableCustomTemplates={true}
          className="note-drawer-reactjs-tiptap"
        />
      </div>
    </div>
  );
}
