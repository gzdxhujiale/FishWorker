import React, { useState, useEffect, useMemo } from 'react';
import { useDailyReviewStore } from './dailyReviewStore';
import { CompoundStats } from './CompoundStats';
import { ReviewEditor } from './ReviewEditor';
import './dailyReview.css';

export const DailyReviewPanel: React.FC = () => {
  const getTodayStr = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  
  // Use useMemo to avoid Zustand infinite loop error with dynamically generated objects/arrays
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
    
    // Don't allow going into the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d > today) return;

    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const currentReview = reviews.find(r => r.date === selectedDate);

  return (
    <div className="daily-review-panel" style={{ position: 'relative' }}>
      <CompoundStats 
        stats={stats} 
        reviews={reviews} 
        onSelectDate={setSelectedDate}
        selectedDate={selectedDate}
      />
      <ReviewEditor 
        date={selectedDate} 
        review={currentReview} 
        onSave={handleSave}
        onPrevDay={() => changeDate(-1)}
        onNextDay={() => changeDate(1)}
      />
    </div>
  );
};
