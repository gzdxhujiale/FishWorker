import { create } from 'zustand';
import { DailyReview, DailyReviewData, CompoundStats } from './dailyReviewTypes';
import { dailyReviewApi } from './dailyReviewService';
import { createSyncEngine } from '../../lib/createSyncEngine';

const STORAGE_KEY = 'aistudy_daily_review_data';

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
  if (!content) return true;
  const trimmed = content.trim();
  if (trimmed === '' || trimmed === '{}') {
    return true;
  }
  try {
    const json = JSON.parse(trimmed);
    if (!json.content || !Array.isArray(json.content) || json.content.length === 0) return true;
    if (json.content.length === 1) {
      const p = json.content[0];
      if (p.type === 'paragraph' && (!p.content || p.content.length === 0)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

interface DailyReviewStore {
  data: DailyReviewData;

  // Public Actions
  syncAllFromDB: () => Promise<void>;
  getAllReviews: () => DailyReview[];
  getReviewByDate: (date: string) => DailyReview | undefined;
  getCompoundStats: () => CompoundStats;
  saveReview: (date: string, content: string, rating?: number, isHighFreq?: boolean) => DailyReview;
  deleteReview: (id: string) => void;
}

const syncEngine = createSyncEngine();

function saveLocal(data: DailyReviewData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save daily review data:', err);
  }
}

function loadLocal(): DailyReviewData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as DailyReviewData) : null;
  } catch (err) {
    console.error('Failed to load daily review data:', err);
    return null;
  }
}

export const useDailyReviewStore = create<DailyReviewStore>((set, get) => ({
  data: defaultData,

  syncAllFromDB: async () => {
    try {
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
        saveLocal(newData);
        set({ data: newData });
      }
    } catch (e) {
      console.error('Daily review sync from DB failed:', e);
    }
  },

  getReviewByDate: (date: string): DailyReview | undefined => {
    return get().data.reviews.find(r => r.date === date);
  },

  getAllReviews: (): DailyReview[] => {
    return get().data.reviews
      .filter(r => !isReviewEmpty(r.content) || (r.rating !== undefined && r.rating > 0))
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

    const newData = { ...data, reviews: newReviews };
    saveLocal(newData);
    set({ data: newData });
    syncEngine.schedule(review.id, () => dailyReviewApi.save(review), (isHighFreq ?? true) ? 500 : 300);
    return review;
  },

  deleteReview: (id: string): void => {
    const data = get().data;
    const newReviews = data.reviews.filter(r => r.id !== id);
    const newData = { ...data, reviews: newReviews };
    saveLocal(newData);
    set({ data: newData });

    syncEngine.cancel(id);
    dailyReviewApi.delete(id).catch(e => {
      console.error('Failed to delete review:', e);
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

// Initialize data
const initial = loadLocal();
if (initial) {
  useDailyReviewStore.setState({ data: initial });
}
