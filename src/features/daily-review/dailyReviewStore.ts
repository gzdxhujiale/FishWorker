import { create } from 'zustand';
import { DailyReview, DailyReviewData, CompoundStats } from './dailyReviewTypes';
import { dailyReviewApi } from './dailyReviewService';

const STORAGE_KEY = 'aistudy_daily_review_data';

export type SyncStatus = 'saved' | 'saving' | 'error';

const defaultData: DailyReviewData = {
  reviews: []
};

function getDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function isReviewEmpty(content: string): boolean {
  return !content || content === '<p></p>' || content === '<p></p>\n';
}

interface DailyReviewStore {
  data: DailyReviewData;
  syncStatus: SyncStatus;
  
  // Internal/System
  _pendingSaves: Map<string, number>;
  load: () => void;
  save: (data: DailyReviewData) => void;
  setSyncStatus: (status: SyncStatus) => void;
  triggerDBSync: (review: DailyReview, isHighFreq?: boolean) => void;
  
  // Public Actions
  syncAllFromDB: () => Promise<void>;
  getAllReviews: () => DailyReview[];
  getReviewByDate: (date: string) => DailyReview | undefined;
  getCompoundStats: () => CompoundStats;
  saveReview: (date: string, content: string, rating?: number, isHighFreq?: boolean) => DailyReview;
  deleteReview: (id: string) => void;
}

export const useDailyReviewStore = create<DailyReviewStore>((set, get) => ({
  data: defaultData,
  syncStatus: 'saved',
  _pendingSaves: new Map<string, number>(),

  load: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ data: JSON.parse(stored) as DailyReviewData });
      }
    } catch (err) {
      console.error('Failed to load daily review data:', err);
    }
  },

  save: (data: DailyReviewData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      set({ data });
    } catch (err) {
      console.error('Failed to save daily review data:', err);
    }
  },

  setSyncStatus: (status: SyncStatus) => {
    set({ syncStatus: status });
  },

  syncAllFromDB: async () => {
    try {
      get().setSyncStatus('saving');
      const dbReviews = await dailyReviewApi.loadAll();
      
      const localData = get().data;
      const mergedMap = new Map<string, DailyReview>();
      localData.reviews.forEach(r => mergedMap.set(r.date, r));
      
      let changed = false;
      dbReviews.forEach(dbR => {
        const localR = mergedMap.get(dbR.date);
        if (!localR || dbR.updatedAt > localR.updatedAt) {
          mergedMap.set(dbR.date, dbR);
          changed = true;
        }
      });

      if (changed) {
        const newData = { ...localData, reviews: Array.from(mergedMap.values()) };
        get().save(newData);
      }
      get().setSyncStatus('saved');
    } catch (e) {
      console.error('Sync failed', e);
      get().setSyncStatus('error');
    }
  },

  triggerDBSync: (review: DailyReview, isHighFreq: boolean = true) => {
    const state = get();
    state.setSyncStatus('saving');
    
    if (state._pendingSaves.has(review.id)) {
      window.clearTimeout(state._pendingSaves.get(review.id));
    }

    const delay = isHighFreq ? 500 : 300;

    const timeout = window.setTimeout(async () => {
      try {
        await dailyReviewApi.save(review);
        const latestState = get();
        latestState._pendingSaves.delete(review.id);
        if (latestState._pendingSaves.size === 0) {
          latestState.setSyncStatus('saved');
        }
      } catch (e) {
        get().setSyncStatus('error');
      }
    }, delay);
    
    state._pendingSaves.set(review.id, timeout);
  },

  getReviewByDate: (date: string): DailyReview | undefined => {
    return get().data.reviews.find(r => r.date === date);
  },

  getAllReviews: (): DailyReview[] => {
    return get().data.reviews
      .filter(r => !isReviewEmpty(r.content))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  saveReview: (date: string, content: string, rating?: number, isHighFreq?: boolean): DailyReview => {
    const data = get().data;
    const existingIndex = data.reviews.findIndex(r => r.date === date);
    
    if (isReviewEmpty(content) && (rating === undefined || rating === 0)) {
      if (existingIndex !== -1) {
        const id = data.reviews[existingIndex].id;
        get().deleteReview(id);
      }
      return {
        id: '',
        date,
        content: '',
        rating: 0,
        createdAt: 0,
        updatedAt: 0
      };
    }
    
    let review: DailyReview;
    const newReviews = [...data.reviews];
    
    if (existingIndex !== -1) {
      review = {
        ...newReviews[existingIndex],
        content,
        rating: rating !== undefined ? rating : newReviews[existingIndex].rating,
        updatedAt: Date.now()
      };
      newReviews[existingIndex] = review;
    } else {
      review = {
        id: crypto.randomUUID(),
        date,
        content,
        rating: rating || 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      newReviews.push(review);
    }
    
    get().save({ ...data, reviews: newReviews });
    get().triggerDBSync(review, isHighFreq ?? true);
    return review;
  },

  deleteReview: (id: string): void => {
    const data = get().data;
    const newReviews = data.reviews.filter(r => r.id !== id);
    get().save({ ...data, reviews: newReviews });

    get().setSyncStatus('saving');
    dailyReviewApi.delete(id).then(() => {
      get().setSyncStatus('saved');
    }).catch(() => {
      get().setSyncStatus('error');
    });
  },

  getCompoundStats: (): CompoundStats => {
    const reviews = get().data.reviews.filter(r => !isReviewEmpty(r.content));
    if (reviews.length === 0) {
      return { currentStreak: 0, longestStreak: 0, totalReviews: 0, compoundValue: 1.00 };
    }

    const dates = [...new Set(reviews.map(r => r.date))].sort();
    
    let currentStreak = 1;
    let longestStreak = 1;
    let streakCount = 1;

    for (let i = 1; i < dates.length; i++) {
      const diff = getDaysDifference(dates[i - 1], dates[i]);
      if (diff === 1) {
        streakCount++;
        longestStreak = Math.max(longestStreak, streakCount);
      } else {
        streakCount = 1;
      }
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const lastDate = dates[dates.length - 1];
    
    if (lastDate === todayStr || lastDate === yesterdayStr) {
      currentStreak = streakCount;
    } else {
      currentStreak = 0;
    }

    const compoundValue = parseFloat(Math.pow(1.01, currentStreak).toFixed(4));

    return {
      currentStreak,
      longestStreak,
      totalReviews: dates.length,
      compoundValue
    };
  }
}));

// Initialize load when imported
useDailyReviewStore.getState().load();
