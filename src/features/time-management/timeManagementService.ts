import { invoke } from "@tauri-apps/api/core";
import type { TimeManagementData } from "./timeManagementStore";

export type TimeManagementSyncStatus = {
  state: "saved" | "saving" | "waiting" | "attention";
  pendingCount: number;
};

export const timeManagementApi = {
  load: async (): Promise<TimeManagementData | null> => {
    try {
      const data = await invoke<any>("time_management_load");
      return data as TimeManagementData | null;
    } catch (e) {
      console.error("Failed to load time management data from DB:", e);
      throw e;
    }
  },
  
  save: async (payload: TimeManagementData): Promise<void> => {
    try {
      await invoke("time_management_save", { payload });
    } catch (e) {
      console.error("Failed to save time management data to DB:", e);
      throw e;
    }
  }
};
