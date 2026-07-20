import React, { useMemo } from 'react';
import { Habit } from './habitTypes';
import { useHabitStore } from './habitStore';
import { CheckCircle2, Zap, PieChart, Flame, ArrowRightLeft } from 'lucide-react';

interface OverviewCardsProps {
  habit: Habit;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ habit }) => {
  const currentDate = useHabitStore(state => state.currentDate);
  const checkIns = useHabitStore(state => state.checkIns);
  const getStats = useHabitStore(state => state.getStats);
  
  const stats = useMemo(() => getStats(habit.id, currentDate), [checkIns, habit.id, currentDate, getStats]);
  
  const monthlyStats = useMemo(() => {
    const dateObj = new Date(currentDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth(); // 0-indexed
    
    // Total days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Count checkins for this month
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthlyCheckInsCount = checkIns.filter(ci => 
      ci.habitId === habit.id && 
      ci.completed && 
      ci.date.startsWith(monthPrefix)
    ).length;
    
    // Completion rate
    const completionRate = Math.round((monthlyCheckInsCount / daysInMonth) * 100);
    
    return {
      monthlyCheckInsCount,
      completionRate
    };
  }, [checkIns, habit.id, currentDate]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 月打卡数 */}
      <div className="bg-white rounded-xl p-4 flex flex-col justify-between border border-gray-50 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          <CheckCircle2 size={16} className="text-[#32d74b]" />
          <span className="text-[13px] text-gray-600">月打卡</span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-[28px] font-medium text-gray-800 leading-none">{monthlyStats.monthlyCheckInsCount}</span>
          <span className="text-[13px] text-gray-500">天</span>
        </div>
      </div>

      {/* 总打卡数 */}
      <div className="bg-white rounded-xl p-4 flex flex-col justify-between border border-gray-50 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          <Zap size={16} className="text-[#0a84ff]" />
          <span className="text-[13px] text-gray-600">总打卡</span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-[28px] font-medium text-gray-800 leading-none">{stats.totalCheckIns}</span>
          <span className="text-[13px] text-gray-500">天</span>
        </div>
      </div>

      {/* 月完成率 */}
      <div className="bg-white rounded-xl p-4 flex flex-col justify-between border border-gray-50 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          <PieChart size={16} className="text-[#ff9f0a]" />
          <span className="text-[13px] text-gray-600">月完成率</span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-[28px] font-medium text-gray-800 leading-none">{monthlyStats.completionRate}</span>
          <span className="text-[13px] text-gray-500">%</span>
        </div>
      </div>

      {/* 当前连续 */}
      <div className="bg-white rounded-xl p-4 flex flex-col justify-between border border-gray-50 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          <Flame size={16} className="text-[#ff453a]" />
          <span className="text-[13px] text-gray-600">当前连续</span>
          <ArrowRightLeft size={12} className="text-gray-400 ml-auto" />
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-[28px] font-medium text-gray-800 leading-none">{stats.currentStreak}</span>
          <span className="text-[13px] text-gray-500">天</span>
        </div>
      </div>
    </div>
  );
};
