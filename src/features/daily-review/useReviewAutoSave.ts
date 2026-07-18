import { useState, useEffect, useRef, useCallback } from 'react';

interface UseReviewAutoSaveOptions {
  /** Initial content for the current review */
  initialContent: string;
  /** Initial rating for the current review */
  initialRating: number;
  /** Current date being viewed */
  date: string;
  /** Debounce interval in ms for high-frequency saves (default: 500) */
  debounceMs?: number;
  /** Callback to persist the review */
  onSave: (date: string, content: string, rating: number, isHighFreq?: boolean) => void;
}

interface UseReviewAutoSaveReturn {
  /** Current content state */
  content: string;
  /** Current rating state */
  rating: number;
  /** Update content (triggers debounced save) */
  setContent: (value: string) => void;
  /** Update rating (triggers immediate save) */
  setRating: (value: number) => void;
}

/**
 * Hook that manages auto-save for daily review editing.
 * 
 * Responsibilities:
 * - Debounced save when content changes (high-frequency)
 * - Immediate save when rating changes
 * - Save previous date's unsaved content when date switches
 */
export function useReviewAutoSave({
  initialContent,
  initialRating,
  date,
  debounceMs = 500,
  onSave,
}: UseReviewAutoSaveOptions): UseReviewAutoSaveReturn {
  const [content, setContent] = useState(initialContent);
  const [rating, setRating] = useState(initialRating);

  // Track what was last persisted
  const lastSavedRef = useRef({ content: initialContent, rating: initialRating });
  // Track current values for "save on date change"
  const currentRef = useRef({ content: initialContent, rating: initialRating });
  // Track which date we're currently editing
  const currentDateRef = useRef(date);

  // Keep currentRef in sync with state
  useEffect(() => {
    currentRef.current = { content, rating };
  }, [content, rating]);

  // Sync initial values when review/date changes
  useEffect(() => {
    setContent(initialContent);
    setRating(initialRating);
    lastSavedRef.current = { content: initialContent, rating: initialRating };
    currentRef.current = { content: initialContent, rating: initialRating };
  }, [initialContent, initialRating, date]);

  // Save previous date's unsaved changes when date switches
  useEffect(() => {
    if (currentDateRef.current === date) return;

    const prev = currentRef.current;
    const last = lastSavedRef.current;

    if (prev.content !== last.content || prev.rating !== last.rating) {
      onSave(currentDateRef.current, prev.content, prev.rating, false);
    }

    currentDateRef.current = date;
  }, [date, onSave]);

  // Debounced auto-save for content changes
  useEffect(() => {
    if (content === lastSavedRef.current.content && rating === lastSavedRef.current.rating) {
      return;
    }

    const timer = setTimeout(() => {
      onSave(date, content, rating, true);
      lastSavedRef.current = { content, rating };
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [content, rating, date, debounceMs, onSave]);

  // Immediate save when rating changes
  const handleRatingChange = useCallback((newRating: number) => {
    setRating(newRating);
    onSave(date, content, newRating, false);
    lastSavedRef.current = { content, rating: newRating };
  }, [date, content, onSave]);

  return {
    content,
    rating,
    setContent,
    setRating: handleRatingChange,
  };
}
