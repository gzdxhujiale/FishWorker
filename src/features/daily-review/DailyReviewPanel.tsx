import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDailyReviewStore } from './dailyReviewStore';
import { CompoundStats } from './CompoundStats';
import { ReviewEditor } from './ReviewEditor';
import './dailyReview.css';

const getTodayStr = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const formatDateDisplay = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
};

export const DailyReviewPanel: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  
  const reviewsData = useDailyReviewStore(state => state.data.reviews);
  const getAllReviews = useDailyReviewStore(state => state.getAllReviews);
  const getCompoundStats = useDailyReviewStore(state => state.getCompoundStats);
  
  const reviews = useMemo(() => getAllReviews(), [reviewsData, getAllReviews]);
  const stats = useMemo(() => getCompoundStats(), [reviewsData, getCompoundStats]);
  
  const syncAllFromDB = useDailyReviewStore(state => state.syncAllFromDB);
  const saveReview = useDailyReviewStore(state => state.saveReview);

  useEffect(() => {
    syncAllFromDB();
  }, [syncAllFromDB]);

  const handleSave = (date: string, content: string, rating: number, isHighFreq?: boolean) => {
    saveReview(date, content, rating, isHighFreq);
  };

  const changeDate = (days: number) => {
    const [y, m, d_val] = selectedDate.split('-').map(Number);
    const d = new Date(y, m - 1, d_val);
    d.setDate(d.getDate() + days);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d > today) return;

    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const currentReview = reviews.find(r => r.date === selectedDate);
  const isCurrentToday = selectedDate === getTodayStr();

  return (
    <div className="daily-review-panel">
      {/* Top Bar: Date Navigation */}
      <div className="review-top-bar">
        <div className="top-bar-date-nav">
          <button className="top-bar-nav-btn" onClick={() => changeDate(-1)} title="前一天">
            <ChevronLeft size={18} />
          </button>
          <span className="top-bar-date-display">{formatDateDisplay(selectedDate)}</span>
          {isCurrentToday && <span className="top-bar-today-badge">今天</span>}
          <button
            className="top-bar-nav-btn"
            onClick={() => changeDate(1)}
            title="后一天"
            disabled={isCurrentToday}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Main Layout: Left Editor + Right Stats */}
      <div className="review-main-layout">
        {/* Left: Editor */}
        <div className="review-editor-panel">
          <ReviewEditor 
            date={selectedDate} 
            review={currentReview} 
            onSave={handleSave}
          />
        </div>

        {/* Right: Stats + Calendar */}
        <div className="review-stats-panel">
          <CompoundStats 
            stats={stats} 
            reviews={reviews} 
            onSelectDate={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>
      </div>
    </div>
  );
};
