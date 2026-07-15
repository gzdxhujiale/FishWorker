import React from 'react';
import { CompoundStats as CompoundStatsType, DailyReview } from './dailyReviewTypes';
import { TrendingUp, Award, Zap, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@arco-design/web-react';
import dayjs from 'dayjs';

interface Props {
  stats: CompoundStatsType;
  reviews: DailyReview[];
  onSelectDate: (date: string) => void;
  selectedDate: string;
}

export const CompoundStats: React.FC<Props> = ({ stats, reviews, onSelectDate, selectedDate }) => {
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

      <div className="heatmap-container" style={{ padding: '16px' }}>
        <div className="stats-header" style={{ fontSize: '1rem', marginBottom: '8px' }}>
          <CalendarIcon size={18} />
          <span>当月打卡记录</span>
        </div>
        <div className="monthly-calendar-wrapper arco-custom-calendar">
          <Calendar
            panel
            value={dayjs(selectedDate)}
            onChange={(val) => onSelectDate(val.format('YYYY-MM-DD'))}
            dateRender={(current) => {
              const dStr = current.format('YYYY-MM-DD');
              const review = reviews.find(r => r.date === dStr);
              let cls = '';
              if (review) {
                if (review.rating === 5) cls = 'active-level-4';
                else if (review.rating === 4) cls = 'active-level-3';
                else if (review.rating && review.rating >= 2) cls = 'active-level-2';
                else cls = 'active-level-1';
              }
              const isSelected = dStr === selectedDate;
              return (
                <div className={`arco-calendar-date ${cls} ${isSelected ? 'arco-calendar-date-selected' : ''}`}>
                  <div className="arco-calendar-date-value">{current.date()}</div>
                </div>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
};
