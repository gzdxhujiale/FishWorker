import { useEffect, useState } from 'react';
import { Editor } from '@tiptap/react';
import { DOMSerializer } from '@tiptap/pm/model';
import { useFloating, autoUpdate, offset, flip, shift, FloatingPortal } from '@floating-ui/react';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  SquareCode,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  ChevronRight,
  Ban,
  Copy,
  Scissors,
  Trash2
} from 'lucide-react';

export function BlockDragHandleMenu({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    open: isOpen,
    onOpenChange: setIsOpen,
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({
        fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
      }),
      shift({ padding: 8 }),
    ],
  });

  useEffect(() => {
    if (!editor) return;

    const handleDragHandleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const dragHandle = target.closest('.drag-handle');
      
      if (dragHandle) {
        e.preventDefault();
        e.stopPropagation();
        
        refs.setReference(dragHandle);
        setIsOpen(true);
        setShowColorMenu(false);
        setShowAlignMenu(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const floatingEl = refs.floating.current;
      const target = e.target as HTMLElement;
      const dragHandle = target.closest('.drag-handle');
      
      if (floatingEl && !floatingEl.contains(e.target as Node) && !dragHandle) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    document.addEventListener('click', handleDragHandleClick, true);
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('click', handleDragHandleClick, true);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [editor, refs]);

  // Lock drag handle when the block context menu is open
  useEffect(() => {
    if (!editor) return;

    // Capture editor reference at effect start time so cleanup is safe
    const editorRef = editor;

    if (isOpen) {
      if (typeof (editorRef.commands as any).lockDragHandle === 'function') {
        (editorRef.commands as any).lockDragHandle();
      }
    } else {
      if (typeof (editorRef.commands as any).unlockDragHandle === 'function') {
        (editorRef.commands as any).unlockDragHandle();
      }
    }

    return () => {
      // Guard: editor may have been destroyed by the time cleanup runs
      if (editorRef && !editorRef.isDestroyed) {
        if (typeof (editorRef.commands as any).unlockDragHandle === 'function') {
          (editorRef.commands as any).unlockDragHandle();
        }
      }
    };
  }, [isOpen, editor]);

  const getBlockRange = () => {
    const targetPos = (editor as any)._draggedNodePos;
    const targetNode = (editor as any)._draggedNode;
    if (typeof targetPos === 'number' && targetNode) {
      return {
        pos: targetPos,
        from: targetPos + 1,
        to: targetPos + targetNode.nodeSize - 1,
        node: targetNode
      };
    }
    return null;
  };

  const isBlockActive = (type: string, attrs?: any) => {
    if (!editor) return false;
    const range = getBlockRange();
    if (!range) return false;
    
    const { node } = range;
    
    // Check main node type
    if (node.type.name === type) {
      if (attrs) {
        return Object.entries(attrs).every(([key, value]) => node.attrs[key] === value);
      }
      return true;
    }
    
    // Check list item parent list type
    if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
      const $pos = editor.state.doc.resolve(range.pos);
      for (let depth = $pos.depth; depth > 0; depth--) {
        const parent = $pos.node(depth);
        if (parent && parent.type.name === type) {
          if (attrs) {
            return Object.entries(attrs).every(([key, value]) => parent.attrs[key] === value);
          }
          return true;
        }
      }
    }
    
    return false;
  };

  const runOnSelectedNode = (command: (chain: any) => any) => {
    if (!editor) return;
    const range = getBlockRange();
    if (range) {
      command(editor.chain().focus().setNodeSelection(range.pos)).run();
    } else {
      command(editor.chain().focus()).run();
    }
    setIsOpen(false);
  };

  const runOnTextRange = (command: (chain: any) => any) => {
    if (!editor) return;
    const range = getBlockRange();
    if (range) {
      command(editor.chain().focus().setTextSelection({ from: range.from, to: range.to })).run();
    } else {
      command(editor.chain().focus()).run();
    }
  };

  const getBlockAlign = () => {
    const range = getBlockRange();
    if (!range) return 'left';
    return range.node.attrs.textAlign || 'left';
  };

  const getBlockHighlight = () => {
    const range = getBlockRange();
    if (!range) return null;
    let highlight: string | null = null;
    range.node.descendants((childNode: any) => {
      const mark = childNode.marks.find((m: any) => m.type.name === 'highlight');
      if (mark && mark.attrs.color) {
        highlight = mark.attrs.color;
        return false;
      }
      return true;
    });
    return highlight;
  };

  const runHighlightCommand = (color: string) => {
    if (!editor) return;
    const range = getBlockRange();
    if (range) {
      editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).toggleHighlight({ color }).run();
    } else {
      editor.chain().focus().toggleHighlight({ color }).run();
    }
  };

  const runUnsetHighlightCommand = () => {
    if (!editor) return;
    const range = getBlockRange();
    if (range) {
      editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).unsetHighlight().run();
    } else {
      editor.chain().focus().unsetHighlight().run();
    }
  };

  const handleCopy = async () => {
    if (!editor) return;
    const range = getBlockRange();
    if (!range) return;

    try {
      const node = range.node;
      const domSerializer = DOMSerializer.fromSchema(editor.schema);
      const tempDiv = document.createElement('div');
      const docFragment = domSerializer.serializeNode(node);
      tempDiv.appendChild(docFragment);
      const htmlContent = tempDiv.innerHTML;
      const textContent = node.textContent || '';

      const clipboardData = [
        new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([textContent], { type: 'text/plain' })
        })
      ];
      await navigator.clipboard.write(clipboardData);
    } catch (err) {
      console.error('Failed to copy block content:', err);
    }
    setIsOpen(false);
  };

  const handleCut = async () => {
    if (!editor) return;
    const range = getBlockRange();
    if (!range) return;

    try {
      const node = range.node;
      const domSerializer = DOMSerializer.fromSchema(editor.schema);
      const tempDiv = document.createElement('div');
      const docFragment = domSerializer.serializeNode(node);
      tempDiv.appendChild(docFragment);
      const htmlContent = tempDiv.innerHTML;
      const textContent = node.textContent || '';

      const clipboardData = [
        new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([textContent], { type: 'text/plain' })
        })
      ];
      await navigator.clipboard.write(clipboardData);

      editor.chain().focus().setNodeSelection(range.pos).run();
      (editor.commands as any).deleteNodePromoteChildren();
    } catch (err) {
      console.error('Failed to cut block content:', err);
    }
    setIsOpen(false);
  };

  if (!isOpen || !editor) return null;

  return (
    <FloatingPortal>
      <div 
        ref={refs.setFloating}
        className="lists-dropdown-menu" 
        style={{ 
          ...floatingStyles,
          zIndex: 5000,
          display: 'flex',
          flexDirection: 'column',
          width: '240px',
          padding: '6px'
        }}
      >
        {/* Row 1: Text type & Heading levels */}
        <div className="block-menu-row" style={{ display: 'flex', gap: '4px', padding: '4px 6px', borderBottom: '1px solid var(--line-soft)' }}>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('paragraph') ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.setParagraph())}
            title="正文"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <Type size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('heading', { level: 1 }) ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleHeading({ level: 1 }))}
            title="标题 1"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('heading', { level: 2 }) ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleHeading({ level: 2 }))}
            title="标题 2"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('heading', { level: 3 }) ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleHeading({ level: 3 }))}
            title="标题 3"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <Heading3 size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('heading', { level: 4 }) ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleHeading({ level: 4 }))}
            title="标题 4"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <Heading4 size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('heading', { level: 5 }) ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleHeading({ level: 5 }))}
            title="标题 5"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <Heading5 size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('heading', { level: 6 }) ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleHeading({ level: 6 }))}
            title="标题 6"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <Heading6 size={16} />
          </button>
        </div>

        {/* Row 2: Structuring options */}
        <div className="block-menu-row" style={{ display: 'flex', gap: '4px', padding: '4px 6px', borderBottom: '1px solid var(--line-soft)' }}>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('orderedList') ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleOrderedList())}
            title="有序列表"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('bulletList') ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleBulletList())}
            title="无序列表"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('taskList') ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleTaskList())}
            title="待办列表"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <CheckSquare size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('blockquote') ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleBlockquote())}
            title="引用"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <Quote size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('codeBlock') ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleCodeBlock())}
            title="代码块"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <SquareCode size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('table') ? 'active' : ''}`}
            onClick={() => {
              if (editor) {
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
              }
              setIsOpen(false);
            }}
            title="插入表格"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <Table size={16} />
          </button>
        </div>

        {/* Submenus & Standard items */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
          {/* Color Highlight Popover */}
          <div 
            className="lists-dropdown-item" 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
            onClick={() => { setShowColorMenu(!showColorMenu); setShowAlignMenu(false); }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Highlighter size={14} style={{ marginRight: '8px' }} /> 背景高亮
            </div>
            <ChevronRight size={12} style={{ transform: showColorMenu ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', opacity: 0.5 }} />
          </div>
          
          {showColorMenu && (
            <div style={{ padding: '8px 12px', background: 'var(--surface-3)', borderBottom: '1px solid var(--line-soft)', borderTop: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <div onClick={() => runHighlightCommand('var(--tt-color-highlight-yellow)')} style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'var(--tt-color-highlight-yellow)', cursor: 'pointer', border: getBlockHighlight() === 'var(--tt-color-highlight-yellow)' ? '2px solid var(--text-strong)' : '1px solid var(--line-soft)', boxSizing: 'border-box' }} title="黄色" />
                <div onClick={() => runHighlightCommand('var(--tt-color-highlight-green)')} style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'var(--tt-color-highlight-green)', cursor: 'pointer', border: getBlockHighlight() === 'var(--tt-color-highlight-green)' ? '2px solid var(--text-strong)' : '1px solid var(--line-soft)', boxSizing: 'border-box' }} title="绿色" />
                <div onClick={() => runHighlightCommand('var(--tt-color-highlight-blue)')} style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'var(--tt-color-highlight-blue)', cursor: 'pointer', border: getBlockHighlight() === 'var(--tt-color-highlight-blue)' ? '2px solid var(--text-strong)' : '1px solid var(--line-soft)', boxSizing: 'border-box' }} title="蓝色" />
                <div onClick={() => runHighlightCommand('var(--tt-color-highlight-purple)')} style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'var(--tt-color-highlight-purple)', cursor: 'pointer', border: getBlockHighlight() === 'var(--tt-color-highlight-purple)' ? '2px solid var(--text-strong)' : '1px solid var(--line-soft)', boxSizing: 'border-box' }} title="紫色" />
                <div onClick={() => runHighlightCommand('var(--tt-color-highlight-red)')} style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'var(--tt-color-highlight-red)', cursor: 'pointer', border: getBlockHighlight() === 'var(--tt-color-highlight-red)' ? '2px solid var(--text-strong)' : '1px solid var(--line-soft)', boxSizing: 'border-box' }} title="红色" />
                <div onClick={() => runHighlightCommand('var(--tt-color-highlight-orange)')} style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'var(--tt-color-highlight-orange)', cursor: 'pointer', border: getBlockHighlight() === 'var(--tt-color-highlight-orange)' ? '2px solid var(--text-strong)' : '1px solid var(--line-soft)', boxSizing: 'border-box' }} title="橙色" />
                <div onClick={() => runUnsetHighlightCommand()} style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'transparent', border: '1px solid var(--line-soft)', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="清除高亮">
                  <Ban size={12} style={{ opacity: 0.5 }} />
                </div>
              </div>
            </div>
          )}

          {/* Text Align */}
          <div 
            className="lists-dropdown-item" 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
            onClick={() => { setShowAlignMenu(!showAlignMenu); setShowColorMenu(false); }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <AlignLeft size={14} style={{ marginRight: '8px' }} /> 文本对齐
            </div>
            <ChevronRight size={12} style={{ transform: showAlignMenu ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', opacity: 0.5 }} />
          </div>
          
          {showAlignMenu && (
            <div style={{ padding: '6px 12px', background: 'var(--surface-3)', display: 'flex', gap: '4px', borderBottom: '1px solid var(--line-soft)', borderTop: '1px solid var(--line-soft)' }}>
              <button
                type="button"
                className="toolbar-btn"
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: getBlockAlign() === 'left' ? 'var(--surface-4)' : 'transparent', border: 'none', color: 'var(--text-strong)', cursor: 'pointer', borderRadius: '4px' }}
                onClick={() => runOnTextRange(c => c.setTextAlign('left'))}
                title="左对齐"
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: getBlockAlign() === 'center' ? 'var(--surface-4)' : 'transparent', border: 'none', color: 'var(--text-strong)', cursor: 'pointer', borderRadius: '4px' }}
                onClick={() => runOnTextRange(c => c.setTextAlign('center'))}
                title="居中对齐"
              >
                <AlignCenter size={14} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: getBlockAlign() === 'right' ? 'var(--surface-4)' : 'transparent', border: 'none', color: 'var(--text-strong)', cursor: 'pointer', borderRadius: '4px' }}
                onClick={() => runOnTextRange(c => c.setTextAlign('right'))}
                title="右对齐"
              >
                <AlignRight size={14} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: getBlockAlign() === 'justify' ? 'var(--surface-4)' : 'transparent', border: 'none', color: 'var(--text-strong)', cursor: 'pointer', borderRadius: '4px' }}
                onClick={() => runOnTextRange(c => c.setTextAlign('justify'))}
                title="两端对齐"
              >
                <AlignJustify size={14} />
              </button>
            </div>
          )}

          <div style={{ height: '1px', background: 'var(--line-soft)', margin: '4px 0' }} />
          <div 
            className="lists-dropdown-item" 
            style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={handleCopy}
          >
            <Copy size={14} style={{ marginRight: '8px' }} /> 复制
          </div>
          <div 
            className="lists-dropdown-item" 
            style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={handleCut}
          >
            <Scissors size={14} style={{ marginRight: '8px' }} /> 剪切
          </div>
          <div 
            className="lists-dropdown-item text-danger" 
            style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }}
            onClick={() => { 
              const range = getBlockRange();
              if (range) {
                editor.chain().focus().setNodeSelection(range.pos).run();
                (editor.commands as any).deleteNodePromoteChildren();
              } else {
                editor.chain().focus().deleteSelection().run();
              }
              setIsOpen(false); 
            }}
          >
            <Trash2 size={14} style={{ marginRight: '8px' }} /> 删除
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
}
