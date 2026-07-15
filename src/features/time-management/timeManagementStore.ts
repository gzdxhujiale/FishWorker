import { create } from 'zustand';
import { Role, Task, QuadrantType } from './timeManagementTypes';
import { timeManagementApi, TimeManagementSyncStatus } from './timeManagementService';

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
  syncStatus: TimeManagementSyncStatus;
  
  // Internal
  _pendingSaves: Map<string, number>;
  load: () => void;
  save: (data: TimeManagementData) => void;
  setSyncStatus: (status: TimeManagementSyncStatus) => void;
  triggerRoleSync: (role: Role, isHighFreq?: boolean) => void;
  triggerTaskSync: (task: Task, isHighFreq?: boolean) => void;
  
  // Public
  syncAllFromDB: () => Promise<void>;
  addRole: (name: string, color?: string) => Role;
  updateRole: (roleId: string, updates: Partial<Role>, isHighFreq?: boolean) => void;
  deleteRole: (roleId: string) => void;
  addTask: (title: string, quadrant?: QuadrantType, scheduledDate?: string, roleId?: string) => Task;
  updateTask: (taskId: string, updates: Partial<Task>, isHighFreq?: boolean) => void;
  deleteTask: (taskId: string) => void;
}

export const useTimeStore = create<TimeManagementStore>((set, get) => ({
  data: defaultData,
  syncStatus: { state: 'saved', pendingCount: 0 },
  _pendingSaves: new Map<string, number>(),

  load: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ data: JSON.parse(stored) as TimeManagementData });
      }
    } catch (err) {
      console.error('Failed to load time management data:', err);
    }
  },

  save: (data: TimeManagementData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      set({ data });
    } catch (err) {
      console.error('Failed to save time management data:', err);
    }
  },

  setSyncStatus: (status: TimeManagementSyncStatus) => {
    set({ syncStatus: status });
  },

  syncAllFromDB: async () => {
    try {
      const state = get();
      state.setSyncStatus({ state: 'saving', pendingCount: state._pendingSaves.size });
      const dbData = await timeManagementApi.loadAll();
      if (dbData) {
        get().save(dbData);
      }
      const newState = get();
      if (newState._pendingSaves.size === 0) {
        newState.setSyncStatus({ state: 'saved', pendingCount: 0 });
      }
    } catch (e) {
      const state = get();
      state.setSyncStatus({ state: 'attention', pendingCount: state._pendingSaves.size });
    }
  },

  triggerRoleSync: (role: Role, isHighFreq: boolean = true) => {
    const state = get();
    state.setSyncStatus({ state: 'saving', pendingCount: state._pendingSaves.size + 1 });
    const delay = isHighFreq ? 500 : 300;

    if (state._pendingSaves.has(role.id)) {
      window.clearTimeout(state._pendingSaves.get(role.id));
    }

    const timeout = window.setTimeout(async () => {
      try {
        await timeManagementApi.upsertRole(role);
        const latestState = get();
        latestState._pendingSaves.delete(role.id);
        if (latestState._pendingSaves.size === 0) {
          latestState.setSyncStatus({ state: 'saved', pendingCount: 0 });
        } else {
          latestState.setSyncStatus({ state: 'saving', pendingCount: latestState._pendingSaves.size });
        }
      } catch (e) {
        const latestState = get();
        latestState.setSyncStatus({ state: 'attention', pendingCount: latestState._pendingSaves.size });
      }
    }, delay);
    state._pendingSaves.set(role.id, timeout);
  },

  triggerTaskSync: (task: Task, isHighFreq: boolean = true) => {
    const state = get();
    state.setSyncStatus({ state: 'saving', pendingCount: state._pendingSaves.size + 1 });
    const delay = isHighFreq ? 500 : 300;

    if (state._pendingSaves.has(task.id)) {
      window.clearTimeout(state._pendingSaves.get(task.id));
    }

    const timeout = window.setTimeout(async () => {
      try {
        await timeManagementApi.upsertTask(task);
        const latestState = get();
        latestState._pendingSaves.delete(task.id);
        if (latestState._pendingSaves.size === 0) {
          latestState.setSyncStatus({ state: 'saved', pendingCount: 0 });
        } else {
          latestState.setSyncStatus({ state: 'saving', pendingCount: latestState._pendingSaves.size });
        }
      } catch (e) {
        const latestState = get();
        latestState.setSyncStatus({ state: 'attention', pendingCount: latestState._pendingSaves.size });
      }
    }, delay);
    state._pendingSaves.set(task.id, timeout);
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
    get().save(newData);
    get().triggerRoleSync(newRole, false);
    return newRole;
  },

  updateRole: (roleId: string, updates: Partial<Role>, isHighFreq: boolean = true): void => {
    const data = get().data;
    const index = data.roles.findIndex(r => r.id === roleId);
    if (index !== -1) {
      const newRoles = [...data.roles];
      newRoles[index] = { ...newRoles[index], ...updates };
      get().save({ ...data, roles: newRoles });
      get().triggerRoleSync(newRoles[index], isHighFreq);
    }
  },

  deleteRole: (roleId: string): void => {
    const data = get().data;
    const newRoles = data.roles.filter(r => r.id !== roleId);
    get().save({ ...data, roles: newRoles });
    
    const state = get();
    state.setSyncStatus({ state: 'saving', pendingCount: state._pendingSaves.size + 1 });
    timeManagementApi.deleteRole(roleId)
      .then(() => {
        const latestState = get();
        if (latestState._pendingSaves.size === 0) latestState.setSyncStatus({ state: 'saved', pendingCount: 0 });
      })
      .catch(() => {
        const latestState = get();
        latestState.setSyncStatus({ state: 'attention', pendingCount: latestState._pendingSaves.size });
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
    get().save(newData);
    get().triggerTaskSync(newTask, false);
    return newTask;
  },

  updateTask: (taskId: string, updates: Partial<Task>, isHighFreq: boolean = true): void => {
    const data = get().data;
    const index = data.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const newTasks = [...data.tasks];
      newTasks[index] = { ...newTasks[index], ...updates };
      get().save({ ...data, tasks: newTasks });
      get().triggerTaskSync(newTasks[index], isHighFreq);
    }
  },

  deleteTask: (taskId: string): void => {
    const data = get().data;
    const newTasks = data.tasks.filter(t => t.id !== taskId);
    get().save({ ...data, tasks: newTasks });

    const state = get();
    state.setSyncStatus({ state: 'saving', pendingCount: state._pendingSaves.size + 1 });
    timeManagementApi.deleteTask(taskId)
      .then(() => {
        const latestState = get();
        if (latestState._pendingSaves.size === 0) latestState.setSyncStatus({ state: 'saved', pendingCount: 0 });
      })
      .catch(() => {
        const latestState = get();
        latestState.setSyncStatus({ state: 'attention', pendingCount: latestState._pendingSaves.size });
      });
  }
}));

// Initialize data
useTimeStore.getState().load();
