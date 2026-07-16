export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  group: string;
  frequency: string;
  target: string;
  startDate: string; // YYYY-MM-DD
  duration: string;
  reminderTime: string; // HH:mm
  autoLog: boolean;
  logs: Record<string, string>; // Map of Date (YYYY-MM-DD) to log note
}

export interface HabitStats {
  monthCount: number;
  totalCount: number;
  completionRate: number;
  currentStreak: number;
}

export interface DayInfo {
  name: string;
  num: number;
  dateStr: string; // YYYY-MM-DD
  isToday: boolean;
}
