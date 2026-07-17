import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Italic, Underline } from 'lucide-react';

interface TipTapBubbleMenuProps {
  editor: Editor | null;
}

export function TipTapBubbleMenu({ editor }: TipTapBubbleMenuProps) {
  if (!editor) return null;

  return (
    <BubbleMenu editor={editor} className="tiptap-bubble-menu">
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
          title="加粗"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
          title="斜体"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
          title="下划线"
        >
          <Underline size={16} />
        </button>
      </div>
    </BubbleMenu>
  );
}
