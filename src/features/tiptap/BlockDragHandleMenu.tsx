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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Code,
  ChevronRight,
  Palette,
  Copy,
  Scissors,
  Trash2,
  Indent,
  Outdent
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

    if (isOpen) {
      if (typeof (editor.commands as any).lockDragHandle === 'function') {
        (editor.commands as any).lockDragHandle();
      }
    } else {
      if (typeof (editor.commands as any).unlockDragHandle === 'function') {
        (editor.commands as any).unlockDragHandle();
      }
    }

    return () => {
      if (typeof (editor.commands as any).unlockDragHandle === 'function') {
        (editor.commands as any).unlockDragHandle();
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

  const getBlockAlign = () => {
    const range = getBlockRange();
    if (!range) return 'left';
    return range.node.attrs.textAlign || 'left';
  };

  const getBlockColor = () => {
    const range = getBlockRange();
    if (!range) return null;
    
    let color: string | null = null;
    range.node.descendants((childNode: any) => {
      const colorMark = childNode.marks.find((m: any) => m.type.name === 'textStyle');
      if (colorMark && colorMark.attrs.color) {
        color = colorMark.attrs.color;
        return false; // stop traversal
      }
      return true;
    });
    return color;
  };

  const getBlockHighlight = () => {
    const range = getBlockRange();
    if (!range) return null;
    
    let highlight: string | null = null;
    range.node.descendants((childNode: any) => {
      const highlightMark = childNode.marks.find((m: any) => m.type.name === 'highlight');
      if (highlightMark && highlightMark.attrs.color) {
        highlight = highlightMark.attrs.color;
        return false; // stop traversal
      }
      return true;
    });
    return highlight;
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
    setIsOpen(false);
  };

  const runColorCommand = (color: string) => {
    if (!editor) return;
    const range = getBlockRange();
    if (range) {
      editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).setColor(color).run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
    setIsOpen(false);
  };

  const runUnsetColorCommand = () => {
    if (!editor) return;
    const range = getBlockRange();
    if (range) {
      editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).unsetColor().run();
    } else {
      editor.chain().focus().unsetColor().run();
    }
    setIsOpen(false);
  };

  const runHighlightCommand = (color: string) => {
    if (!editor) return;
    const range = getBlockRange();
    if (range) {
      editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).toggleHighlight({ color }).run();
    } else {
      editor.chain().focus().toggleHighlight({ color }).run();
    }
    setIsOpen(false);
  };

  const runUnsetHighlightCommand = () => {
    if (!editor) return;
    const range = getBlockRange();
    if (range) {
      editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).unsetHighlight().run();
    } else {
      editor.chain().focus().unsetHighlight().run();
    }
    setIsOpen(false);
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

      editor.chain().focus().setNodeSelection(range.pos).deleteSelection().run();
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
            className="block-menu-btn"
            onClick={() => { setShowAlignMenu(!showAlignMenu); setShowColorMenu(false); }}
            title="缩进和对齐"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', background: (showAlignMenu || getBlockAlign() !== 'left') ? 'var(--surface-3)' : 'transparent', color: (showAlignMenu || getBlockAlign() !== 'left') ? 'var(--accent, #6366f1)' : 'var(--text-strong)', cursor: 'pointer' }}
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            className="block-menu-btn"
            onClick={() => { setShowColorMenu(!showColorMenu); setShowAlignMenu(false); }}
            title="段落颜色"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', background: (showColorMenu || getBlockColor() || getBlockHighlight()) ? 'var(--surface-3)' : 'transparent', color: (showColorMenu || getBlockColor() || getBlockHighlight()) ? 'var(--accent, #6366f1)' : 'var(--text-strong)', cursor: 'pointer' }}
          >
            <Palette size={16} />
          </button>
          <button
            type="button"
            className={`block-menu-btn ${isBlockActive('codeBlock') ? 'active' : ''}`}
            onClick={() => runOnSelectedNode(c => c.toggleCodeBlock())}
            title="代码块"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            <Code size={16} />
          </button>
        </div>

        {/* Submenus & Standard items */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
          <div 
            className="lists-dropdown-item" 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
            onClick={() => { setShowColorMenu(!showColorMenu); setShowAlignMenu(false); }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Palette size={14} style={{ marginRight: '8px' }} /> 段落颜色
            </div>
            <ChevronRight size={12} style={{ transform: showColorMenu ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', opacity: 0.5 }} />
          </div>
          
          {showColorMenu && (
            <div style={{ padding: '6px 12px', background: 'var(--surface-3)', display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid var(--line-soft)', borderTop: '1px solid var(--line-soft)' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '4px' }}>文字颜色</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div onClick={() => runColorCommand('#f5222d')} style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#f5222d', cursor: 'pointer', border: getBlockColor() === '#f5222d' ? '2px solid var(--text-strong)' : 'none', boxSizing: 'border-box' }} title="红色" />
                  <div onClick={() => runColorCommand('#1890ff')} style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#1890ff', cursor: 'pointer', border: getBlockColor() === '#1890ff' ? '2px solid var(--text-strong)' : 'none', boxSizing: 'border-box' }} title="蓝色" />
                  <div onClick={() => runColorCommand('#52c41a')} style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#52c41a', cursor: 'pointer', border: getBlockColor() === '#52c41a' ? '2px solid var(--text-strong)' : 'none', boxSizing: 'border-box' }} title="绿色" />
                  <div onClick={() => runColorCommand('#faad14')} style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#faad14', cursor: 'pointer', border: getBlockColor() === '#faad14' ? '2px solid var(--text-strong)' : 'none', boxSizing: 'border-box' }} title="黄色" />
                  <div onClick={() => runUnsetColorCommand()} style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'transparent', border: !getBlockColor() ? '2px solid var(--text-strong)' : '1px solid var(--line-soft)', boxSizing: 'border-box', cursor: 'pointer' }} title="默认文字颜色" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '4px' }}>背景高亮</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div onClick={() => runHighlightCommand('#ffccc7')} style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#ffccc7', cursor: 'pointer', border: getBlockHighlight() === '#ffccc7' ? '2px solid var(--text-strong)' : 'none', boxSizing: 'border-box' }} title="红底高亮" />
                  <div onClick={() => runHighlightCommand('#bae0ff')} style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#bae0ff', cursor: 'pointer', border: getBlockHighlight() === '#bae0ff' ? '2px solid var(--text-strong)' : 'none', boxSizing: 'border-box' }} title="蓝底高亮" />
                  <div onClick={() => runHighlightCommand('#d9f7be')} style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#d9f7be', cursor: 'pointer', border: getBlockHighlight() === '#d9f7be' ? '2px solid var(--text-strong)' : 'none', boxSizing: 'border-box' }} title="绿底高亮" />
                  <div onClick={() => runHighlightCommand('#ffe58f')} style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#ffe58f', cursor: 'pointer', border: getBlockHighlight() === '#ffe58f' ? '2px solid var(--text-strong)' : 'none', boxSizing: 'border-box' }} title="黄底高亮" />
                  <div onClick={() => runUnsetHighlightCommand()} style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'transparent', border: !getBlockHighlight() ? '2px solid var(--text-strong)' : '1px solid var(--line-soft)', boxSizing: 'border-box', cursor: 'pointer' }} title="清除高亮" />
                </div>
              </div>
            </div>
          )}

          <div 
            className="lists-dropdown-item" 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
            onClick={() => { setShowAlignMenu(!showAlignMenu); setShowColorMenu(false); }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <AlignLeft size={14} style={{ marginRight: '8px' }} /> 缩进和对齐
            </div>
            <ChevronRight size={12} style={{ transform: showAlignMenu ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', opacity: 0.5 }} />
          </div>
          
          {showAlignMenu && (
            <div style={{ padding: '6px 12px', background: 'var(--surface-3)', display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid var(--line-soft)', borderTop: '1px solid var(--line-soft)' }}>
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
              <div style={{ width: '1px', height: '20px', background: 'var(--line-soft)', margin: '4px 2px' }} />
              <button
                type="button"
                className="toolbar-btn"
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-strong)', cursor: 'pointer' }}
                onClick={() => runOnSelectedNode(c => c.sinkListItem('listItem'))}
                title="增加缩进"
              >
                <Indent size={14} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-strong)', cursor: 'pointer' }}
                onClick={() => runOnSelectedNode(c => c.liftListItem('listItem'))}
                title="减少缩进"
              >
                <Outdent size={14} />
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
                editor.chain().focus().setNodeSelection(range.pos).deleteSelection().run();
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
