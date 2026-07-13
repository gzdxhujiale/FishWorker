export type QuadrantType = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface Role {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  roleId?: string; // Optional connection to a role
  quadrant: QuadrantType;
  scheduledDate?: string; // Format: YYYY-MM-DD
  timeOfDay?: 'morning' | 'afternoon';
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  description?: string;
  deadline?: number; // Timestamp
}
