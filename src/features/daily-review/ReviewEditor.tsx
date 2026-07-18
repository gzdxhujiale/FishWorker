import React from 'react';
import { DailyReview } from './dailyReviewTypes';
import { Star } from 'lucide-react';
import { SimpleEditor } from '../tiptap/SimpleEditor';
import { useReviewAutoSave } from './useReviewAutoSave';

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

  return (
    <div className="review-editor-container">
      {/* Editor */}
      <div className="editor-content">
        <SimpleEditor
          content={content}
          onChange={setContent}
          placeholder="今天学到了什么？什么可以改进？明天最重要的一件事？..."
          className="editor-simple-editor"
          editorStyle={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', height: 'auto', minHeight: 0 }}
          editorClassName="tiptap-editor-wrapper"
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
                onClick={() => setRating(star)}
              />
            ))}
          </div>
        </div>
        <span className="save-status">已自动保存</span>
      </div>
    </div>
  );
};
