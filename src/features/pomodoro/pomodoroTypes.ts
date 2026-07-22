export type PomodoroMode = 'pomodoro' | 'stopwatch'; // 番茄计时 | 正计时
export type PomodoroPhase = 'focus' | 'break'; // 专注 | 休息

export interface LinkedTarget {
  type: 'quadrant' | 'habit';
  id: string;
  title: string;
}

export interface FavoriteFocusTask {
  id: string;
  name: string;
  icon: string; // Emoji or icon indicator e.g. "😊"
  mode: PomodoroMode;
  durationMinutes: number; // default 25
  accumulatedMinutes: number; // accumulated focus minutes
  linkedTarget?: LinkedTarget;
  isArchived: boolean;
  createdAt: string;
}

export interface PomodoroRecord {
  id: string;
  mode: PomodoroMode;
  phase: PomodoroPhase;
  startTime: string; // "14:08"
  endTime: string;   // "14:33"
  durationMinutes: number;
  date: string;      // YYYY-MM-DD
  dateLabel: string; // "7月22日"
  timeRangeLabel: string; // "14:08 - 14:33"
  taskId?: string;
  linkedTarget?: LinkedTarget;
  createdAt: string;
}

export interface PomodoroStats {
  todayCount: number;         // 今日番茄
  todayFocusMinutes: number;  // 今日专注时长 (分钟)
  totalCount: number;         // 总番茄
  totalFocusMinutes: number;  // 总专注时长 (分钟)
}
