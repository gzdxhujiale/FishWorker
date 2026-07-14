import { Role, Task, QuadrantType } from './timeManagementTypes';
import { timeManagementApi, TimeManagementSyncStatus } from './timeManagementService';

const STORAGE_KEY = 'aistudy_time_management_data';

export interface TimeManagementData {
  roles: Role[];
  tasks: Task[];
}

let currentSyncStatus: TimeManagementSyncStatus = { state: 'saved', pendingCount: 0 };
const pendingSaves = new Map<string, number>();

const defaultData: TimeManagementData = {
  roles: [
    { id: '1', name: '个人成长', color: '#1f6fd1', createdAt: Date.now() },
    { id: '2', name: '工作任务', color: '#25845a', createdAt: Date.now() }
  ],
  tasks: []
};

export const timeManagementStore = {
  load(): TimeManagementData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as TimeManagementData;
      }
    } catch (err) {
      console.error('Failed to load time management data:', err);
    }
    return defaultData;
  },

  save(data: TimeManagementData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new Event('time-management-updated'));
    } catch (err) {
      console.error('Failed to save time management data:', err);
    }
  },

  getSyncStatus(): TimeManagementSyncStatus {
    return currentSyncStatus;
  },

  setSyncStatus(status: TimeManagementSyncStatus) {
    currentSyncStatus = status;
    window.dispatchEvent(new Event('time-management-sync-updated'));
  },

  async syncAllFromDB() {
    try {
      this.setSyncStatus({ state: 'saving', pendingCount: pendingSaves.size });
      const dbData = await timeManagementApi.loadAll();
      if (dbData) {
        this.save(dbData);
      }
      if (pendingSaves.size === 0) {
        this.setSyncStatus({ state: 'saved', pendingCount: 0 });
      }
    } catch (e) {
      this.setSyncStatus({ state: 'attention', pendingCount: pendingSaves.size });
    }
  },

  triggerRoleSync(role: Role, isHighFreq: boolean = true) {
    this.setSyncStatus({ state: 'saving', pendingCount: pendingSaves.size + 1 });
    const delay = isHighFreq ? 500 : 300;

    if (pendingSaves.has(role.id)) {
      window.clearTimeout(pendingSaves.get(role.id));
    }

    const timeout = window.setTimeout(async () => {
      try {
        await timeManagementApi.upsertRole(role);
        pendingSaves.delete(role.id);
        if (pendingSaves.size === 0) {
          this.setSyncStatus({ state: 'saved', pendingCount: 0 });
        } else {
          this.setSyncStatus({ state: 'saving', pendingCount: pendingSaves.size });
        }
      } catch (e) {
        this.setSyncStatus({ state: 'attention', pendingCount: pendingSaves.size });
      }
    }, delay);
    pendingSaves.set(role.id, timeout);
  },

  triggerTaskSync(task: Task, isHighFreq: boolean = true) {
    this.setSyncStatus({ state: 'saving', pendingCount: pendingSaves.size + 1 });
    const delay = isHighFreq ? 500 : 300;

    if (pendingSaves.has(task.id)) {
      window.clearTimeout(pendingSaves.get(task.id));
    }

    const timeout = window.setTimeout(async () => {
      try {
        await timeManagementApi.upsertTask(task);
        pendingSaves.delete(task.id);
        if (pendingSaves.size === 0) {
          this.setSyncStatus({ state: 'saved', pendingCount: 0 });
        } else {
          this.setSyncStatus({ state: 'saving', pendingCount: pendingSaves.size });
        }
      } catch (e) {
        this.setSyncStatus({ state: 'attention', pendingCount: pendingSaves.size });
      }
    }, delay);
    pendingSaves.set(task.id, timeout);
  },

  addRole(name: string, color?: string): Role {
    const data = this.load();
    const newRole: Role = {
      id: crypto.randomUUID(),
      name,
      color: color || '#697381',
      createdAt: Date.now()
    };
    data.roles.push(newRole);
    this.save(data);
    this.triggerRoleSync(newRole, false);
    return newRole;
  },

  updateRole(roleId: string, updates: Partial<Role>, isHighFreq: boolean = true): void {
    const data = this.load();
    const index = data.roles.findIndex(r => r.id === roleId);
    if (index !== -1) {
      data.roles[index] = { ...data.roles[index], ...updates };
      this.save(data);
      this.triggerRoleSync(data.roles[index], isHighFreq);
    }
  },

  deleteRole(roleId: string): void {
    const data = this.load();
    data.roles = data.roles.filter(r => r.id !== roleId);
    this.save(data);
    
    this.setSyncStatus({ state: 'saving', pendingCount: pendingSaves.size + 1 });
    timeManagementApi.deleteRole(roleId)
      .then(() => {
        if (pendingSaves.size === 0) this.setSyncStatus({ state: 'saved', pendingCount: 0 });
      })
      .catch(() => this.setSyncStatus({ state: 'attention', pendingCount: pendingSaves.size }));
  },

  addTask(title: string, quadrant: QuadrantType = 'Q2', scheduledDate?: string, roleId?: string): Task {
    const data = this.load();
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      quadrant,
      scheduledDate,
      roleId,
      completed: false,
      createdAt: Date.now()
    };
    data.tasks.push(newTask);
    this.save(data);
    this.triggerTaskSync(newTask, false);
    return newTask;
  },

  updateTask(taskId: string, updates: Partial<Task>, isHighFreq: boolean = true): void {
    const data = this.load();
    const index = data.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      data.tasks[index] = { ...data.tasks[index], ...updates };
      this.save(data);
      this.triggerTaskSync(data.tasks[index], isHighFreq);
    }
  },

  deleteTask(taskId: string): void {
    const data = this.load();
    data.tasks = data.tasks.filter(t => t.id !== taskId);
    this.save(data);

    this.setSyncStatus({ state: 'saving', pendingCount: pendingSaves.size + 1 });
    timeManagementApi.deleteTask(taskId)
      .then(() => {
        if (pendingSaves.size === 0) this.setSyncStatus({ state: 'saved', pendingCount: 0 });
      })
      .catch(() => this.setSyncStatus({ state: 'attention', pendingCount: pendingSaves.size }));
  }
};
