import { useEffect, useRef, useMemo, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { getTiptapExtensions } from './config';
import { TipTapBubbleMenu } from './TipTapBubbleMenu';
import { BlockDragHandleMenu } from './BlockDragHandleMenu';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  MoreHorizontal
} from 'lucide-react';

interface SimpleEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  editorClassName?: string;
  editorStyle?: React.CSSProperties;
  enableMarkdown?: boolean;
  enableDragHandle?: boolean;
  enableBubbleMenu?: boolean;
  enableTopToolbar?: boolean;
  dense?: boolean;
  onCreated?: (editor: Editor) => void;
  placeholderOverlay?: React.ReactNode;
}

export function SimpleEditor({
  content,
  onChange,
  placeholder = '',
  editable = true,
  className = '',
  style,
  editorClassName = '',
  editorStyle,
  enableMarkdown = true,
  enableDragHandle = true,
  enableBubbleMenu = true,
  enableTopToolbar = true,
  dense = true,
  onCreated,
  placeholderOverlay,
}: SimpleEditorProps) {
  const lastEmittedHtml = useRef(content);
  const [containerWidth, setContainerWidth] = useState(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  const getFoldedState = () => {
    const foldedIds = new Set<string>();
    if (containerWidth === 0) {
      return { foldedIds, showMore: false };
    }
    
    let availableWidth = containerWidth - 40; // padding/margin buffer
    
    // Width of essential items that are never folded:
    // Undo/Redo: ~64px
    // Heading Select: ~110px
    // Bold: ~32px
    // Dividers: ~30px
    // Total essential: ~236px
    const essentialWidth = 236;
    
    let remainingWidth = availableWidth - essentialWidth;
    
    const items = [
      { id: 'blockquote', width: 45 },
      { id: 'code', width: 32 },
      { id: 'highlight', width: 32 },
      { id: 'strike', width: 32 },
      { id: 'underline', width: 32 },
      { id: 'taskList', width: 32 },
      { id: 'orderedList', width: 32 },
      { id: 'bulletList', width: 32 },
      { id: 'italic', width: 32 }
    ];
    
    const totalFoldableWidth = items.reduce((sum, item) => sum + item.width, 0);
    
    if (remainingWidth >= totalFoldableWidth) {
      return { foldedIds, showMore: false };
    }
    
    remainingWidth -= 32; // Subtract "More" button width
    
    let currentFoldableWidth = totalFoldableWidth;
    for (let i = 0; i < items.length; i++) {
      foldedIds.add(items[i].id);
      currentFoldableWidth -= items[i].width;
      if (remainingWidth >= currentFoldableWidth) {
        break;
      }
    }
    
    return { foldedIds, showMore: true };
  };

  const { foldedIds, showMore } = getFoldedState();

  const extensions = useMemo(() => {
    const exts = getTiptapExtensions({
      enableDragHandle,
      enableMarkdown,
    });
    if (placeholder) {
      exts.push(
        Placeholder.configure({
          placeholder,
          emptyEditorClass: 'is-editor-empty',
        })
      );
    }
    return exts;
  }, [enableDragHandle, enableMarkdown, placeholder]);

  const editor = useEditor({
    extensions,
    content,
    editable,
    editorProps: {
      attributes: {
        class: `editor-textarea note-drawer-editor-container ${dense ? 'compact-editor' : ''} ${editorClassName}`,
        ...(editorStyle && typeof editorStyle === 'object'
          ? {
              style: Object.entries(editorStyle)
                .map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`)
                .join('; '),
            }
          : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHtml.current = html;
      onChange(html);
    },
  });

  // Notify parent component when editor is initialized
  useEffect(() => {
    if (editor && onCreated) {
      onCreated(editor);
    }
    return () => {
      if (onCreated) {
        onCreated(null as any);
      }
    };
  }, [editor, onCreated]);

  // Sync content from prop when it changes (e.g. switching date or note)
  useEffect(() => {
    if (editor && content !== lastEmittedHtml.current && content !== editor.getHTML()) {
      lastEmittedHtml.current = content;
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Sync editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Cleanup editor instance on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  return (
    <div ref={containerRef} className={`simple-editor-container ${className}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', ...style }}>
      {/* Top Toolbar */}
      {enableTopToolbar && editor && (
        <div className="tiptap-top-toolbar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', padding: '8px 12px', borderBottom: '1px solid var(--line-soft)', background: 'var(--surface-1)', borderRadius: '8px 8px 0 0', flexShrink: 0 }}>
          <div className="toolbar-group">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="撤销"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="重做"
            >
              <Redo2 size={16} />
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <select
              className="toolbar-select"
              onChange={(e) => {
                const level = e.target.value;
                if (level === '0') {
                  editor.chain().focus().setParagraph().run();
                } else {
                  editor.chain().focus().toggleHeading({ level: parseInt(level) as any }).run();
                }
              }}
              value={
                editor.isActive('heading', { level: 1 }) ? '1' :
                editor.isActive('heading', { level: 2 }) ? '2' :
                editor.isActive('heading', { level: 3 }) ? '3' :
                editor.isActive('heading', { level: 4 }) ? '4' :
                editor.isActive('heading', { level: 5 }) ? '5' :
                editor.isActive('heading', { level: 6 }) ? '6' : '0'
              }
              style={{
                padding: '2px 8px',
                height: '28px',
                lineHeight: '24px',
                borderRadius: '4px',
                border: '1px solid var(--line-soft)',
                background: 'var(--surface-2)',
                color: 'var(--text-strong)',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="0">正文</option>
              <option value="1">标题 1</option>
              <option value="2">标题 2</option>
              <option value="3">标题 3</option>
              <option value="4">标题 4</option>
              <option value="5">标题 5</option>
              <option value="6">标题 6</option>
            </select>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="加粗"
            >
              <Bold size={16} />
            </button>
            {!foldedIds.has('italic') && (
              <button
                type="button"
                className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                title="斜体"
              >
                <Italic size={16} />
              </button>
            )}
            {!foldedIds.has('underline') && (
              <button
                type="button"
                className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                title="下划线"
              >
                <Underline size={16} />
              </button>
            )}
            {!foldedIds.has('strike') && (
              <button
                type="button"
                className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
                onClick={() => editor.chain().focus().toggleStrike().run()}
                title="删除线"
              >
                <Strikethrough size={16} />
              </button>
            )}
            {!foldedIds.has('highlight') && (
              <button
                type="button"
                className={`toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`}
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                title="高亮"
              >
                <Highlighter size={16} />
              </button>
            )}
            {!foldedIds.has('code') && (
              <button
                type="button"
                className={`toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}
                onClick={() => editor.chain().focus().toggleCode().run()}
                title="行内代码"
              >
                <Code size={16} />
              </button>
            )}
          </div>

          {(!foldedIds.has('bulletList') || !foldedIds.has('orderedList') || !foldedIds.has('taskList')) && (
            <>
              <div className="toolbar-divider" />
              <div className="toolbar-group">
                {!foldedIds.has('bulletList') && (
                  <button
                    type="button"
                    className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    title="无序列表"
                  >
                    <List size={16} />
                  </button>
                )}
                {!foldedIds.has('orderedList') && (
                  <button
                    type="button"
                    className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    title="有序列表"
                  >
                    <ListOrdered size={16} />
                  </button>
                )}
                {!foldedIds.has('taskList') && (
                  <button
                    type="button"
                    className={`toolbar-btn ${editor.isActive('taskList') ? 'active' : ''}`}
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    title="任务列表"
                  >
                    <CheckSquare size={16} />
                  </button>
                )}
              </div>
            </>
          )}

          {!foldedIds.has('blockquote') && (
            <>
              <div className="toolbar-divider" />
              <div className="toolbar-group">
                <button
                  type="button"
                  className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  title="引用"
                >
                  <Quote size={16} />
                </button>
              </div>
            </>
          )}

          {showMore && (
            <>
              <div className="toolbar-divider" />
              <div className="toolbar-group" style={{ position: 'relative' }} ref={moreMenuRef}>
                <button
                  type="button"
                  className={`toolbar-btn ${moreMenuOpen ? 'active' : ''}`}
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  title="更多格式"
                >
                  <MoreHorizontal size={16} />
                </button>
                {moreMenuOpen && (
                  <div
                    className="tiptap-more-menu"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line-soft)',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      padding: '4px',
                      display: 'flex',
                      gap: '4px',
                      zIndex: 1000
                    }}
                  >
                    {foldedIds.has('italic') && (
                      <button
                        type="button"
                        className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
                        onClick={() => { editor.chain().focus().toggleItalic().run(); setMoreMenuOpen(false); }}
                        title="斜体"
                      >
                        <Italic size={16} />
                      </button>
                    )}
                    {foldedIds.has('underline') && (
                      <button
                        type="button"
                        className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
                        onClick={() => { editor.chain().focus().toggleUnderline().run(); setMoreMenuOpen(false); }}
                        title="下划线"
                      >
                        <Underline size={16} />
                      </button>
                    )}
                    {foldedIds.has('strike') && (
                      <button
                        type="button"
                        className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
                        onClick={() => { editor.chain().focus().toggleStrike().run(); setMoreMenuOpen(false); }}
                        title="删除线"
                      >
                        <Strikethrough size={16} />
                      </button>
                    )}
                    {foldedIds.has('highlight') && (
                      <button
                        type="button"
                        className={`toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`}
                        onClick={() => { editor.chain().focus().toggleHighlight().run(); setMoreMenuOpen(false); }}
                        title="高亮"
                      >
                        <Highlighter size={16} />
                      </button>
                    )}
                    {foldedIds.has('code') && (
                      <button
                        type="button"
                        className={`toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}
                        onClick={() => { editor.chain().focus().toggleCode().run(); setMoreMenuOpen(false); }}
                        title="行内代码"
                      >
                        <Code size={16} />
                      </button>
                    )}
                    {foldedIds.has('bulletList') && (
                      <button
                        type="button"
                        className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
                        onClick={() => { editor.chain().focus().toggleBulletList().run(); setMoreMenuOpen(false); }}
                        title="无序列表"
                      >
                        <List size={16} />
                      </button>
                    )}
                    {foldedIds.has('orderedList') && (
                      <button
                        type="button"
                        className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
                        onClick={() => { editor.chain().focus().toggleOrderedList().run(); setMoreMenuOpen(false); }}
                        title="有序列表"
                      >
                        <ListOrdered size={16} />
                      </button>
                    )}
                    {foldedIds.has('taskList') && (
                      <button
                        type="button"
                        className={`toolbar-btn ${editor.isActive('taskList') ? 'active' : ''}`}
                        onClick={() => { editor.chain().focus().toggleTaskList().run(); setMoreMenuOpen(false); }}
                        title="任务列表"
                      >
                        <CheckSquare size={16} />
                      </button>
                    )}
                    {foldedIds.has('blockquote') && (
                      <button
                        type="button"
                        className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
                        onClick={() => { editor.chain().focus().toggleBlockquote().run(); setMoreMenuOpen(false); }}
                        title="引用"
                      >
                        <Quote size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {enableBubbleMenu && <TipTapBubbleMenu editor={editor} />}
      {enableDragHandle && <BlockDragHandleMenu editor={editor} />}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <EditorContent 
          editor={editor} 
          className={`editor-textarea note-drawer-editor-container ${dense ? 'compact-editor' : ''} ${editorClassName}`} 
          style={editorStyle}
        />
        {placeholderOverlay}
      </div>
    </div>
  );
}
