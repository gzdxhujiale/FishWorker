import { useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getTiptapExtensions } from './config';
import { TipTapBubbleMenu } from './TipTapBubbleMenu';
import { BlockDragHandleMenu } from './BlockDragHandleMenu';
import Placeholder from '@tiptap/extension-placeholder';

interface SimpleEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  enableMarkdown?: boolean;
  enableDragHandle?: boolean;
  enableBubbleMenu?: boolean;
}

export function SimpleEditor({
  content,
  onChange,
  placeholder = '',
  editable = true,
  className = '',
  enableMarkdown = true,
  enableDragHandle = true,
  enableBubbleMenu = true,
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
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHtml.current = html;
      onChange(html);
    },
  });

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
    <div className={`simple-editor-container ${className}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
      {enableBubbleMenu && <TipTapBubbleMenu editor={editor} />}
      {enableDragHandle && <BlockDragHandleMenu editor={editor} />}
      <EditorContent editor={editor} className="editor-textarea note-drawer-editor-container" />
    </div>
  );
}
