/**
 * createSyncEngine — keyed debounced optimistic-persistence helper.
 *
 * Ownership split (the seam):
 *   - engine owns: keyed timer map, debounce, cancellation, error logging.
 *   - store owns: optimistic in-memory apply + building the persist closure.
 *
 * `schedule` debounces `persist` per key. A second `schedule` for the same key
 * before the timer fires cancels the earlier one (true debounce).
 *
 * `cancel(key)` removes any pending timer for that key. Call it from delete
 * actions to prevent a late upsert from resurrecting a just-deleted row.
 *
 * On persist rejection the engine logs and clears the key; it does not retry.
 * Optimistic state is already persisted locally by the store, so the next edit
 * will naturally reschedule a write.
 */

const DEFAULT_DELAY_MS = 500;

export interface SyncEngine {
  schedule(key: string, persist: () => Promise<void>, delay?: number): void;
  cancel(key: string): void;
}

export function createSyncEngine(): SyncEngine {
  const timers = new Map<string, number>();

  return {
    schedule(key, persist, delay = DEFAULT_DELAY_MS) {
      const existing = timers.get(key);
      if (existing !== undefined) {
        window.clearTimeout(existing);
      }

      const id = window.setTimeout(async () => {
        try {
          await persist();
        } catch (err) {
          console.error(`[syncEngine] persist failed for key "${key}":`, err);
        } finally {
          timers.delete(key);
        }
      }, delay);

      timers.set(key, id);
    },

    cancel(key) {
      const existing = timers.get(key);
      if (existing !== undefined) {
        window.clearTimeout(existing);
        timers.delete(key);
      }
    },
  };
}
