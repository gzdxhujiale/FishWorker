import { useEffect, useRef, useMemo } from 'react';
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
  Quote
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
    <div className={`simple-editor-container ${className}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', ...style }}>
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
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="斜体"
            >
              <Italic size={16} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="下划线"
            >
              <Underline size={16} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="删除线"
            >
              <Strikethrough size={16} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              title="高亮"
            >
              <Highlighter size={16} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="行内代码"
            >
              <Code size={16} />
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="无序列表"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="有序列表"
            >
              <ListOrdered size={16} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('taskList') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              title="任务列表"
            >
              <CheckSquare size={16} />
            </button>
          </div>

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
