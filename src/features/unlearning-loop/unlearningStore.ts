import { UnlearningData, UnlearningLoop, UnlearningStatus } from './unlearningTypes';

const STORAGE_KEY = 'aistudy-unlearning-data';

const DEFAULT_DATA: UnlearningData = {
  loops: [],
  activeLoopId: undefined,
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export const unlearningStore = {
  load(): UnlearningData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as UnlearningData;
      }
    } catch (e) {
      console.error('Failed to load unlearning data:', e);
    }
    return DEFAULT_DATA;
  },

  save(data: UnlearningData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save unlearning data:', e);
    }
  },

  createLoop(): UnlearningLoop {
    const data = this.load();
    const newLoop: UnlearningLoop = {
      id: generateId(),
      status: 'INPUT',
      inputData: { oldBelief: '', newPerspective: '' },
      outputData: { actionTaken: '' },
      feedbackData: { expected: '', actual: '' },
      reflectionData: { keyTakeaway: '' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    data.loops.push(newLoop);
    data.activeLoopId = newLoop.id;
    this.save(data);
    return newLoop;
  },

  updateLoop(id: string, updates: Partial<UnlearningLoop>): void {
    const data = this.load();
    const loopIndex = data.loops.findIndex(l => l.id === id);
    if (loopIndex >= 0) {
      data.loops[loopIndex] = {
        ...data.loops[loopIndex],
        ...updates,
        updatedAt: Date.now(),
      };
      this.save(data);
    }
  },

  deleteLoop(id: string): void {
    const data = this.load();
    data.loops = data.loops.filter(l => l.id !== id);
    if (data.activeLoopId === id) {
      data.activeLoopId = undefined;
    }
    this.save(data);
  },
  
  setActiveLoop(id: string | undefined): void {
    const data = this.load();
    data.activeLoopId = id;
    this.save(data);
  }
};
