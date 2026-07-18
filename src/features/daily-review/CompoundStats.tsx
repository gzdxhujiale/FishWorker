import React from 'react';
import { CompoundStats as CompoundStatsType, DailyReview } from './dailyReviewTypes';
import { Zap, Award, BarChart3 } from 'lucide-react';
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
      {/* Stats Cards */}
      <div className="stats-section">
        <div className="stats-section-title">复利成长</div>
        <div className="stats-grid">
          <div className="stat-card stat-card-accent">
            <div className="stat-card-value">
              <Zap size={16} className="stat-card-icon" />
              {stats.currentStreak}
            </div>
            <div className="stat-card-label">连续天数</div>
          </div>
          <div className="stat-card stat-card-accent">
            <div className="stat-card-value compound-value">{stats.compoundValue.toFixed(2)}x</div>
            <div className="stat-card-label">复利系数</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">
              <BarChart3 size={16} className="stat-card-icon-muted" />
              {stats.totalReviews}
            </div>
            <div className="stat-card-label">总复盘数</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">
              <Award size={16} className="stat-card-icon-muted" />
              {stats.longestStreak}
            </div>
            <div className="stat-card-label">最长连续</div>
          </div>
        </div>
      </div>

      {/* Calendar Heatmap */}
      <div className="calendar-section">
        <div className="calendar-section-title">当月打卡</div>
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
        <div className="calendar-legend">
          <span>少</span>
          <div className="legend-box level-0"></div>
          <div className="legend-box level-1"></div>
          <div className="legend-box level-2"></div>
          <div className="legend-box level-3"></div>
          <div className="legend-box level-4"></div>
          <span>多</span>
        </div>
      </div>
    </div>
  );
};
