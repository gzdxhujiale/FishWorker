import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Italic, Underline, List, ListOrdered, CheckSquare, Undo, Redo } from 'lucide-react';

interface TipTapBubbleMenuProps {
  editor: Editor | null;
}

export function TipTapBubbleMenu({ editor }: TipTapBubbleMenuProps) {
  if (!editor) return null;

  return (
    <BubbleMenu editor={editor} className="tiptap-bubble-menu">
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

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          title="无序列表"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          title="有序列表"
        >
          <ListOrdered size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`toolbar-btn ${editor.isActive('taskList') ? 'active' : ''}`}
          title="任务列表"
        >
          <CheckSquare size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="toolbar-btn"
          title="撤销"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="toolbar-btn"
          title="重做"
        >
          <Redo size={16} />
        </button>
      </div>
    </BubbleMenu>
  );
}
