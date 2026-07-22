import { create } from 'zustand';
import { Habit, HabitCheckIn, HabitStats } from './habitTypes';
import { habitService } from './habitService';

interface HabitState {
  habits: Habit[];
  checkIns: HabitCheckIn[];
  currentDate: string; // YYYY-MM-DD
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentDate: (date: string) => void;
  loadAll: () => Promise<void>;
  createHabit: (payload: Partial<Habit>) => Promise<void>;
  updateHabit: (id: string, payload: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleCheckIn: (habitId: string, date: string) => Promise<void>;

  // Getters/Computed
  getHabitsForDate: (date: string) => Habit[];
  getCheckInStatus: (habitId: string, date: string) => boolean;
  getStats: (habitId: string, dateStr: string) => HabitStats;
}

const getTodayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  checkIns: [],
  currentDate: getTodayString(),
  isLoading: false,
  error: null,

  setCurrentDate: (date: string) => set({ currentDate: date }),

  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await habitService.loadAll();
      set({ habits: data.habits, checkIns: data.checkIns, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createHabit: async (payload: Partial<Habit>) => {
    try {
      const newHabit = await habitService.createHabit(payload);
      set((state) => ({ habits: [newHabit, ...state.habits] }));
    } catch (error: any) {
      console.error('Failed to create habit', error);
      throw error;
    }
  },

  updateHabit: async (id: string, payload: Partial<Habit>) => {
    try {
      // Optimistic update
      set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? { ...h, ...payload } : h)),
      }));
      await habitService.updateHabit(id, payload);
    } catch (error: any) {
      console.error('Failed to update habit', error);
      // Reload on failure
      get().loadAll();
      throw error;
    }
  },

  deleteHabit: async (id: string) => {
    try {
      set((state) => ({
        habits: state.habits.filter((h) => h.id !== id),
        checkIns: state.checkIns.filter((c) => c.habitId !== id),
      }));
      await habitService.deleteHabit(id);
    } catch (error: any) {
      console.error('Failed to delete habit', error);
      get().loadAll();
      throw error;
    }
  },

  toggleCheckIn: async (habitId: string, date: string) => {
    const isCurrentlyChecked = get().getCheckInStatus(habitId, date);
    const nextStatus = !isCurrentlyChecked;
    
    // Optimistic update
    set((state) => {
      const existingCheckInIndex = state.checkIns.findIndex(
        (c) => c.habitId === habitId && c.date === date
      );

      let newCheckIns = [...state.checkIns];
      if (existingCheckInIndex >= 0) {
        newCheckIns[existingCheckInIndex] = {
          ...newCheckIns[existingCheckInIndex],
          completed: nextStatus,
        };
      } else {
        newCheckIns.push({
          id: 'temp-' + Date.now(),
          habitId,
          date,
          completed: nextStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      return { checkIns: newCheckIns };
    });

    try {
      const realCheckIn = await habitService.toggleCheckIn(habitId, date, nextStatus);
      // Update temp id with real id from DB
      set((state) => {
        const newCheckIns = [...state.checkIns];
        const index = newCheckIns.findIndex((c) => c.habitId === habitId && c.date === date);
        if (index >= 0) {
          newCheckIns[index] = realCheckIn;
        }
        return { checkIns: newCheckIns };
      });
    } catch (error: any) {
      console.error('Failed to toggle checkin', error);
      get().loadAll();
      throw error;
    }
  },

  getHabitsForDate: (dateStr: string) => {
    const { habits } = get();
    const queryDate = new Date(dateStr);
    
    return habits.filter(habit => {
      // 1. startDate logic
      const startDateStr = habit.startDate || habit.createdAt.slice(0, 10);
      if (dateStr < startDateStr) return false;

      // 2. duration logic
      if (habit.duration === '21days') {
        const startDateObj = new Date(startDateStr);
        const endDateObj = new Date(startDateObj);
        endDateObj.setDate(startDateObj.getDate() + 20); // 21 days inclusive
        
        if (queryDate > endDateObj) {
          return false;
        }
      }

      // 3. frequency logic
      // Currently, both 'everyday' and 'weekly' pass through if they fall within the valid date range.
      return true;
    });
  },

  getCheckInStatus: (habitId: string, date: string) => {
    const checkIn = get().checkIns.find(
      (c) => c.habitId === habitId && c.date === date
    );
    return checkIn ? checkIn.completed : false;
  },

  getStats: (habitId: string, dateStr: string) => {
    const { checkIns } = get();
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();

    const totalCheckIns = checkIns.filter(c => c.habitId === habitId && c.completed).length;

    const monthCheckIns = checkIns.filter(c => {
      if (c.habitId !== habitId || !c.completed) return false;
      const cDate = new Date(c.date);
      return cDate.getFullYear() === year && cDate.getMonth() === month;
    }).length;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthlyCompletionRate = Math.round((monthCheckIns / daysInMonth) * 100);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedDates = new Set(
      checkIns
        .filter(c => c.habitId === habitId && c.completed)
        .map(c => c.date)
    );

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const yearStr = checkDate.getFullYear();
      const monthStr = String(checkDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(checkDate.getDate()).padStart(2, '0');
      const dateString = `${yearStr}-${monthStr}-${dayStr}`;

      if (completedDates.has(dateString)) {
        streak++;
      } else if (i === 0) {
        // If today is not checked in, we can still have a streak from yesterday.
        continue;
      } else {
        break;
      }
    }

    return {
      monthCheckIns,
      totalCheckIns,
      monthlyCompletionRate,
      currentStreak: streak,
    };
  },
}));
