import { invoke } from '@tauri-apps/api/core';
import { FavoriteFocusTask, PomodoroRecord } from './pomodoroTypes';

const STORAGE_KEY_RECORDS = 'fishworker_pomodoro_records_v1';
const STORAGE_KEY_FAVORITES = 'fishworker_pomodoro_favorites_v1';

export interface PomodoroData {
  records: PomodoroRecord[];
  favoriteTasks: FavoriteFocusTask[];
}

export const pomodoroService = {
  async loadAll(): Promise<PomodoroData> {
    try {
      const data = await invoke<PomodoroData>('pomodoro_load_all');
      if (data && (data.records || data.favoriteTasks)) {
        return {
          records: data.records || [],
          favoriteTasks: data.favoriteTasks || [],
        };
      }
    } catch (e) {
      // Offline / Web browser fallback
    }

    // Local storage fallback
    let records: PomodoroRecord[] = [];
    let favoriteTasks: FavoriteFocusTask[] = [];
    try {
      const rawRecs = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (rawRecs) records = JSON.parse(rawRecs);

      const rawFavs = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (rawFavs) favoriteTasks = JSON.parse(rawFavs);
    } catch (e) {
      console.error('Failed to parse local storage fallback for pomodoro', e);
    }

    return { records, favoriteTasks };
  },

  async upsertRecord(record: PomodoroRecord): Promise<void> {
    try {
      await invoke('pomodoro_upsert_record', { record });
    } catch (e) {
      // Fallback handled by local memory + localStorage
    }
  },

  async deleteRecord(id: string): Promise<void> {
    try {
      await invoke('pomodoro_delete_record', { id });
    } catch (e) {
      // Fallback handled by local memory + localStorage
    }
  },

  async upsertFavoriteTask(task: FavoriteFocusTask): Promise<void> {
    try {
      await invoke('pomodoro_upsert_favorite', { task });
    } catch (e) {
      // Fallback handled by local memory + localStorage
    }
  },

  async deleteFavoriteTask(id: string): Promise<void> {
    try {
      await invoke('pomodoro_delete_favorite', { id });
    } catch (e) {
      // Fallback handled by local memory + localStorage
    }
  },
};
