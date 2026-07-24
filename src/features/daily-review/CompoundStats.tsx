import React from 'react';
import { CompoundStats as CompoundStatsType, DailyReview } from './dailyReviewTypes';
import { Zap, Award, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';

interface Props {
  stats: CompoundStatsType;
  reviews: DailyReview[];
  onSelectDate: (date: string) => void;
  selectedDate: string;
}

export const CompoundStats: React.FC<Props> = ({ stats, reviews, onSelectDate, selectedDate }) => {
  const currentMonth = dayjs(selectedDate);
  const startOfMonth = currentMonth.startOf('month');
  const daysInMonth = currentMonth.daysInMonth();
  const startDayOfWeek = startOfMonth.day(); // 0 is Sunday

  const todayStr = dayjs().format('YYYY-MM-DD');
  const todayMonthStr = dayjs().format('YYYY-MM');

  const days: (dayjs.Dayjs | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(currentMonth.date(d));
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

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
        <div className="flex items-center justify-between mb-2">
          <div className="calendar-section-title">{currentMonth.format('YYYY年 M月')} 打卡记录</div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectDate(todayStr)}
              className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer mr-1 font-medium"
              title="跳转到今日"
            >
              今天
            </button>
            <button
              type="button"
              onClick={() => {
                const prev = currentMonth.subtract(1, 'month');
                if (prev.format('YYYY-MM') >= '2026-07') {
                  onSelectDate(prev.format('YYYY-MM-DD'));
                }
              }}
              disabled={currentMonth.format('YYYY-MM') <= '2026-07'}
              className="p-1 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="上个月"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                const next = currentMonth.add(1, 'month');
                if (next.format('YYYY-MM') <= todayMonthStr) {
                  onSelectDate(next.format('YYYY-MM-DD'));
                }
              }}
              disabled={currentMonth.format('YYYY-MM') >= todayMonthStr}
              className="p-1 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="下个月"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="monthly-calendar-wrapper bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 font-medium mb-1">
            {weekDays.map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-8" />;
              const dStr = day.format('YYYY-MM-DD');
              const isDisabled = dStr < '2026-07-01' || dStr > todayStr;
              const review = reviews.find(r => r.date === dStr);
              let cls = '';
              if (review) {
                if (review.rating === 5) cls = 'active-level-4';
                else if (review.rating === 4) cls = 'active-level-3';
                else if (review.rating === 3) cls = 'active-level-2';
                else cls = 'active-level-1';
              }
              const isSelected = dStr === selectedDate;
              return (
                <button
                  key={dStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onSelectDate(dStr)}
                  className={`h-8 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all border ${
                    isDisabled
                      ? 'opacity-30 cursor-not-allowed border-transparent bg-gray-50'
                      : isSelected
                      ? 'arco-calendar-date-selected is-selected ring-2 ring-blue-500 ring-offset-1 border-blue-400 cursor-pointer'
                      : 'border-transparent cursor-pointer'
                  } ${cls}`}
                >
                  <span className="arco-calendar-date-value">{day.date()}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="calendar-legend mt-3">
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
