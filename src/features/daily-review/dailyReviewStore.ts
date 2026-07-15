import { DailyReview, DailyReviewData, CompoundStats } from './dailyReviewTypes';
import { dailyReviewApi } from './dailyReviewService';

const STORAGE_KEY = 'aistudy_daily_review_data';

export type SyncStatus = 'saved' | 'saving' | 'error';
let currentSyncStatus: SyncStatus = 'saved';
const pendingSaves = new Map<string, number>();

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

export const dailyReviewStore = {
  load(): DailyReviewData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as DailyReviewData;
      }
    } catch (err) {
      console.error('Failed to load daily review data:', err);
    }
    return defaultData;
  },

  save(data: DailyReviewData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // Dispatch an event so other components can reactively update
      window.dispatchEvent(new Event('daily-review-updated'));
    } catch (err) {
      console.error('Failed to save daily review data:', err);
    }
  },

  getSyncStatus(): SyncStatus {
    return currentSyncStatus;
  },

  setSyncStatus(status: SyncStatus) {
    currentSyncStatus = status;
    window.dispatchEvent(new Event('daily-review-sync-updated'));
  },

  async syncAllFromDB() {
    try {
      this.setSyncStatus('saving');
      const dbReviews = await dailyReviewApi.loadAll();
      const localData = this.load();
      
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
        localData.reviews = Array.from(mergedMap.values());
        this.save(localData);
      }
      this.setSyncStatus('saved');
    } catch (e) {
      console.error('Sync failed', e);
      this.setSyncStatus('error');
    }
  },

  triggerDBSync(review: DailyReview, isHighFreq: boolean = true) {
    this.setSyncStatus('saving');
    
    if (pendingSaves.has(review.id)) {
      window.clearTimeout(pendingSaves.get(review.id));
    }

    const delay = isHighFreq ? 500 : 300;

    const timeout = window.setTimeout(async () => {
      try {
        await dailyReviewApi.save(review);
        pendingSaves.delete(review.id);
        if (pendingSaves.size === 0) {
          this.setSyncStatus('saved');
        }
      } catch (e) {
        this.setSyncStatus('error');
      }
    }, delay);
    
    pendingSaves.set(review.id, timeout);
  },

  getReviewByDate(date: string): DailyReview | undefined {
    const data = this.load();
    return data.reviews.find(r => r.date === date);
  },

  getAllReviews(): DailyReview[] {
    return this.load().reviews
      .filter(r => !isReviewEmpty(r.content))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  saveReview(date: string, content: string, rating?: number, isHighFreq?: boolean): DailyReview {
    const data = this.load();
    const existingIndex = data.reviews.findIndex(r => r.date === date);
    
    if (isReviewEmpty(content) && (rating === undefined || rating === 0)) {
      if (existingIndex !== -1) {
        const id = data.reviews[existingIndex].id;
        this.deleteReview(id);
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
    if (existingIndex !== -1) {
      review = {
        ...data.reviews[existingIndex],
        content,
        rating: rating !== undefined ? rating : data.reviews[existingIndex].rating,
        updatedAt: Date.now()
      };
      data.reviews[existingIndex] = review;
    } else {
      review = {
        id: crypto.randomUUID(),
        date,
        content,
        rating,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      data.reviews.push(review);
    }
    
    this.save(data);
    this.triggerDBSync(review, isHighFreq ?? true);
    return review;
  },

  deleteReview(id: string): void {
    const data = this.load();
    data.reviews = data.reviews.filter(r => r.id !== id);
    this.save(data);

    this.setSyncStatus('saving');
    dailyReviewApi.delete(id).then(() => {
      this.setSyncStatus('saved');
    }).catch(() => {
      this.setSyncStatus('error');
    });
  },

  getCompoundStats(): CompoundStats {
    const reviews = this.load().reviews.filter(r => !isReviewEmpty(r.content));
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
};
