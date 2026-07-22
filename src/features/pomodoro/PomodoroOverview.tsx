import React from 'react';
import { usePomodoroStore } from './pomodoroStore';

export const PomodoroOverview: React.FC = () => {
  const { getStats } = usePomodoroStore();
  const stats = getStats();

  const formatHoursMins = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return (
      <span className="stat-value-formatted">
        <span className="num">{h}</span>
        <span className="unit"> h </span>
        <span className="num">{m}</span>
        <span className="unit"> m</span>
      </span>
    );
  };

  return (
    <div className="pomodoro-overview-section">
      <h3 className="overview-title">概览</h3>
      <div className="overview-grid">
        <div className="stat-card">
          <div className="stat-label">今日番茄</div>
          <div className="stat-value num-only">{stats.todayCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">今日专注时长</div>
          <div className="stat-value">{formatHoursMins(stats.todayFocusMinutes)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">总番茄</div>
          <div className="stat-value num-only">{stats.totalCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">总专注时长</div>
          <div className="stat-value">{formatHoursMins(stats.totalFocusMinutes)}</div>
        </div>
      </div>
    </div>
  );
};
