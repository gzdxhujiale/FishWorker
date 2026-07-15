# Zustand 状态管理接口文档 (API Interface Document)

本文档定义了迁移到 Zustand 后，各个核心业务模块 Store 的类型定义和对外暴露的方法（Actions）。

## 1. 每日复盘 Store (`useDailyReviewStore`)

管理每日回顾数据、评分及统计。

```typescript
import { DailyReview, CompoundStats, DailyReviewData } from './dailyReviewTypes';

type SyncStatus = 'saved' | 'saving' | 'error';

interface DailyReviewStore {
  // State
  data: DailyReviewData;
  syncStatus: SyncStatus;
  
  // Actions
  load: () => void;
  save: (data: DailyReviewData) => void;
  setSyncStatus: (status: SyncStatus) => void;
  syncAllFromDB: () => Promise<void>;
  
  // Getters
  getAllReviews: () => DailyReview[];
  getReviewByDate: (date: string) => DailyReview | undefined;
  getCompoundStats: () => CompoundStats;
  
  // Mutations
  saveReview: (date: string, content: string, rating?: number, isHighFreq?: boolean) => DailyReview;
  deleteReview: (id: string) => void;
}
```

## 2. 时间管理 Store (`useTimeStore`)

管理四象限工作台及周计划中的角色、任务、及状态流转。

```typescript
import { Role, Task, QuadrantType } from './timeManagementTypes';
import { TimeManagementSyncStatus } from './timeManagementService';

interface TimeManagementData {
  roles: Role[];
  tasks: Task[];
}

interface TimeManagementStore {
  // State
  data: TimeManagementData;
  syncStatus: TimeManagementSyncStatus;
  
  // Actions
  load: () => void;
  save: (data: TimeManagementData) => void;
  syncAllFromDB: () => Promise<void>;
  
  // Role Mutations
  addRole: (name: string, color?: string) => Role;
  updateRole: (roleId: string, updates: Partial<Role>, isHighFreq?: boolean) => void;
  deleteRole: (roleId: string) => void;
  
  // Task Mutations
  addTask: (title: string, quadrant?: QuadrantType, scheduledDate?: string, roleId?: string) => Task;
  updateTask: (taskId: string, updates: Partial<Task>, isHighFreq?: boolean) => void;
  deleteTask: (taskId: string) => void;
}
```

## 3. 清单与笔记 Store (`useListsStore`)

管理文件夹、清单、分组、笔记、模板的高频增删改查。

```typescript
import { List, Folder, Note, Template, ListsData, NoteGroup } from './listsTypes';

interface ListsStoreState {
  // State
  data: ListsData;
  initialized: boolean;
  initPromise: Promise<void> | null;
  
  // Actions
  init: () => Promise<void>;
  
  // Getters
  getLists: () => List[];
  getFolders: () => Folder[];
  getNotesByListId: (listId: string) => Note[];
  getNoteGroups: (listId: string) => NoteGroup[];
  getTemplates: () => Template[];
  
  // Folder Mutations
  addFolder: (name: string) => Folder;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  reorderFolders: (orderedIds: string[]) => void;
  deleteFolder: (id: string) => void;
  
  // List Mutations
  addList: (list: Omit<List, 'id'>) => List;
  updateList: (id: string, updates: Partial<List>) => void;
  deleteList: (id: string) => void;
  duplicateList: (list: List) => List;
  reorderLists: (orderedIds: string[]) => void;
  moveList: (listId: string, folderId: string | null, targetIndex?: number) => void;
  
  // Note Mutations
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  moveNoteAndReorder: (noteId: string, groupId: string | null, targetIndex?: number) => void;
  reorderNotes: (orderedIds: string[]) => void;
  
  // NoteGroup Mutations
  addGroup: (listId: string, name: string) => NoteGroup;
  updateGroup: (id: string, updates: Partial<NoteGroup>) => void;
  deleteGroup: (id: string) => void;
  
  // Template Mutations
  addTemplate: (name: string, content: string) => Template;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
}
```

## 4. 全局用户偏好 Store (`usePreferencesStore`)

管理全局 UI 偏好设置的自动保存与数据库同步。

```typescript
interface PreferencesState {
  // State
  preferences: Record<string, string>;
  initialized: boolean;
  
  // Actions
  init: () => Promise<void>;
  
  // Getters & Mutations
  getPreference: (key: string, defaultValue?: string) => string;
  setPreference: (key: string, value: string) => Promise<void>;
}
```

