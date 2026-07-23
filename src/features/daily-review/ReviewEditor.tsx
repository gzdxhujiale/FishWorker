import React from 'react';
import { DailyReview } from './dailyReviewTypes';
import { Star } from 'lucide-react';
import { ReactjsTiptapEditor } from '../reactjs-tiptap-v1';
import { useReviewAutoSave } from './useReviewAutoSave';
import { useState } from 'react';
import { TemplateModal, Template, useTemplateStore } from '../templates';

interface Props {
  date: string;
  review?: DailyReview;
  onSave: (date: string, content: string, rating: number, isHighFreq?: boolean) => void;
}

export const ReviewEditor: React.FC<Props> = ({ date, review, onSave }) => {
  const { content, rating, setContent, setRating } = useReviewAutoSave({
    initialContent: review?.content || '',
    initialRating: review?.rating || 0,
    date,
    onSave,
  });

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const templates = useTemplateStore(state => state.templates);
  const updateTemplate = useTemplateStore(state => state.updateTemplate);
  const deleteTemplate = useTemplateStore(state => state.deleteTemplate);

  const ensureJsonFormat = (text: string) => {
    if (!text) return JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }
    if (trimmed.startsWith('<')) {
      return trimmed;
    }
    const lines = text.split('\n');
    const content = lines.map(line => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : []
    }));
    return JSON.stringify({ type: 'doc', content });
  };

  const handleSelectTemplate = (template: Template) => {
    const jsonContent = ensureJsonFormat(template.content);
    setContent(jsonContent);
    onSave(date, jsonContent, rating, false);
    setEditorKey(prev => prev + 1);
    setIsTemplateModalOpen(false);
  };

  const handleEditTemplate = (id: string, name: string, templateContent: string) => {
    updateTemplate(id, { name, content: templateContent });
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
  };

  const checkContentEmpty = (val: string) => {
    if (!val) return true;
    const trimmed = val.trim();
    if (!trimmed || trimmed === '{}') return true;
    try {
      const json = JSON.parse(trimmed);
      if (!json.content || !Array.isArray(json.content) || json.content.length === 0) return true;
      if (json.content.length === 1) {
        const p = json.content[0];
        if (p.type === 'paragraph' && (!p.content || p.content.length === 0)) return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const isContentEmpty = checkContentEmpty(content);

  return (
    <div className="review-editor-container" style={{ position: 'relative' }}>
      {/* Editor */}
      <div className="editor-content" style={{ position: 'relative' }}>
        <ReactjsTiptapEditor
          key={`${date}-${editorKey}`}
          content={content}
          initialContent={content}
          onChange={setContent}
          className="editor-reactjs-tiptap"
        />
        {isContentEmpty && (
          <div style={{ position: 'absolute', top: '64px', left: '36px', color: 'var(--text-faint)', fontSize: '15px', lineHeight: '1.7', pointerEvents: 'none', zIndex: 2 }}>
            记录你的想法，或{' '}
            <span
              style={{ pointerEvents: 'auto', color: 'var(--accent)', cursor: 'pointer' }}
              onClick={() => setIsTemplateModalOpen(true)}
            >
              使用模板
            </span>
          </div>
        )}
      </div>

      {/* Footer: Rating + Save Status */}
      <div className="editor-footer">
        <div className="rating-selector">
          <span className="rating-label">今日状态</span>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={20}
                className={`rating-star ${star <= rating ? 'active' : ''}`}
                fill={star <= rating ? 'currentColor' : 'none'}
                onClick={() => setRating(star === rating ? 0 : star)}
              />
            ))}
          </div>
        </div>
        <span className="save-status">已自动保存</span>
      </div>

      {isTemplateModalOpen && (
        <TemplateModal
          templates={templates}
          onSelect={handleSelectTemplate}
          onClose={() => setIsTemplateModalOpen(false)}
          onEdit={handleEditTemplate}
          onDelete={handleDeleteTemplate}
        />
      )}
    </div>
  );
};

