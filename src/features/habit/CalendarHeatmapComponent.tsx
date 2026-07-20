import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { Habit } from './habitTypes';
import { useHabitStore } from './habitStore';

interface CalendarHeatmapComponentProps {
  habit: Habit;
}

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日'];

export const CalendarHeatmapComponent: React.FC<CalendarHeatmapComponentProps> = ({ habit }) => {
  const checkIns = useHabitStore(state => state.checkIns);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Adjust so Monday is 0, Sunday is 6
    let startingDay = firstDay.getDay() - 1;
    if (startingDay === -1) startingDay = 6;
    
    // Days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Days in previous month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Previous month days
    for (let i = 0; i < startingDay; i++) {
      days.push({
        date: new Date(year, month - 1, prevMonthTotalDays - startingDay + i + 1),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next month days to complete the grid (usually 42 cells total)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Helper to check if a date is checked in
  const isCheckedIn = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return checkIns.some(ci => ci.habitId === habit.id && ci.date === dateStr && ci.completed);
  };

  // Helper to check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-6 px-2">
        <button onClick={handlePrevMonth} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-[15px] font-medium text-gray-800">
          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
        </span>
        <button onClick={handleNextMonth} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 w-full text-center gap-y-4">
        {WEEK_DAYS.map(day => (
          <div key={day} className="text-xs text-gray-500 font-medium mb-2">{day}</div>
        ))}
        
        {daysInMonth.map((dayInfo, idx) => {
          const checkedIn = isCheckedIn(dayInfo.date);
          const today = isToday(dayInfo.date);
          
          return (
            <div key={idx} className="flex flex-col items-center justify-center gap-1.5">
              <span className={clsx(
                "text-xs font-medium",
                !dayInfo.isCurrentMonth ? "text-gray-300" :
                today ? "text-blue-500 font-bold" : "text-gray-600"
              )}>
                {dayInfo.date.getDate()}
              </span>
              <div className={clsx(
                "w-6 h-6 rounded-full",
                checkedIn ? "bg-[#a8e063] shadow-sm" : "bg-[#f3f4f6]"
              )} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
