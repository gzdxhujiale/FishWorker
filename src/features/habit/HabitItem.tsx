import React, { useMemo } from 'react';
import clsx from 'clsx';
import { Smile } from 'lucide-react';
import { Habit } from './habitTypes';
import { useHabitStore } from './habitStore';

interface HabitItemProps {
  habit: Habit;
  onClick: (habit: Habit) => void;
}

export const HabitItem: React.FC<HabitItemProps> = ({ habit, onClick }) => {
  const currentDate = useHabitStore(state => state.currentDate);
  const toggleCheckIn = useHabitStore(state => state.toggleCheckIn);
  
  const checkIns = useHabitStore(state => state.checkIns);
  const getStats = useHabitStore(state => state.getStats);
  const getCheckInStatus = useHabitStore(state => state.getCheckInStatus);

  const stats = useMemo(() => getStats(habit.id, currentDate), [checkIns, habit.id, currentDate, getStats]);

  // Generate last 7 days for the dots
  const last7Days = useMemo(() => {
    const days = [];
    const baseDate = new Date(currentDate);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        dateStr,
        isCheckedIn: getCheckInStatus(habit.id, dateStr),
        isToday: i === 0
      });
    }
    return days;
  }, [currentDate, checkIns, habit.id, getCheckInStatus]);

  const handleToggle = (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation();
    toggleCheckIn(habit.id, dateStr);
  };

  return (
    <div 
      className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
      onClick={() => onClick(habit)}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-[#a8e063] flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
          <Smile className="text-yellow-400" size={24} fill="currentColor" />
        </div>
        
        {/* Info */}
        <div className="flex flex-col">
          <span className="text-gray-800 font-medium text-[15px]">{habit.name}</span>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
            <span className="flex items-center">
              <span className="text-gray-400 mr-1">⚡</span> {stats.totalCheckIns}天
            </span>
            <span className="flex items-center">
              <span className="text-gray-400 mr-1">🔥</span> {stats.currentStreak}天
            </span>
          </div>
        </div>
      </div>

      {/* 7-day history dots */}
      <div className="flex items-center gap-1.5">
        {last7Days.map((day) => (
          <div 
            key={day.dateStr}
            onClick={(e) => day.isToday ? handleToggle(e, day.dateStr) : undefined}
            className={clsx(
              "w-4 h-4 rounded-full transition-colors",
              day.isCheckedIn ? "bg-[#e5e7eb]" : "bg-[#f3f4f6]",
              day.isToday && "cursor-pointer hover:bg-gray-300"
            )}
            title={day.dateStr}
          />
        ))}
      </div>
    </div>
  );
};
