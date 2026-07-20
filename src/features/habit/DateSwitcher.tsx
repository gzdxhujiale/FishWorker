import React from 'react';
import clsx from 'clsx';

interface DateSwitcherProps {
  currentDate: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

const getDaysAround = () => {
  const base = new Date();
  const days = [];
  for (let i = -6; i <= 0; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    days.push({
      dateStr: `${year}-${month}-${day}`,
      dayNum: d.getDate(),
      dayOfWeek: d.getDay() // 0 is Sunday, 1 is Monday...
    });
  }
  return days;
};

const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export const DateSwitcher: React.FC<DateSwitcherProps> = ({ currentDate, onChange }) => {
  const days = getDaysAround();
  
  return (
    <div className="flex items-center justify-between px-4 py-4 bg-white relative">
      <div className="flex gap-6 md:gap-8 overflow-x-auto w-full hide-scrollbar pb-1 justify-between px-2">
        {days.map((d) => {
          const isSelected = d.dateStr === currentDate;
          
          return (
            <div
              key={d.dateStr}
              onClick={() => onChange(d.dateStr)}
              className="flex flex-col items-center justify-center w-12 cursor-pointer transition-all duration-200 shrink-0 gap-1"
            >
              <span className={clsx("text-xs font-medium", isSelected ? "text-blue-500" : "text-gray-400")}>
                {WEEK_DAYS[d.dayOfWeek]}
              </span>
              <span className={clsx("text-lg font-bold", isSelected ? "text-blue-500" : "text-gray-600")}>
                {d.dayNum}
              </span>
              <div className={clsx("w-[18px] h-[18px] rounded-full border-2 mt-1", isSelected ? "border-gray-200" : "border-gray-200")}>
                {/* Placeholder for status circle (e.g. hatched/solid) */}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
