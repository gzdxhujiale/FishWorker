import React, { useState, useEffect } from 'react';
import { dailyReviewStore } from './dailyReviewStore';
import { DailyReview, CompoundStats as CompoundStatsType } from './dailyReviewTypes';
import { CompoundStats } from './CompoundStats';
import { ReviewEditor } from './ReviewEditor';
import './dailyReview.css';

export const DailyReviewPanel: React.FC = () => {
  const getTodayStr = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [reviews, setReviews] = useState<DailyReview[]>([]);
  const [stats, setStats] = useState<CompoundStatsType>({ currentStreak: 0, longestStreak: 0, totalReviews: 0, compoundValue: 1.0 });

  const loadData = () => {
    setReviews(dailyReviewStore.getAllReviews());
    setStats(dailyReviewStore.getCompoundStats());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('daily-review-updated', handleUpdate);
    return () => window.removeEventListener('daily-review-updated', handleUpdate);
  }, []);

  const handleSave = (date: string, content: string, rating: number) => {
    dailyReviewStore.saveReview(date, content, rating);
    // Data reload is handled by the event listener in store.save()
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这天的复盘吗？')) {
      dailyReviewStore.deleteReview(id);
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    
    // Don't allow going into the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d > today) return;

    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const currentReview = reviews.find(r => r.date === selectedDate);

  return (
    <div className="daily-review-panel">
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
        onDelete={handleDelete}
        onPrevDay={() => changeDate(-1)}
        onNextDay={() => changeDate(1)}
      />
    </div>
  );
};
