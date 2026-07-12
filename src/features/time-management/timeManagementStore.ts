import { Role, Task, QuadrantType } from './timeManagementTypes';

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
    } catch (err) {
      console.error('Failed to save time management data:', err);
    }
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
    return newRole;
  },

  updateRole(roleId: string, updates: Partial<Role>): void {
    const data = this.load();
    const index = data.roles.findIndex(r => r.id === roleId);
    if (index !== -1) {
      data.roles[index] = { ...data.roles[index], ...updates };
      this.save(data);
    }
  },

  deleteRole(roleId: string): void {
    const data = this.load();
    data.roles = data.roles.filter(r => r.id !== roleId);
    this.save(data);
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
    return newTask;
  },

  updateTask(taskId: string, updates: Partial<Task>): void {
    const data = this.load();
    const index = data.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      data.tasks[index] = { ...data.tasks[index], ...updates };
      this.save(data);
    }
  },

  deleteTask(taskId: string): void {
    const data = this.load();
    data.tasks = data.tasks.filter(t => t.id !== taskId);
    this.save(data);
  }
};
