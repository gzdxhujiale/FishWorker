# 周计划与角色前端接口与数据模型文档 (Weekly Planning Frontend API)

本文档描述了“周计划”模块的前端数据模型定义，以及 Zustand Store (`useTimeStore`)、主面板组件 `TimeManagementPanel` 提供的数据操作接口与 Tauri 后端 API。当前数据存储基于 Rust 后端直连 TiDB 实现，前端通过 Tauri IPC (Invoke) 与后端同步数据，并采用内存乐观更新与高/低频防抖同步策略，以保证流畅的交互体验。

---

## 1. 组件与数据模型定义 (Components & Models)

### 1.1 主入口面板组件 (`TimeManagementPanel`)
拆分后作为一级工具渲染，通过配置 `mode` 决定展示形态。

```typescript
interface TimeManagementPanelProps {
  /** 运行模式，周计划模式下传入 'weekly'，展示左侧‘本周计划看板’角色栏与右侧自适应拉伸的日程看板 */
  mode?: 'weekly' | 'daily';
}
```

### 1.2 看板展示组件 (`WeeklyPlanning`)
呈现周看板的核心渲染组件。

```typescript
interface WeeklyPlanningProps {
  roles: Role[];
  tasks: Task[];
  onScheduleTask: (taskId: string, date: string | undefined, timeOfDay?: 'morning' | 'afternoon') => void;
  hideCompleted: boolean;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}
```

### 1.3 Role (人生角色)
表示用户在生活中所承担的不同社会角色或个人维度（如：自我成长、开发工作、家庭成员等）。

```typescript
export interface Role {
  id: string;         // 唯一标识符 (UUID v4)
  name: string;       // 角色名称 (如 "个人成长")
  color?: string;     // 角色代表色 (Hex 格式，如 "#1f6fd1")
  createdAt: number;  // 创建时间戳 (ms)
}
```

### 1.2 Task (任务/目标)
表示归属于某个角色的目标，或安排在周日程中的具体执行任务。

```typescript
export type QuadrantType = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface Task {
  id: string;                   // 唯一标识符 (UUID v4)
  title: string;                 // 任务/目标标题
  roleId?: string;               // 关联的角色 ID (若未排期且关联角色，则位于该角色的 Backlog)
  quadrant: QuadrantType;        // 所属四象限类型 ('Q1'|'Q2'|'Q3'|'Q4')
  scheduledDate?: string;        // 规划执行的日期 (格式: 'YYYY-MM-DD'，未排期时为 undefined)
  timeOfDay?: 'morning' | 'afternoon'; // 日程时间段 (上午或下午)
  completed: boolean;            // 是否已完成
  createdAt: number;             // 创建时间戳 (ms)
  completedAt?: number;          // 完成时间戳 (ms)
  description?: string;          // 任务详情描述/备注
  deadline?: number;             // 截止时间戳 (ms)
}
```

---

## 2. Store 接口定义 (Store API)

`useTimeStore` 是时间管理模块的状态管理中心，提供前端数据的增删改查方法，并处理后台同步机制。

### 2.1 角色 (Role) 操作 (联动自「人生罗盘」)
周计划的角色数据完全同步自「人生罗盘」模块 (`useMissionStore` 与 `mission_roles` 数据库表)。周计划模块内不应独立进行角色的创建、更新与删除。
- **加载角色**
  周计划在初始化调用 `syncAllFromDB` (触发 `tm_load_all`) 时，后端将直接通过 `mission_roles` 表加载角色，从而实现角色联动。
- **添加/更新/删除角色** (已弃用/从周计划界面移除)
  * 原周计划内独立的角色增删改接口（`addRole`、`updateRole`、`deleteRole`）已弃用，周计划左侧列表不再提供相关交互，统一在「人生罗盘」模块内维护。

### 2.2 任务/目标 (Task) 操作
- **添加任务**
  `addTask(title: string, quadrant: QuadrantType, scheduledDate?: string, roleId?: string): Task`
  * 向指定的象限、日期或角色下添加一条新任务，默认 `completed` 为 `false`。
- **更新任务**
  `updateTask(taskId: string, updates: Partial<Task>, isHighFreq?: boolean): void`
  * 修改指定任务的属性。主要用于更新标题、描述、修改排期、更改完成状态等。
- **删除任务**
  `deleteTask(taskId: string): void`
  * 从数据中彻底移除指定任务。

### 2.3 核心周计划排期交互接口
在周计划看板中，用户从左侧拖拽任务或看板内拖拽重排时，调用以下接口：
```typescript
/**
 * 将任务安排至指定的日期与上下午时间段
 * @param taskId 任务唯一ID
 * @param date 目标日期字符串 ('YYYY-MM-DD')，若为 undefined 则退回目标池
 * @param timeOfDay 目标时间段 ('morning' | 'afternoon')
 */
const handleScheduleTask = (taskId: string, date: string | undefined, timeOfDay?: 'morning' | 'afternoon') => {
  const updates: Partial<Task> = { scheduledDate: date, timeOfDay };
  
  if (date) {
    // 1. 设置截止时间为目标日期的深夜 23:59:59.999
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    updates.deadline = d.getTime();
    
    // 2. 自动将其归类为要事（重要不紧急 Q2 象限）
    updates.quadrant = 'Q2';
  }
  
  updateTask(taskId, updates, false); // 触发后台同步
};
```

### 2.4 数据持久化与同步机制
- **状态自动同步**：所有写操作会通过 `set()` 更新 Zustand 内存数据并触发 React 重新渲染，同时自动序列化写入本地缓存 `localStorage` (`aistudy_time_management_data`)。
- **初始化同步**：前端组件挂载时，调用 `syncAllFromDB()`。该方法通过 `timeManagementApi.loadAll()` 从后端 TiDB 拉取全量数据，并自动同步落盘至本地缓存。
- **同步防抖与挂起队列**：
  * Zustand Store 内部维护 `_pendingSaves` 状态，记录等待发送至后端的超时器 ID。
  * `triggerRoleSync` 和 `triggerTaskSync` 会在接收变更后启动定时器，进行防抖处理：高频保存（如文本输入）为 `500ms`，普通保存为 `300ms`。
  * 同步进行中，`state` 为 `'saving'`；完成后回到 `'saved'`；发生错误则降级显示为 `'attention'`（告知用户部分数据未成功同步）。

---

## 3. 后端 Tauri IPC 接口 (Tauri IPC Commands)

Tauri 后端基于 Rust 语言提供底层的 TiDB 数据存取服务。前端通过 `@tauri-apps/api/core` 中的 `invoke` 进行跨端调用。

### 3.1 全量加载
* **命令 (Command)**: `tm_load_all`
* **输入**: 无
* **输出**: `Promise<TimeManagementData | null>`
* **说明**: 从 TiDB 数据库中读取全量的角色列表与任务列表，合并返回。

### 3.2 角色 upsert (已弃用)
* **命令 (Command)**: `tm_upsert_role`
* **说明**: 已弃用。角色管理统一由人生罗盘的 `mission_create_role` 和 `mission_update_role` 处理。

### 3.3 角色删除 (已弃用)
* **命令 (Command)**: `tm_delete_role`
* **说明**: 已弃用。角色删除统一由人生罗盘的 `mission_delete_role` 处理。

### 3.4 任务 upsert
* **命令 (Command)**: `tm_upsert_task`
* **输入**: `{ task: Task }`
* **说明**: 向数据库插入或更新任务，包括更新任务所属象限、详细描述、排期状态和截止日期戳。

### 3.5 任务删除
* **命令 (Command)**: `tm_delete_task`
* **输入**: `{ id: string }`
* **说明**: 从数据库物理删除该任务。
