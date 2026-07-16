import React, { useState } from "react";
import { Check, ChevronRight, Inbox } from "lucide-react";
import type { Habit, DayInfo, HabitStats } from "../habitTypes";
import { HabitCard } from "./HabitCard";

interface HabitListProps {
  habits: Habit[];
  weekDays: DayInfo[];
  activeHabit: Habit | null;
  selectedHabitId: string;
  onSelectHabit: (id: string) => void;
  onToggleCheckIn: (habitId: string, dateStr: string, e: React.MouseEvent) => void;
  onCreateNew: () => void;
  calculateStats: (habit: Habit) => HabitStats;
}

export const HabitList: React.FC<HabitListProps> = ({
  habits,
  weekDays,
  activeHabit,
  selectedHabitId,
  onSelectHabit,
  onToggleCheckIn,
  onCreateNew,
  calculateStats,
}) => {
  const [isGroupOpen, setIsGroupOpen] = useState<Record<string, boolean>>({
    上午: true,
    下午: true,
    晚上: true,
    其他: true,
  });

  const groups = Array.from(new Set(habits.map((h) => h.group)));
  // Ensure default groups exist if they have items, or fallback to fixed list
  const displayGroups = groups.length > 0 ? groups : ["上午", "下午", "晚上"];

  const toggleGroup = (group: string) => {
    setIsGroupOpen((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <main className="habit-main">
      {/* Weekly Nav */}
      <div className="habit-week-nav">
        <div className="habit-week-grid">
          {weekDays.map((day) => {
            const isChecked = activeHabit?.logs[day.dateStr] !== undefined;
            
            let btnClass = "habit-check-circle";
            if (isChecked) {
              btnClass += " checked";
            } else if (day.isToday) {
              btnClass += " unchecked-today";
            } else {
              btnClass += " unchecked-other";
            }

            return (
              <div key={day.dateStr} className="habit-day-col">
                <span className={`habit-day-name ${day.isToday ? "is-today" : ""}`}>
                  {day.name}
                </span>
                <span className={`habit-day-num ${day.isToday ? "is-today" : ""}`}>
                  {day.num}
                </span>

                <button
                  onClick={(e) => onToggleCheckIn(activeHabit?.id || "", day.dateStr, e)}
                  className={btnClass}
                  disabled={!activeHabit}
                >
                  {isChecked ? (
                    <Check />
                  ) : (
                    day.isToday && <span className="habit-check-circle-pulse"></span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="habit-content">
        {displayGroups.map((groupName) => {
          const groupHabits = habits.filter((h) => h.group === groupName);
          if (groupHabits.length === 0) return null;

          const isOpen = isGroupOpen[groupName] !== false; // default true

          return (
            <div key={groupName} className="habit-group">
              <button
                className="habit-group-header"
                onClick={() => toggleGroup(groupName)}
              >
                <ChevronRight className={isOpen ? "open" : "closed"} />
                <span>{groupName}</span>
                <span className="habit-group-badge">{groupHabits.length}</span>
              </button>

              {isOpen && (
                <div className="habit-group-list">
                  {groupHabits.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      isSelected={selectedHabitId === habit.id}
                      stats={calculateStats(habit)}
                      weekDays={weekDays}
                      onClick={() => onSelectHabit(habit.id)}
                      onToggleCheckIn={onToggleCheckIn}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {habits.length === 0 && (
          <div className="habit-empty-state">
            <div className="habit-empty-icon">
              <Inbox size={32} />
            </div>
            <h3 className="habit-empty-title">现在还没有创建任何习惯</h3>
            <p className="habit-empty-desc">
              添加一个新习惯，开始记录和追踪您每日的自律生活吧。
            </p>
            <button className="habit-empty-btn" onClick={onCreateNew}>
              新建首个习惯
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
