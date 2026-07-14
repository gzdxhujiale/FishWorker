import React, { useState, useEffect } from 'react';
import { CompoundStats as CompoundStatsType, DailyReview } from './dailyReviewTypes';
import { TrendingUp, Award, Zap, Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';

interface Props {
  stats: CompoundStatsType;
  reviews: DailyReview[];
  onSelectDate: (date: string) => void;
  selectedDate: string;
}

export const CompoundStats: React.FC<Props> = ({ stats, reviews, onSelectDate, selectedDate }) => {
  // Parse selectedDate safely in local timezone
  const [y, m, d] = selectedDate.split('-').map(Number);
  const selectedDateObj = new Date(y, m - 1, d);

  const [month, setMonth] = useState<Date>(selectedDateObj);

  // Sync month when selectedDate changes from outside (e.g., arrow buttons)
  useEffect(() => {
    setMonth(selectedDateObj);
  }, [selectedDate]);

  // Group dates by rating level
  const level4Dates: Date[] = [];
  const level3Dates: Date[] = [];
  const level2Dates: Date[] = [];
  const level1Dates: Date[] = [];

  reviews.forEach(r => {
    const [ry, rm, rd] = r.date.split('-').map(Number);
    const dObj = new Date(ry, rm - 1, rd);
    if (r.rating === 5) level4Dates.push(dObj);
    else if (r.rating === 4) level3Dates.push(dObj);
    else if (r.rating && r.rating >= 2) level2Dates.push(dObj);
    else level1Dates.push(dObj);
  });

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onSelectDate(format(date, 'yyyy-MM-dd'));
    }
  };

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
          <Calendar size={18} />
          <span>当月打卡记录</span>
        </div>
        <div className="monthly-calendar-wrapper">
          <DayPicker
            mode="single"
            selected={selectedDateObj}
            onSelect={handleSelect}
            month={month}
            onMonthChange={setMonth}
            startMonth={new Date(2026, 0)}
            hidden={{ before: new Date(2026, 0, 1) }}
            disabled={{ before: new Date(2026, 0, 1) }}
            modifiers={{
              level4: level4Dates,
              level3: level3Dates,
              level2: level2Dates,
              level1: level1Dates,
            }}
            modifiersClassNames={{
              level4: 'active-level-4',
              level3: 'active-level-3',
              level2: 'active-level-2',
              level1: 'active-level-1',
            }}
            showOutsideDays={false}
          />
        </div>
      </div>
    </div>
  );
};
