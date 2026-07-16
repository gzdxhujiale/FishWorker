import React from "react";
import { Check, Flame, Target } from "lucide-react";
import type { Habit, DayInfo, HabitStats } from "../habitTypes";

interface HabitCardProps {
  habit: Habit;
  isSelected: boolean;
  stats: HabitStats;
  weekDays: DayInfo[];
  onClick: () => void;
  onToggleCheckIn: (habitId: string, dateStr: string, e: React.MouseEvent) => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  isSelected,
  stats,
  weekDays,
  onClick,
  onToggleCheckIn,
}) => {
  return (
    <div
      className={`habit-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="habit-card-left">
        <div className="habit-card-icon">{habit.emoji}</div>
        <div className="habit-card-info">
          <h4 className="habit-card-name">{habit.name}</h4>
          <div className="habit-card-stats">
            <span className="habit-card-stat-item">
              <Target size={14} className="text-sky-400" strokeWidth={2.5} style={{ color: '#38BDF8' }} />
              {stats.totalCount}天
            </span>
            <span className="habit-card-stat-item">
              <Flame size={14} className="text-amber-500" strokeWidth={2.5} style={{ color: '#F59E0B' }} />
              {stats.currentStreak}天
            </span>
          </div>
        </div>
      </div>

      <div className="habit-card-right">
        {weekDays.map((day) => {
          const isChecked = habit.logs[day.dateStr] !== undefined;
          return (
            <button
              key={day.dateStr}
              onClick={(e) => onToggleCheckIn(habit.id, day.dateStr, e)}
              className={`habit-mini-check ${isChecked ? "checked" : "unchecked"}`}
              title={`${day.name} (${day.dateStr})`}
            >
              {isChecked ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                <span className="habit-mini-check-dot"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
