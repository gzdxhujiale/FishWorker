import React, { useState, useEffect } from 'react';
import { DailyReview } from './dailyReviewTypes';
import { Save, Trash2, ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface Props {
  date: string;
  review?: DailyReview;
  onSave: (date: string, content: string, rating: number) => void;
  onDelete: (id: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
}

export const ReviewEditor: React.FC<Props> = ({ date, review, onSave, onDelete, onPrevDay, onNextDay }) => {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (review) {
      setContent(review.content);
      setRating(review.rating || 0);
    } else {
      setContent('');
      setRating(0);
    }
  }, [review, date]);

  const handleSave = () => {
    onSave(date, content, rating);
  };

  const isToday = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return date === todayStr;
  };

  return (
    <div className="review-editor-container">
      <div className="editor-header">
        <div className="editor-date-selector">
          <button onClick={onPrevDay} title="前一天"><ChevronLeft size={20} /></button>
          <h2>{date} {isToday() && '(今天)'}</h2>
          <button onClick={onNextDay} title="后一天" disabled={isToday()} style={{ opacity: isToday() ? 0.3 : 1 }}>
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="editor-actions">
          {review && (
            <button className="btn-danger" onClick={() => onDelete(review.id)}>
              <Trash2 size={16} /> 删除
            </button>
          )}
          <button className="btn-primary" onClick={handleSave}>
            <Save size={16} /> 保存复盘
          </button>
        </div>
      </div>

      <div className="editor-content">
        <textarea
          className="editor-textarea"
          placeholder="今天学到了什么？什么可以改进？明天最重要的一件事？..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        
        <div className="rating-selector">
          <span className="stat-label">为今天的状态打分：</span>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={24}
                className={`rating-star ${star <= rating ? 'active' : ''}`}
                fill={star <= rating ? 'currentColor' : 'none'}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
