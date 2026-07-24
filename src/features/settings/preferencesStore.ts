import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface PreferencesState {
  preferences: Record<string, string>;
  initialized: boolean;
  
  getPreference: (key: string, defaultValue?: string) => string;
  setPreference: (key: string, value: string) => Promise<void>;
  init: () => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  preferences: {},
  initialized: false,

  getPreference: (key: string, defaultValue: string = '') => {
    return get().preferences[key] ?? localStorage.getItem(key) ?? defaultValue;
  },

  setPreference: async (key: string, value: string) => {
    set(state => ({
      preferences: {
        ...state.preferences,
        [key]: value
      }
    }));
    localStorage.setItem(key, value);
    try {
      await invoke('db_set_preference', { key, value });
    } catch (e) {
      console.error(`Failed to save preference ${key} to DB:`, e);
    }
  },

  init: async () => {
    if (get().initialized) return;
    try {
      const keysToLoad = ['tm-hide-completed', 'lists-sidebar-collapsed', 'lists-active-list-id', 'lists-note-open-mode'];
      const loadedPrefs: Record<string, string> = {};
      
      for (const key of keysToLoad) {
        try {
          const val = await invoke<string | null>('db_get_preference', { key });
          if (val !== null) {
            loadedPrefs[key] = val;
            localStorage.setItem(key, val);
          }
        } catch (e) {
          console.error(`Failed to load preference ${key} from DB:`, e);
        }
      }

      set(state => ({
        preferences: {
          ...state.preferences,
          ...loadedPrefs
        },
        initialized: true
      }));
    } catch (e) {
      console.error('Failed to initialize preferences:', e);
      set({ initialized: true });
    }
  }
}));

// Initialize
usePreferencesStore.getState().init();
