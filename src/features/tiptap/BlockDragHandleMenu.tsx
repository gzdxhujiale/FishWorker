import { useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Type, Copy, Trash2, Eraser, Heading1, Heading2, Heading3, List, ListOrdered, Quote } from 'lucide-react';

export function BlockDragHandleMenu({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!editor) return;

    const handleDragHandleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const dragHandle = target.closest('.drag-handle');
      
      if (dragHandle) {
        e.preventDefault();
        e.stopPropagation();
        const rect = dragHandle.getBoundingClientRect();
        
        // Find nearest block by looking at the hovered node 
        // GlobalDragHandle places the handle near the block.
        setPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
        setIsOpen(true);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleDragHandleClick, true);
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleDragHandleClick, true);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [editor]);

  if (!isOpen || !editor) return null;

  return (
    <div 
      ref={menuRef}
      className="lists-dropdown-menu" 
      style={{ 
        position: 'absolute', 
        top: pos.top + 8, 
        left: pos.left, 
        zIndex: 5000,
        display: 'flex',
        flexDirection: 'column',
        width: '200px'
      }}
    >
      <div className="lists-dropdown-item" onClick={() => { editor.chain().focus().setParagraph().run(); setIsOpen(false); }}>
        <Type size={14} style={{ marginRight: '8px' }} /> 转换为正文
      </div>
      <div className="lists-dropdown-item" onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setIsOpen(false); }}>
        <Heading1 size={14} style={{ marginRight: '8px' }} /> 转换为标题 1
      </div>
      <div className="lists-dropdown-item" onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setIsOpen(false); }}>
        <Heading2 size={14} style={{ marginRight: '8px' }} /> 转换为标题 2
      </div>
      <div className="lists-dropdown-item" onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setIsOpen(false); }}>
        <Heading3 size={14} style={{ marginRight: '8px' }} /> 转换为标题 3
      </div>
      <div className="lists-dropdown-item" onClick={() => { editor.chain().focus().toggleBulletList().run(); setIsOpen(false); }}>
        <List size={14} style={{ marginRight: '8px' }} /> 转换为无序列表
      </div>
      <div className="lists-dropdown-item" onClick={() => { editor.chain().focus().toggleOrderedList().run(); setIsOpen(false); }}>
        <ListOrdered size={14} style={{ marginRight: '8px' }} /> 转换为有序列表
      </div>
      <div className="lists-dropdown-item" onClick={() => { editor.chain().focus().toggleBlockquote().run(); setIsOpen(false); }}>
        <Quote size={14} style={{ marginRight: '8px' }} /> 转换为引用
      </div>
      
      <div style={{ height: '1px', background: 'var(--line-soft)', margin: '4px 0' }} />
      
      <div style={{ padding: '4px 12px', fontSize: '12px', color: 'var(--text-faint)' }}>文本颜色</div>
      <div style={{ display: 'flex', gap: '8px', padding: '4px 12px 8px' }}>
        <div onClick={() => { editor.chain().focus().setColor('#f5222d').run(); setIsOpen(false); }} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f5222d', cursor: 'pointer' }} />
        <div onClick={() => { editor.chain().focus().setColor('#1890ff').run(); setIsOpen(false); }} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1890ff', cursor: 'pointer' }} />
        <div onClick={() => { editor.chain().focus().setColor('#52c41a').run(); setIsOpen(false); }} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#52c41a', cursor: 'pointer' }} />
        <div onClick={() => { editor.chain().focus().setColor('#faad14').run(); setIsOpen(false); }} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#faad14', cursor: 'pointer' }} />
        <div onClick={() => { editor.chain().focus().unsetColor().run(); setIsOpen(false); }} style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'transparent', border: '1px solid var(--line-soft)', cursor: 'pointer' }} title="清除颜色" />
      </div>

      <div style={{ padding: '4px 12px', fontSize: '12px', color: 'var(--text-faint)' }}>背景高亮</div>
      <div style={{ display: 'flex', gap: '8px', padding: '4px 12px 8px' }}>
        <div onClick={() => { editor.chain().focus().toggleHighlight({ color: '#ffccc7' }).run(); setIsOpen(false); }} style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#ffccc7', cursor: 'pointer' }} />
        <div onClick={() => { editor.chain().focus().toggleHighlight({ color: '#bae0ff' }).run(); setIsOpen(false); }} style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#bae0ff', cursor: 'pointer' }} />
        <div onClick={() => { editor.chain().focus().toggleHighlight({ color: '#d9f7be' }).run(); setIsOpen(false); }} style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#d9f7be', cursor: 'pointer' }} />
        <div onClick={() => { editor.chain().focus().toggleHighlight({ color: '#ffe58f' }).run(); setIsOpen(false); }} style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#ffe58f', cursor: 'pointer' }} />
        <div onClick={() => { editor.chain().focus().unsetHighlight().run(); setIsOpen(false); }} style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'transparent', border: '1px solid var(--line-soft)', cursor: 'pointer' }} title="清除高亮" />
      </div>

      <div style={{ height: '1px', background: 'var(--line-soft)', margin: '4px 0' }} />

      <div className="lists-dropdown-item" onClick={() => { 
        document.execCommand('copy');
        setIsOpen(false); 
      }}>
        <Copy size={14} style={{ marginRight: '8px' }} /> 复制选中块
      </div>
      <div className="lists-dropdown-item" onClick={() => { editor.chain().focus().unsetAllMarks().clearNodes().run(); setIsOpen(false); }}>
        <Eraser size={14} style={{ marginRight: '8px' }} /> 重置格式化
      </div>
      <div className="lists-dropdown-item text-danger" onClick={() => { 
        editor.chain().focus().deleteSelection().run(); 
        setIsOpen(false); 
      }}>
        <Trash2 size={14} style={{ marginRight: '8px' }} /> 删除当前块
      </div>
    </div>
  );
}
