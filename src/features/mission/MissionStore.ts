import { create } from "zustand";
import type { MissionStatement, Role, Goal } from "./MissionTypes";
import { missionService } from "./MissionService";
import { createSyncEngine } from "../../lib/createSyncEngine";

const STORAGE_KEY = "aistudy_mission_data";

interface MissionStoreState {
  statement: MissionStatement | null;
  roles: Role[];
  goals: Goal[];
  selectedRoleId: string | null;
  isStatementCollapsed: boolean;

  // UI actions
  init: () => Promise<void>;
  setSelectedRole: (id: string | null) => void;
  toggleStatementCollapsed: () => void;

  // Statement
  saveStatement: (content: string) => void;

  // Roles
  addRole: (name: string, icon: string) => void;
  updateRole: (id: string, updates: Partial<Pick<Role, "name" | "icon">>) => void;
  deleteRole: (id: string) => void;
  reorderRoles: (newOrder: string[]) => void;

  // Goals
  addGoal: (title: string) => void;
  updateGoal: (id: string, updates: Partial<Pick<Goal, "title" | "status" | "timeScope" | "startDate" | "endDate">>) => void;
  deleteGoal: (id: string) => void;
  reorderGoals: (newOrder: string[]) => void;
}

const syncEngine = createSyncEngine();

function saveLocal(state: { statement: MissionStatement | null; roles: Role[]; goals: Goal[] }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save mission data locally:", e);
  }
}

function loadLocal(): { statement: MissionStatement | null; roles: Role[]; goals: Goal[] } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export const useMissionStore = create<MissionStoreState>((set, get) => ({
  statement: null,
  roles: [],
  goals: [],
  selectedRoleId: null,
  isStatementCollapsed: false,

  init: async () => {
    const local = loadLocal();
    if (local) {
      set({ statement: local.statement, roles: local.roles, goals: local.goals });
    }
    try {
      const data = await missionService.loadAll();
      set({ statement: data.statement, roles: data.roles, goals: data.goals });
      saveLocal(data);
    } catch (e) {
      console.error("Mission init failed:", e);
    }
  },

  setSelectedRole: (id) => set({ selectedRoleId: id }),
  toggleStatementCollapsed: () => set({ isStatementCollapsed: !get().isStatementCollapsed }),

  saveStatement: (content) => {
    const stmt: MissionStatement = { id: "default", content, updatedAt: new Date().toISOString() };
    set({ statement: stmt });
    saveLocal({ statement: stmt, roles: get().roles, goals: get().goals });
    syncEngine.schedule("mission:statement", async () => { await missionService.saveStatement(content); }, 500);
  },

  addRole: (name, icon) => {
    const roles = get().roles;
    const newRole: Role = {
      id: crypto.randomUUID(),
      name,
      icon,
      sortOrder: roles.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newRoles = [...roles, newRole];
    set({ roles: newRoles, selectedRoleId: newRole.id });
    saveLocal({ statement: get().statement, roles: newRoles, goals: get().goals });
    syncEngine.schedule(`role:${newRole.id}`, async () => { await missionService.createRole(name, icon, newRole.sortOrder); }, 300);
  },

  updateRole: (id, updates) => {
    const roles = get().roles.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r);
    set({ roles });
    saveLocal({ statement: get().statement, roles, goals: get().goals });
    const updated = roles.find(r => r.id === id);
    if (updated) {
      syncEngine.schedule(`role:${id}`, () => missionService.updateRole(id, updated.name, updated.icon), 500);
    }
  },

  deleteRole: (id) => {
    const roles = get().roles.filter(r => r.id !== id);
    const goals = get().goals.filter(g => g.roleId !== id);
    const selectedRoleId = get().selectedRoleId === id ? (roles[0]?.id ?? null) : get().selectedRoleId;
    set({ roles, goals, selectedRoleId });
    saveLocal({ statement: get().statement, roles, goals });
    syncEngine.cancel(`role:${id}`);
    missionService.deleteRole(id).catch(e => console.error("Failed to delete role:", e));
  },

  reorderRoles: (newOrder) => {
    const roles = [...get().roles].sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    set({ roles });
    saveLocal({ statement: get().statement, roles, goals: get().goals });
    const items: [string, number][] = roles.map((r, i) => [r.id, i]);
    syncEngine.schedule("reorder:roles", () => missionService.reorderRoles(items), 300);
  },

  addGoal: (title) => {
    const roleId = get().selectedRoleId;
    if (!roleId) return;
    const roleGoals = get().goals.filter(g => g.roleId === roleId);
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      roleId,
      title,
      status: "not_started",
      timeScope: "long",
      startDate: null,
      endDate: null,
      sortOrder: roleGoals.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const goals = [...get().goals, newGoal];
    set({ goals });
    saveLocal({ statement: get().statement, roles: get().roles, goals });
    syncEngine.schedule(`goal:${newGoal.id}`, async () => { await missionService.createGoal(roleId, title, newGoal.sortOrder); }, 300);
  },

  updateGoal: (id, updates) => {
    const goals = get().goals.map(g => g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g);
    set({ goals });
    saveLocal({ statement: get().statement, roles: get().roles, goals });
    const updated = goals.find(g => g.id === id);
    if (updated) {
      syncEngine.schedule(`goal:${id}`, () =>
        missionService.updateGoal(id, {
          title: updated.title,
          status: updated.status,
          timeScope: updated.timeScope,
          startDate: updated.startDate,
          endDate: updated.endDate,
        }), 500);
    }
  },

  deleteGoal: (id) => {
    const goals = get().goals.filter(g => g.id !== id);
    set({ goals });
    saveLocal({ statement: get().statement, roles: get().roles, goals });
    syncEngine.cancel(`goal:${id}`);
    missionService.deleteGoal(id).catch(e => console.error("Failed to delete goal:", e));
  },

  reorderGoals: (newOrder) => {
    const roleId = get().selectedRoleId;
    if (!roleId) return;
    const roleGoals = get().goals.filter(g => g.roleId === roleId);
    const otherGoals = get().goals.filter(g => g.roleId !== roleId);
    const sorted = [...roleGoals].sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    const goals = [...otherGoals, ...sorted];
    set({ goals });
    saveLocal({ statement: get().statement, roles: get().roles, goals });
    const items: [string, number][] = sorted.map((g, i) => [g.id, i]);
    syncEngine.schedule("reorder:goals", () => missionService.reorderGoals(roleId, items), 300);
  },
}));
