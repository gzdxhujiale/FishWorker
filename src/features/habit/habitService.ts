import { invoke } from '@tauri-apps/api/core';
import { Habit, HabitCheckIn, HabitData } from './habitTypes';

export const habitService = {
  async loadAll(): Promise<HabitData> {
    return invoke('habit_load_all');
  },

  async createHabit(payload: Partial<Habit>): Promise<Habit> {
    return invoke('habit_create', { payload });
  },

  async updateHabit(id: string, payload: Partial<Habit>): Promise<void> {
    return invoke('habit_update', { id, payload });
  },

  async deleteHabit(id: string): Promise<void> {
    return invoke('habit_delete', { id });
  },

  async toggleCheckIn(habitId: string, date: string, completed: boolean): Promise<HabitCheckIn> {
    return invoke('habit_toggle_checkin', { habitId, date, completed });
  }
};
