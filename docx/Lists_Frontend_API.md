# 清单模块前端接口与数据模型文档 (Lists Frontend API)

本文档描述了“清单”功能模块（v1.1）的前端数据模型定义，以及本地 Store (`listsStore.ts`) 提供的数据操作接口。当前数据存储基于浏览器的 `localStorage` 实现。

## 1. 数据模型定义 (Models)

### 1.1 List (清单)
表示一个清单（类似一个项目或笔记本），可以包含多个笔记，并且可以被放入一个文件夹中。

```typescript
export type ViewType = 'list' | 'board';

export interface List {
  id: string;               // 唯一标识符
  name: string;             // 清单名称
  icon: string;             // 清单图标 (Lucide 图标名)
  color: string;            // 颜色十六进制或 'none'
  viewType: ViewType;       // 视图模式
  folderId: string | null;  // 所属文件夹的 ID，null 表示独立清单
  isPinned?: boolean;       // 是否置顶
  itemCount?: number;       // UI 展示用的项目数量 (非持久化核心字段)
  sortOrder?: number;       // 用于拖拽排序的连续型整数
}
```

### 1.2 Folder (文件夹)
用于对清单进行分组管理。

```typescript
export interface Folder {
  id: string;               // 唯一标识符
  name: string;             // 文件夹名称
  isPinned?: boolean;       // 是否置顶
}
```

### 1.3 Note (笔记)
清单中的具体内容项。

```typescript
export interface Note {
  id: string;               // 唯一标识符
  listId: string;           // 归属的清单 ID
  groupId: string | null;   // 归属的分组 ID，null 为未分组
  title: string;            // 笔记标题
  content: string;          // 笔记正文内容
  isPinned?: boolean;       // 是否置顶
  sortOrder?: number;       // 用于拖拽排序的连续型整数
  createdAt: number;        // 创建时间 (时间戳)
  updatedAt: number;        // 更新时间 (时间戳)
}
```

### 1.4 NoteGroup (分组)
清单内容区的分组管理。

```typescript
export interface NoteGroup {
  id: string;               // 唯一标识符
  listId: string;           // 所属清单 ID
  name: string;             // 分组名称
  sortOrder?: number;       // 排序用整数
}
```

### 1.4 Template (模板)
用于快速创建笔记的预设模板。

```typescript
export interface Template {
  id: string;               // 唯一标识符
  name: string;             // 模板名称
  content: string;          // 模板正文内容
}
```

## 2. Store 接口定义 (Store API)

`listsStore` 提供了以下对上述模型进行增删改查（CRUD）的方法。

### 2.1 清单 (List) 操作
- `getLists(): List[]`
  获取所有清单。返回的数据应优先按 `isPinned` 降序排列。
- `addList(list: Omit<List, 'id'>): List`
  添加一个新清单并生成唯一 ID，返回添加后的清单对象。
- `updateList(id: string, updates: Partial<List>): void`
  更新指定清单的属性（如：重命名、置顶状态等）。
- `duplicateList(id: string): void`
  复制指定清单，并深拷贝该清单下的所有分组和笔记。
- `deleteList(id: string): void`
  删除指定清单，并级联删除该清单下的所有分组和笔记。
- `reorderLists(orderedIds: string[]): void`
  根据提供的 ID 数组更新同文件夹内清单的顺序。
- `moveList(listId: string, folderId: string | null, targetIndex?: number): void`
  将清单移动到指定文件夹下，并可选地插入到指定索引位置。

### 2.2 文件夹 (Folder) 操作
- `getFolders(): Folder[]`
  获取所有文件夹。优先按 `isPinned` 降序排列。
- `addFolder(name: string): Folder`
  创建一个新文件夹并生成唯一 ID。
- `updateFolder(id: string, updates: Partial<Folder>): void`
  更新指定文件夹属性（如：重命名、置顶）。
- `deleteFolder(id: string): void`
  删除指定文件夹，同时将该文件夹下的所有清单的 `folderId` 置为 `null`。

### 2.3 笔记 (Note) 操作
- `getNotesByListId(listId: string): Note[]`
  获取指定清单下的所有笔记。优先按 `isPinned` 降序，其次按 `sortOrder` 和 `updatedAt` 降序排列。
- `addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note`
  添加一条新笔记，自动生成 ID 和时间戳。
- `updateNote(id: string, updates: Partial<Note>): void`
  更新笔记，自动更新 `updatedAt` 时间戳。
- `duplicateNote(id: string): void`
  复制指定的笔记，生成一条带有“副本”后缀的新笔记。
- `deleteNote(id: string): void`
  删除指定笔记。
- `moveNoteAndReorder(noteId: string, groupId: string | null, targetIndex?: number): void`
  将笔记移动到指定分组下，并可选地插入到该分组的指定位置进行排序。

### 2.4 分组 (NoteGroup) 操作
- `addGroup(listId: string, name: string): NoteGroup`
  在指定清单下创建一个新分组。
- `updateGroup(id: string, updates: Partial<NoteGroup>): void`
  更新分组（如重命名等）。
- `deleteGroup(id: string): void`
  删除指定分组，系统会将原先属于该分组的笔记的 `groupId` 置为 `null`（即移至未分组），不会级联删除笔记。

### 2.4 模板 (Template) 操作
- `getTemplates(): Template[]`
  获取所有可用的笔记模板。系统应内置几套默认模板（如：会议纪要、阅读笔记、每周工作总结）。
- `addTemplate(name: string, content: string): Template`
  用户从笔记中保存或新建的模板。
