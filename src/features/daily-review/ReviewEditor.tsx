import React from 'react';
import { DailyReview } from './dailyReviewTypes';
import { Star, Cloud } from 'lucide-react';
import { ReactjsTiptapEditor } from '../reactjs-tiptap-v1';
import { useReviewAutoSave } from './useReviewAutoSave';

interface Props {
  date: string;
  review?: DailyReview;
  onSave: (date: string, content: string, rating: number, isHighFreq?: boolean) => void;
}

export const ReviewEditor: React.FC<Props> = ({ date, review, onSave }) => {
  const { content, rating, saveStatus, setContent, setRating } = useReviewAutoSave({
    initialContent: review?.content || '',
    initialRating: review?.rating || 0,
    date,
    onSave,
  });

  return (
    <div className="review-editor-container" style={{ position: 'relative' }}>
      {/* Editor */}
      <div className="editor-content" style={{ position: 'relative' }}>
        <ReactjsTiptapEditor
          key={date}
          content={content}
          initialContent={content}
          onChange={setContent}
          enableCustomTemplates={true}
          className="editor-reactjs-tiptap"
        />
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
        <span
          title={saveStatus === 'saving' ? '保存中...' : '已自动保存'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
          }}
        >
          <Cloud
            size={18}
            style={{
              color: saveStatus === 'saved' ? '#3b82f6' : '#9ca3af',
              fill: saveStatus === 'saved' ? 'rgba(59, 130, 246, 0.18)' : 'none',
              transition: 'all 0.25s ease',
            }}
          />
        </span>
      </div>
    </div>
  );
};

