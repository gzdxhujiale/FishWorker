import React, { useState, useEffect, useRef } from 'react';
import { DailyReview } from './dailyReviewTypes';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

interface Props {
  date: string;
  review?: DailyReview;
  onSave: (date: string, content: string, rating: number, isHighFreq?: boolean) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
}

export const ReviewEditor: React.FC<Props> = ({ date, review, onSave, onPrevDay, onNextDay }) => {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content: review?.content || '',
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

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
    if (editor && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [review, date, editor]);

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

  const isContentEmpty = !content || content === '<p></p>' || content === '<p></p>\n';

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
      </div>

      <div className="editor-content" style={{ position: 'relative' }}>
        {isContentEmpty && (
          <div style={{ position: 'absolute', top: '24px', left: '24px', color: 'var(--color-text-muted)', fontSize: '1rem', pointerEvents: 'none', zIndex: 2, opacity: 0.5 }}>
            今天学到了什么？什么可以改进？明天最重要的一件事？...
          </div>
        )}
        <EditorContent
          editor={editor}
          className="editor-textarea note-drawer-editor-container"
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
                onClick={() => handleRatingClick(star)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
