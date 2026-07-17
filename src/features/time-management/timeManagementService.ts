import { invoke } from "@tauri-apps/api/core";
import type { TimeManagementData } from "./timeManagementStore";
import type { Role, Task } from "./timeManagementTypes";

export const timeManagementApi = {
  loadAll: async (): Promise<TimeManagementData | null> => {
    try {
      const data = await invoke<any>("tm_load_all");
      return data as TimeManagementData | null;
    } catch (e) {
      console.error("Failed to load time management data from DB:", e);
      throw e;
    }
  },
  
  upsertRole: async (role: Role): Promise<void> => {
    try {
      await invoke("tm_upsert_role", { role });
    } catch (e) {
      console.error("Failed to upsert role:", e);
      throw e;
    }
  },

  deleteRole: async (id: string): Promise<void> => {
    try {
      await invoke("tm_delete_role", { id });
    } catch (e) {
      console.error("Failed to delete role:", e);
      throw e;
    }
  },

  upsertTask: async (task: Task): Promise<void> => {
    try {
      await invoke("tm_upsert_task", { task });
    } catch (e) {
      console.error("Failed to upsert task:", e);
      throw e;
    }
  },

  deleteTask: async (id: string): Promise<void> => {
    try {
      await invoke("tm_delete_task", { id });
    } catch (e) {
      console.error("Failed to delete task:", e);
      throw e;
    }
  }
};
