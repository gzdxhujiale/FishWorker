import React, { useState, useEffect } from 'react';
import { dailyReviewStore, SyncStatus } from './dailyReviewStore';
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');

  const loadData = () => {
    setReviews(dailyReviewStore.getAllReviews());
    setStats(dailyReviewStore.getCompoundStats());
    setSyncStatus(dailyReviewStore.getSyncStatus());
  };

  useEffect(() => {
    loadData();
    dailyReviewStore.syncAllFromDB().then(() => loadData());
    
    const handleUpdate = () => loadData();
    const handleSyncUpdate = () => setSyncStatus(dailyReviewStore.getSyncStatus());
    
    window.addEventListener('daily-review-updated', handleUpdate);
    window.addEventListener('daily-review-sync-updated', handleSyncUpdate);
    return () => {
      window.removeEventListener('daily-review-updated', handleUpdate);
      window.removeEventListener('daily-review-sync-updated', handleSyncUpdate);
    };
  }, []);

  const handleSave = (date: string, content: string, rating: number, isHighFreq?: boolean) => {
    dailyReviewStore.saveReview(date, content, rating, isHighFreq);
    // Data reload is handled by the event listener in store.save()
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这天的复盘吗？')) {
      dailyReviewStore.deleteReview(id);
    }
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
      <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '12px', zIndex: 10 }}>
        {syncStatus === 'saving' && <span style={{color: '#aaa'}}>☁️ 同步中...</span>}
        {syncStatus === 'saved' && <span style={{color: '#4caf50'}}>☁️ 已同步</span>}
        {syncStatus === 'error' && <span style={{color: '#f44336'}}>☁️ 同步失败</span>}
      </div>
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
