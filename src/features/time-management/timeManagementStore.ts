import { create } from 'zustand';
import { Role, Task, QuadrantType } from './timeManagementTypes';
import { timeManagementApi } from './timeManagementService';
import { createSyncEngine } from '../../lib/createSyncEngine';

const STORAGE_KEY = 'aistudy_time_management_data';

export interface TimeManagementData {
  roles: Role[];
  tasks: Task[];
}

const defaultData: TimeManagementData = {
  roles: [
    { id: '1', name: '个人成长', color: '#1f6fd1', createdAt: Date.now() },
    { id: '2', name: '工作任务', color: '#25845a', createdAt: Date.now() }
  ],
  tasks: []
};

interface TimeManagementStore {
  data: TimeManagementData;

  // Public
  syncAllFromDB: () => Promise<void>;
  addTask: (title: string, quadrant?: QuadrantType, scheduledDate?: string, roleId?: string) => Task;
  updateTask: (taskId: string, updates: Partial<Task>, isHighFreq?: boolean) => void;
  deleteTask: (taskId: string) => void;
}

const syncEngine = createSyncEngine();

function saveLocal(data: TimeManagementData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save time management data:', err);
  }
}

function loadLocal(): TimeManagementData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as TimeManagementData) : null;
  } catch (err) {
    console.error('Failed to load time management data:', err);
    return null;
  }
}

export const useTimeStore = create<TimeManagementStore>((set, get) => ({
  data: defaultData,

  syncAllFromDB: async () => {
    try {
      const dbData = await timeManagementApi.loadAll();
      if (dbData) {
        const PREDEFINED_COLORS = ['#1f6fd1', '#25845a', '#d97706', '#7657d6', '#d32f2f', '#0ea5e9'];
        const mappedRoles = dbData.roles.map((role, index) => ({
          ...role,
          color: role.color || PREDEFINED_COLORS[index % PREDEFINED_COLORS.length]
        }));
        const merged = { ...dbData, roles: mappedRoles };
        saveLocal(merged);
        set({ data: merged });
      }
    } catch (e) {
      console.error('Time management sync from DB failed:', e);
    }
  },


  addTask: (title: string, quadrant: QuadrantType = 'Q2', scheduledDate?: string, roleId?: string): Task => {
    const data = get().data;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      quadrant,
      scheduledDate,
      roleId,
      completed: false,
      createdAt: Date.now()
    };
    const newData = { ...data, tasks: [...data.tasks, newTask] };
    saveLocal(newData);
    set({ data: newData });
    syncEngine.schedule(newTask.id, () => timeManagementApi.upsertTask(newTask), 300);
    return newTask;
  },

  updateTask: (taskId: string, updates: Partial<Task>, isHighFreq: boolean = true): void => {
    const data = get().data;
    const index = data.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const newTasks = [...data.tasks];
      newTasks[index] = { ...newTasks[index], ...updates };
      const newData = { ...data, tasks: newTasks };
      saveLocal(newData);
      set({ data: newData });
      syncEngine.schedule(taskId, () => timeManagementApi.upsertTask(newTasks[index]), isHighFreq ? 500 : 300);
    }
  },

  deleteTask: (taskId: string): void => {
    const data = get().data;
    const newTasks = data.tasks.filter(t => t.id !== taskId);
    const newData = { ...data, tasks: newTasks };
    saveLocal(newData);
    set({ data: newData });

    syncEngine.cancel(taskId);
    timeManagementApi.deleteTask(taskId).catch(e => {
      console.error('Failed to delete task:', e);
    });
  }
}));

// Initialize data
const initial = loadLocal();
if (initial) {
  const PREDEFINED_COLORS = ['#1f6fd1', '#25845a', '#d97706', '#7657d6', '#d32f2f', '#0ea5e9'];
  initial.roles = initial.roles.map((role, index) => ({
    ...role,
    color: role.color || PREDEFINED_COLORS[index % PREDEFINED_COLORS.length]
  }));
  useTimeStore.setState({ data: initial });
}
