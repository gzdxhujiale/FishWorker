import React from 'react';
import { CompoundStats as CompoundStatsType, DailyReview } from './dailyReviewTypes';
import { TrendingUp, Award, Zap, Calendar } from 'lucide-react';

interface Props {
  stats: CompoundStatsType;
  reviews: DailyReview[];
  onSelectDate: (date: string) => void;
  selectedDate: string;
}

export const CompoundStats: React.FC<Props> = ({ stats, reviews, onSelectDate, selectedDate }) => {
  // Generate last 35 days for the heatmap
  const today = new Date();
  const heatmapDays = [];
  
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    const review = reviews.find(r => r.date === dateStr);
    let activeLevel = 0;
    if (review) {
      if (review.rating === 5) activeLevel = 4;
      else if (review.rating === 4) activeLevel = 3;
      else if (review.rating && review.rating >= 2) activeLevel = 2;
      else activeLevel = 1;
    }

    heatmapDays.push({
      date: dateStr,
      activeLevel,
      hasReview: !!review
    });
  }

  return (
    <div className="compound-stats-container">
      <div className="stats-card">
        <div className="stats-header">
          <TrendingUp size={20} />
          <span>复利成长指标</span>
        </div>
        
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">当前复利值</span>
            <span className="stat-value compound">{stats.compoundValue.toFixed(2)}x</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">总计复盘 (天)</span>
            <span className="stat-value">{stats.totalReviews}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">当前连续打卡</span>
            <span className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={18} color="#f59e0b" />
              {stats.currentStreak}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">历史最高连续</span>
            <span className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Award size={18} color="#3b82f6" />
              {stats.longestStreak}
            </span>
          </div>
        </div>
      </div>

      <div className="heatmap-container">
        <div className="stats-header" style={{ fontSize: '1rem', marginBottom: '8px' }}>
          <Calendar size={18} />
          <span>最近 35 天打卡记录</span>
        </div>
        <div className="heatmap-grid">
          {heatmapDays.map((day) => (
            <div
              key={day.date}
              className={`heatmap-cell ${day.activeLevel > 0 ? `active-level-${day.activeLevel}` : ''}`}
              title={`${day.date}${day.hasReview ? ' (已复盘)' : ' (未复盘)'}`}
              onClick={() => onSelectDate(day.date)}
              style={{
                border: day.date === selectedDate ? '2px solid var(--color-primary)' : '1px solid transparent',
                boxSizing: 'border-box'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
