import React, { useState, useEffect, useRef } from 'react';
import { DailyReview } from './dailyReviewTypes';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { SimpleEditor } from '../tiptap/SimpleEditor';

interface Props {
  date: string;
  review?: DailyReview;
  onSave: (date: string, content: string, rating: number, isHighFreq?: boolean) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onSelectDate: (date: string) => void;
}

export const ReviewEditor: React.FC<Props> = ({ date, review, onSave, onPrevDay, onNextDay, onSelectDate }) => {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);

  const lastSavedContent = useRef('');
  const currentContent = useRef('');
  const lastSavedRating = useRef(0);
  const currentRating = useRef(0);
  const currentDate = useRef(date);

  // Sync refs with state/props
  useEffect(() => {
    currentContent.current = content;
  }, [content]);

  useEffect(() => {
    currentRating.current = rating;
  }, [rating]);

  useEffect(() => {
    // When date changes, force save the previous date's content if it wasn't saved!
    if (currentDate.current !== date) {
      if (currentContent.current !== lastSavedContent.current || currentRating.current !== lastSavedRating.current) {
        onSave(currentDate.current, currentContent.current, currentRating.current, false); // immediate save
      }
      currentDate.current = date;
      const initialContent = review ? review.content : '';
      const initialRating = review ? (review.rating || 0) : 0;
      lastSavedContent.current = initialContent;
      lastSavedRating.current = initialRating;
    }
  }, [date, review, onSave]);

  // Handle local state updates from props
  useEffect(() => {
    const initialContent = review ? review.content : '';
    const initialRating = review ? (review.rating || 0) : 0;
    setContent(initialContent);
    setRating(initialRating);
    lastSavedContent.current = initialContent;
    lastSavedRating.current = initialRating;
  }, [review, date]);

  // Debounced auto-save for content
  useEffect(() => {
    if (content === lastSavedContent.current) return;

    const timer = setTimeout(() => {
      onSave(date, content, rating, true); // high-frequency saving (debounced)
      lastSavedContent.current = content;
      lastSavedRating.current = rating;
    }, 500);

    return () => clearTimeout(timer);
  }, [content, date, rating, onSave]);

  const isToday = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return date === todayStr;
  };

  const handleRatingClick = (star: number) => {
    const newRating = rating === star ? 0 : star;
    setRating(newRating);
    onSave(date, content, newRating, false); // immediate save
    lastSavedContent.current = content;
    lastSavedRating.current = newRating;
  };

  return (
    <div className="review-editor-container">
      <div className="editor-header">
        <div className="editor-date-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={onPrevDay} title="前一天" style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronLeft size={20} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              value={date}
              max={(() => {
                const today = new Date();
                return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              })()}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              style={{
                width: 140,
                fontWeight: 'bold',
                fontSize: '14px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--color-border, var(--line-soft))',
                background: 'var(--color-bg-elevated, var(--surface-2))',
                color: 'var(--color-text, var(--text-strong))',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            {isToday() && <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>(今天)</span>}
          </div>
          <button onClick={onNextDay} title="后一天" disabled={isToday()} style={{ background: 'transparent', border: 'none', cursor: isToday() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: isToday() ? 0.3 : 1 }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="editor-content" style={{ position: 'relative', padding: '0 0px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <SimpleEditor
          content={content}
          onChange={setContent}
          placeholder="今天学到了什么？什么可以改进？明天最重要的一件事？..."
          style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
          editorStyle={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px 20px', display: 'flex', flexDirection: 'column', height: 'auto', minHeight: 0 }}
          editorClassName="tiptap-editor-wrapper"
        />

        <div className="rating-selector" style={{ padding: '16px 12px' }}>
          <span className="stat-label">为今天的状态打分：</span>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={24}
                className={`rating-star ${star <= rating ? 'active' : ''}`}
                fill={star <= rating ? 'currentColor' : 'none'}
                onClick={() => handleRatingClick(star)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
