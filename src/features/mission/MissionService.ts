import { invoke } from "@tauri-apps/api/core";
import type { MissionAllData, MissionStatement, Role, Goal } from "./MissionTypes";

export const missionService = {
  loadAll: async (): Promise<MissionAllData> => {
    try {
      return await invoke<MissionAllData>("mission_load_all");
    } catch (e) {
      console.error("Failed to load mission data:", e);
      throw e;
    }
  },

  saveStatement: async (content: string): Promise<MissionStatement> => {
    try {
      return await invoke<MissionStatement>("mission_save_statement", { content });
    } catch (e) {
      console.error("Failed to save mission statement:", e);
      throw e;
    }
  },

  createRole: async (name: string, icon: string, sortOrder: number): Promise<Role> => {
    try {
      return await invoke<Role>("mission_create_role", { name, icon, sortOrder });
    } catch (e) {
      console.error("Failed to create role:", e);
      throw e;
    }
  },

  updateRole: async (id: string, name: string, icon: string): Promise<void> => {
    try {
      await invoke("mission_update_role", { id, name, icon });
    } catch (e) {
      console.error("Failed to update role:", e);
      throw e;
    }
  },

  deleteRole: async (id: string): Promise<void> => {
    try {
      await invoke("mission_delete_role", { id });
    } catch (e) {
      console.error("Failed to delete role:", e);
      throw e;
    }
  },

  reorderRoles: async (items: [string, number][]): Promise<void> => {
    try {
      await invoke("mission_reorder_roles", { items });
    } catch (e) {
      console.error("Failed to reorder roles:", e);
      throw e;
    }
  },

  createGoal: async (roleId: string, title: string, sortOrder: number): Promise<Goal> => {
    try {
      return await invoke<Goal>("mission_create_goal", { roleId, title, sortOrder });
    } catch (e) {
      console.error("Failed to create goal:", e);
      throw e;
    }
  },

  updateGoal: async (
    id: string,
    updates: { title?: string; status?: string; timeScope?: string; startDate?: string | null; endDate?: string | null }
  ): Promise<void> => {
    try {
      await invoke("mission_update_goal", {
        id,
        title: updates.title ?? null,
        status: updates.status ?? null,
        timeScope: updates.timeScope ?? null,
        startDate: updates.startDate !== undefined ? updates.startDate : null,
        endDate: updates.endDate !== undefined ? updates.endDate : null,
      });
    } catch (e) {
      console.error("Failed to update goal:", e);
      throw e;
    }
  },

  deleteGoal: async (id: string): Promise<void> => {
    try {
      await invoke("mission_delete_goal", { id });
    } catch (e) {
      console.error("Failed to delete goal:", e);
      throw e;
    }
  },

  reorderGoals: async (roleId: string, items: [string, number][]): Promise<void> => {
    try {
      await invoke("mission_reorder_goals", { roleId, items });
    } catch (e) {
      console.error("Failed to reorder goals:", e);
      throw e;
    }
  },
};
