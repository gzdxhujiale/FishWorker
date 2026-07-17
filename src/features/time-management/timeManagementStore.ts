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
  addRole: (name: string, color?: string) => Role;
  updateRole: (roleId: string, updates: Partial<Role>, isHighFreq?: boolean) => void;
  deleteRole: (roleId: string) => void;
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
        const merged = { ...dbData };
        saveLocal(merged);
        set({ data: merged });
      }
    } catch (e) {
      console.error('Time management sync from DB failed:', e);
    }
  },

  addRole: (name: string, color?: string): Role => {
    const data = get().data;
    const newRole: Role = {
      id: crypto.randomUUID(),
      name,
      color: color || '#697381',
      createdAt: Date.now()
    };
    const newData = { ...data, roles: [...data.roles, newRole] };
    saveLocal(newData);
    set({ data: newData });
    syncEngine.schedule(newRole.id, () => timeManagementApi.upsertRole(newRole), 300);
    return newRole;
  },

  updateRole: (roleId: string, updates: Partial<Role>, isHighFreq: boolean = true): void => {
    const data = get().data;
    const index = data.roles.findIndex(r => r.id === roleId);
    if (index !== -1) {
      const newRoles = [...data.roles];
      newRoles[index] = { ...newRoles[index], ...updates };
      const newData = { ...data, roles: newRoles };
      saveLocal(newData);
      set({ data: newData });
      syncEngine.schedule(roleId, () => timeManagementApi.upsertRole(newRoles[index]), isHighFreq ? 500 : 300);
    }
  },

  deleteRole: (roleId: string): void => {
    const data = get().data;
    const newRoles = data.roles.filter(r => r.id !== roleId);
    const newData = { ...data, roles: newRoles };
    saveLocal(newData);
    set({ data: newData });

    syncEngine.cancel(roleId);
    timeManagementApi.deleteRole(roleId).catch(e => {
      console.error('Failed to delete role:', e);
    });
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
  useTimeStore.setState({ data: initial });
}
