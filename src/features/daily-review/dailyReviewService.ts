import { invoke } from "@tauri-apps/api/core";
import type { DailyReview } from "./dailyReviewTypes";

export const dailyReviewApi = {
  loadAll: async (): Promise<DailyReview[]> => {
    try {
      const data = await invoke<DailyReview[]>("daily_review_load_all");
      return data;
    } catch (e) {
      console.error("Failed to load daily reviews from DB:", e);
      throw e;
    }
  },
  
  save: async (review: DailyReview): Promise<void> => {
    try {
      await invoke("daily_review_save", { review });
    } catch (e) {
      console.error("Failed to save daily review to DB:", e);
      throw e;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await invoke("daily_review_delete", { id });
    } catch (e) {
      console.error("Failed to delete daily review from DB:", e);
      throw e;
    }
  }
};
