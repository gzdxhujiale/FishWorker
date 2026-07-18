import React from 'react';
import { DailyReview } from './dailyReviewTypes';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { SimpleEditor } from '../tiptap/SimpleEditor';
import { useReviewAutoSave } from './useReviewAutoSave';

interface Props {
  date: string;
  review?: DailyReview;
  onSave: (date: string, content: string, rating: number, isHighFreq?: boolean) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onSelectDate: (date: string) => void;
}

const isToday = (date: string): boolean => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return date === todayStr;
};

const getMaxDate = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export const ReviewEditor: React.FC<Props> = ({ date, review, onSave, onPrevDay, onNextDay, onSelectDate }) => {
  const { content, rating, setContent, setRating } = useReviewAutoSave({
    initialContent: review?.content || '',
    initialRating: review?.rating || 0,
    date,
    onSave,
  });

  const today = isToday(date);

  return (
    <div className="review-editor-container">
      <div className="editor-header">
        <div className="editor-date-selector">
          <button className="editor-nav-btn" onClick={onPrevDay} title="前一天">
            <ChevronLeft size={20} />
          </button>
          <div className="editor-date-display">
            <input
              type="date"
              className="editor-date-input"
              value={date}
              max={getMaxDate()}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
            />
            {today && <span className="editor-today-badge">(今天)</span>}
          </div>
          <button
            className="editor-nav-btn"
            onClick={onNextDay}
            title="后一天"
            disabled={today}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="editor-content">
        <SimpleEditor
          content={content}
          onChange={setContent}
          placeholder="今天学到了什么？什么可以改进？明天最重要的一件事？..."
          className="editor-simple-editor"
          editorStyle={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px 20px', display: 'flex', flexDirection: 'column', height: 'auto', minHeight: 0 }}
          editorClassName="tiptap-editor-wrapper"
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
