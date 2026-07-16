import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Template } from './listsTypes';
import { X, Edit2, Trash2 } from 'lucide-react';
import { ConfirmBubble } from './ConfirmBubble';
import { TipTapBubbleMenu } from '../tiptap/TipTapBubbleMenu';
import { BlockDragHandleMenu } from '../tiptap/BlockDragHandleMenu';
import { getTiptapExtensions } from '../tiptap/config';

interface TemplateModalProps {
  templates: Template[];
  onSelect: (template: Template) => void;
  onClose: () => void;
  onEdit?: (id: string, name: string, content: string) => void;
  onDelete?: (id: string) => void;
}

export function TemplateModal({ templates, onSelect, onClose, onEdit, onDelete }: TemplateModalProps) {
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [deleteConfirmTemplateId, setDeleteConfirmTemplateId] = useState<string | null>(null);

  const editor = useEditor({
    extensions: getTiptapExtensions({ enableMarkdown: false }),
    content: editContent,
    onUpdate: ({ editor }) => {
      setEditContent(editor.getHTML());
    },
  });

  const startEdit = (e: React.MouseEvent, tpl: Template) => {
    e.stopPropagation();
    setEditingTemplate(tpl);
    setEditName(tpl.name);
    setEditContent(tpl.content);
    if (editor) {
      editor.commands.setContent(tpl.content || '');
    }
  };

  const saveEdit = () => {
    if (editingTemplate && onEdit) {
      onEdit(editingTemplate.id, editName, editContent);
    }
    setEditingTemplate(null);
  };

  return (
    <div 
      className="list-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="list-modal-content" style={{ width: '700px', maxWidth: '95vw' }}>
        <div className="list-modal-header" style={{ padding: '24px 32px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>笔记模板</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="search-box" style={{ margin: 0, width: '200px' }}>
              <input type="text" placeholder="搜索..." />
            </div>
            <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
          </div>
        </div>
        
        <div className="list-modal-body" style={{ padding: '0 32px 24px', overflowY: 'auto', maxHeight: '60vh' }}>
          {editingTemplate ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                placeholder="模板名称" 
                style={{ fontSize: '16px', fontWeight: 'bold', padding: '8px', border: '1px solid var(--line-soft)', borderRadius: '4px' }}
              />
              <div className="template-editor-wrapper" style={{ border: '1px solid var(--line-soft)', borderRadius: '4px', display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
                <TipTapBubbleMenu editor={editor} />
                <BlockDragHandleMenu editor={editor} />
                <EditorContent 
                  editor={editor} 
                  style={{ flex: 1, overflowY: 'auto', padding: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="list-modal-btn" onClick={() => setEditingTemplate(null)}>取消</button>
                <button className="list-modal-btn primary" onClick={saveEdit}>保存</button>
              </div>
            </div>
          ) : (
            <div className="template-grid">
              {templates.map(tpl => (
                <div key={tpl.id} className="template-card" onClick={() => onSelect(tpl)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="template-card-title">{tpl.name}</div>
                    <div className="template-card-actions" onClick={e => e.stopPropagation()}>
                      <div className="template-action-btn" onClick={(e) => startEdit(e, tpl)}>
                        <Edit2 size={14} />
                      </div>
                      <ConfirmBubble
                        isOpen={deleteConfirmTemplateId === tpl.id}
                        message="确定要删除这个模板吗？"
                        position="bottom"
                        onConfirm={() => {
                          if (onDelete) onDelete(tpl.id);
                          setDeleteConfirmTemplateId(null);
                        }}
                        onCancel={() => setDeleteConfirmTemplateId(null)}
                      >
                        <div className="template-action-btn danger" onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmTemplateId(tpl.id);
                        }}>
                          <Trash2 size={14} />
                        </div>
                      </ConfirmBubble>
                    </div>
                  </div>
                  <div className="template-card-preview" dangerouslySetInnerHTML={{ __html: tpl.content }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
