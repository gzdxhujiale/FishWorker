import React, { useState, useMemo } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type { Habit, DayInfo, HabitStats } from "./habitTypes";
import { HabitList } from "./components/HabitList";
import { HabitDetailSidebar } from "./components/HabitDetailSidebar";
import { HabitEditModal } from "./components/HabitEditModal";
import "./HabitPanel.css";

// Initial seed data based on the design
const INITIAL_HABITS: Habit[] = [
  {
    id: "habit-1",
    name: "习惯一",
    emoji: "😊",
    color: "#10B981",
    group: "上午",
    frequency: "每天",
    target: "当天完成打卡",
    startDate: "2026-07-01",
    duration: "永远",
    reminderTime: "09:00",
    autoLog: false,
    logs: {
      "2026-07-10": "Done",
      "2026-07-11": "Done",
      "2026-07-14": "Done"
    },
  },
  {
    id: "habit-2",
    name: "每日饮水 2000ml",
    emoji: "💧",
    color: "#3B82F6",
    group: "上午",
    frequency: "每天",
    target: "当天完成打卡",
    startDate: "2026-07-10",
    duration: "永远",
    reminderTime: "10:00",
    autoLog: false,
    logs: {
      "2026-07-12": "Done",
      "2026-07-13": "Done",
      "2026-07-14": "Done",
      "2026-07-15": "Done"
    }
  },
  {
    id: "habit-3",
    name: "阅读半小时",
    emoji: "📚",
    color: "#8B5CF6",
    group: "下午",
    frequency: "每天",
    target: "当天完成打卡",
    startDate: "2026-07-01",
    duration: "永远",
    reminderTime: "21:00",
    autoLog: false,
    logs: {
      "2026-07-14": "Done"
    }
  }
];

// Audio Context helper
const playSuccessSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); 
    gain1.gain.setValueAtTime(0.1, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.log("AudioContext blocked or unsupported", e);
  }
};

export const HabitPanel: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);
  const [selectedHabitId, setSelectedHabitId] = useState<string>(INITIAL_HABITS[0].id);
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Use a fixed anchor date for demo consistency or new Date()
  // The PRD images show July 2026
  const anchorDate = useMemo(() => new Date("2026-07-15"), []);
  const todayStr = "2026-07-15";

  // Generate Week Days
  const weekDays = useMemo(() => {
    const days: DayInfo[] = [];
    const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    for (let i = -6; i <= 0; i++) {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateVal}`;
      days.push({
        name: dayLabels[d.getDay()],
        num: d.getDate(),
        dateStr,
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [anchorDate, todayStr]);

  const activeHabit = habits.find(h => h.id === selectedHabitId) || habits[0];

  const calculateStats = (habit: Habit): HabitStats => {
    if (!habit) return { monthCount: 0, totalCount: 0, completionRate: 0, currentStreak: 0 };
    const loggedDates = Object.keys(habit.logs || {}).sort();
    const totalCount = loggedDates.length;
    const monthCount = loggedDates.filter(d => d.startsWith('2026-07')).length;
    const completionRate = Math.round((monthCount / 31) * 100);

    let currentStreak = 0;
    let checkDate = new Date(todayStr);
    
    while (true) {
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, '0');
      const dateVal = String(checkDate.getDate()).padStart(2, '0');
      const checkStr = `${year}-${month}-${dateVal}`;

      if (habit.logs && habit.logs[checkStr] !== undefined) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (checkStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          const y = checkDate.getFullYear();
          const m = String(checkDate.getMonth() + 1).padStart(2, '0');
          const dVal = String(checkDate.getDate()).padStart(2, '0');
          if (habit.logs && habit.logs[`${y}-${m}-${dVal}`] !== undefined) {
            continue;
          }
        }
        break;
      }
    }
    return { monthCount, totalCount, completionRate, currentStreak };
  };

  const handleToggleCheckIn = (habitId: string, dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const newLogs = { ...h.logs };
        if (newLogs[dateStr]) {
          delete newLogs[dateStr];
        } else {
          newLogs[dateStr] = "Done";
          playSuccessSound();
        }
        return { ...h, logs: newLogs };
      }
      return h;
    }));
  };

  const handleSaveHabit = (updatedHabit: Habit) => {
    if (editingHabit) {
      setHabits(prev => prev.map(h => h.id === updatedHabit.id ? updatedHabit : h));
    } else {
      setHabits(prev => [...prev, updatedHabit]);
      setSelectedHabitId(updatedHabit.id);
    }
    setIsEditModalOpen(false);
    setEditingHabit(null);
  };

  const handleDeleteHabit = () => {
    if (window.confirm("确定要删除这个习惯吗？")) {
      setHabits(prev => prev.filter(h => h.id !== activeHabit.id));
      setIsDetailOpen(false);
    }
  };

  return (
    <div className="habit-panel-root">
      <header className="habit-header">
        <button className="habit-header-title">
          习惯
          <ChevronDown size={20} className="text-slate-500" />
        </button>
        <button 
          className="habit-header-new-btn"
          onClick={() => { setEditingHabit(null); setIsEditModalOpen(true); }}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </header>

      <div className="habit-body">
        <HabitList 
          habits={habits}
          weekDays={weekDays}
          activeHabit={activeHabit}
          selectedHabitId={selectedHabitId}
          onSelectHabit={(id) => { setSelectedHabitId(id); setIsDetailOpen(true); }}
          onToggleCheckIn={handleToggleCheckIn}
          onCreateNew={() => { setEditingHabit(null); setIsEditModalOpen(true); }}
          calculateStats={calculateStats}
        />

        {isDetailOpen && activeHabit && (
          <HabitDetailSidebar 
            habit={activeHabit}
            stats={calculateStats(activeHabit)}
            onClose={() => setIsDetailOpen(false)}
            onEdit={() => { setEditingHabit(activeHabit); setIsEditModalOpen(true); }}
            onDelete={handleDeleteHabit}
            currentDate={anchorDate}
          />
        )}
      </div>

      {isEditModalOpen && (
        <HabitEditModal 
          habit={editingHabit}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveHabit}
        />
      )}
    </div>
  );
};
