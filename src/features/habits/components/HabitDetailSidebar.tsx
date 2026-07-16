import React, { useState } from "react";
import { X, MoreHorizontal, Edit, Target, Flame, Archive, Trash, Settings, Check } from "lucide-react";
import type { Habit, HabitStats } from "../habitTypes";

interface HabitDetailSidebarProps {
  habit: Habit;
  stats: HabitStats;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  currentDate: Date; // e.g., July 15, 2026
}

export const HabitDetailSidebar: React.FC<HabitDetailSidebarProps> = ({
  habit,
  stats,
  onClose,
  onEdit,
  onDelete,
  currentDate,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Simple calendar generator for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Adjust to start on Monday (1)
  let startOffset = firstDayOfWeek - 1;
  if (startOffset < 0) startOffset = 6; // Sunday becomes 6
  
  const calendarCells = [];
  
  // Empty slots before 1st
  for (let i = 0; i < startOffset; i++) {
    const prevDate = new Date(year, month, 0 - startOffset + i + 1).getDate();
    calendarCells.push({ day: prevDate, isCurrentMonth: false, dateStr: '' });
  }
  
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarCells.push({ day: i, isCurrentMonth: true, dateStr: dStr });
  }

  // Next month empty slots to complete the grid rows
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({ day: i, isCurrentMonth: false, dateStr: '' });
  }

  const handleMenuClick = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  return (
    <aside className="habit-sidebar">
      <div className="habit-sidebar-header">
        <div className="habit-sidebar-title-container">
          <button className="habit-sidebar-close" onClick={onClose}>
            <X size={20} />
          </button>
          <div className="habit-sidebar-icon">{habit.emoji}</div>
          <h3 className="habit-sidebar-title">{habit.name}</h3>
        </div>

        <div style={{ position: "relative" }}>
          <button 
            className="habit-sidebar-close" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <MoreHorizontal size={20} />
          </button>

          {isMenuOpen && (
            <div className="habit-dropdown right">
              <button 
                className="habit-dropdown-item"
                onClick={() => handleMenuClick(onEdit)}
              >
                <Edit size={16} className="text-slate-400" />
                编辑
              </button>
              <button className="habit-dropdown-item" onClick={() => setIsMenuOpen(false)}>
                <Target size={16} className="text-slate-400" />
                开始专注
              </button>
              <button className="habit-dropdown-item" onClick={() => setIsMenuOpen(false)}>
                <Settings size={16} className="text-slate-400" />
                打卡样式
              </button>
              <button className="habit-dropdown-item" onClick={() => setIsMenuOpen(false)}>
                <Archive size={16} className="text-slate-400" />
                归档
              </button>
              <button 
                className="habit-dropdown-item danger"
                onClick={() => handleMenuClick(onDelete)}
              >
                <Trash size={16} />
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="habit-sidebar-content">
        <div className="habit-stats-grid">
          <div className="habit-stat-card">
            <div className="habit-stat-label">
              <Check size={16} className="text-emerald-500" strokeWidth={3} />
              月打卡
            </div>
            <div>
              <span className="habit-stat-value">{stats.monthCount}</span>
              <span className="habit-stat-unit">天</span>
            </div>
          </div>
          
          <div className="habit-stat-card">
            <div className="habit-stat-label">
              <Target size={16} className="text-sky-500" strokeWidth={3} />
              总打卡
            </div>
            <div>
              <span className="habit-stat-value">{stats.totalCount}</span>
              <span className="habit-stat-unit">天</span>
            </div>
          </div>
          
          <div className="habit-stat-card">
            <div className="habit-stat-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              月完成率
            </div>
            <div>
              <span className="habit-stat-value">{stats.completionRate}</span>
              <span className="habit-stat-unit">%</span>
            </div>
          </div>
          
          <div className="habit-stat-card">
            <div className="habit-stat-label">
              <Flame size={16} className="text-rose-500" strokeWidth={3} />
              当前连续
            </div>
            <div>
              <span className="habit-stat-value">{stats.currentStreak}</span>
              <span className="habit-stat-unit">天</span>
            </div>
          </div>
        </div>

        <div className="habit-calendar">
          <div className="habit-calendar-header">
            <span style={{ cursor: 'pointer', padding: '4px', color: '#94a3b8' }}>&lt;</span>
            <span className="habit-calendar-title">
              {year}年{month + 1}月
            </span>
            <span style={{ cursor: 'pointer', padding: '4px', color: '#94a3b8' }}>&gt;</span>
          </div>
          
          <div className="habit-calendar-grid">
            {['一', '二', '三', '四', '五', '六', '日'].map(day => (
              <div key={day} className="habit-cal-day-name">{day}</div>
            ))}
            
            {calendarCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div key={idx} className="habit-cal-cell" style={{ opacity: 0.3 }}>
                    {cell.day}
                  </div>
                );
              }
              
              const isChecked = habit.logs[cell.dateStr] !== undefined;
              const isToday = cell.dateStr === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
              
              let cellClass = "habit-cal-cell ";
              if (isChecked) {
                cellClass += "checked";
              } else if (isToday) {
                cellClass += "today-uncheck";
              } else {
                cellClass += "empty";
              }
              
              return (
                <div key={idx} className={cellClass}>
                  {cell.day}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
