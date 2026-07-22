# 四象限工作台前端接口与数据模型文档 (Four Quadrants Workdesk Frontend API)

本文档描述了“四象限工作台”模块的前端数据模型定义，以及本地 Zustand Store (`useTimeStore`)、主面板组件 `TimeManagementPanel` 与核心组件（如 `DailyQuadrants`、`QuickAddPopover` 等）的接口定义与 Tauri 后端 API。

---

## 1. 组件与数据模型定义 (Components & Models)

### 1.1 主入口面板组件 (`TimeManagementPanel`)
拆分后作为一级工具渲染，通过配置 `mode` 决定展示形态。

```typescript
interface TimeManagementPanelProps {
  /** 运行模式，四象限工作台模式下传入 'daily'，隐藏左侧边栏并独占屏幕展示 2x2 网格 */
  mode?: 'weekly' | 'daily';
}
```

### 1.2 QuadrantType (四象限分类)
用于标识任务在艾森豪威尔矩阵中的归属类型。

```typescript
export type QuadrantType = 'Q1' | 'Q2' | 'Q3' | 'Q4';
```

### 1.2 Task (任务定义)
工作台中独立流转与管理的基本任务单元。

```typescript
export interface Task {
  id: string;                   // 唯一标识符 (UUID v4)
  title: string;                 // 任务名称/描述
  roleId?: string;               // 关联的角色 ID (可选)
  quadrant: QuadrantType;        // 当前所属象限 (Q1, Q2, Q3, Q4)
  scheduledDate?: string;        // 规划日期 (格式 YYYY-MM-DD，若为 undefined 则不显示在周计划看板中)
  timeOfDay?: 'morning' | 'afternoon'; // 日程排期时间段 (上午/下午)
  completed: boolean;            // 完成状态
  createdAt: number;             // 创建时间戳 (ms)
  completedAt?: number;          // 完成时间戳 (ms)
  description?: string;          // 详细备注内容 (在 TaskDetailModal 弹窗中使用 ReactjsTiptapEditor 编辑，隐藏顶部工具栏 showToolbar=false，保留块级拖拽手柄，数据以 TipTap JSON 字符串格式持久化)
  deadline?: number;             // 截止时间戳 (ms)
}
```

---

## 2. Store 与组件交互接口定义 (API Interfaces)

### 2.1 Store 核心操作
`useTimeStore` 针对任务操作暴露以下核心接口：

- **添加任务**
  `addTask(title: string, quadrant?: QuadrantType, scheduledDate?: string, roleId?: string): Task`
  * 创建一条新任务，并自动分配至指定的象限。通过四象限工作台右上角创建时，默认不设置 `scheduledDate` (即不进入周日程)。
- **更新任务属性/移至新象限**
  `updateTask(taskId: string, updates: Partial<Task>, isHighFreq?: boolean): void`
  * 用于更新任务的基础信息、标记完成状态或改变所属象限。
- **物理删除任务**
  `deleteTask(taskId: string): void`
  * 从当前列表及后台数据库物理清除该任务。

### 2.2 四象限矩阵视图组件 (`DailyQuadrants`)
包含四象限 2x2 网格的大面板，协调任务的分组渲染、拖拽放置和弹窗分发。

```typescript
interface DailyQuadrantsProps {
  tasks: Task[];
  /** 切换任务完成状态回调 */
  onToggleComplete: (taskId: string) => void;
  /** 拖拽任务至新象限的回调 (更新 quadrant 属性) */
  onMoveTask: (taskId: string, newQuadrant: QuadrantType) => void;
  /** 添加任务至指定象限的回调，支持设置可选的截止日期戳 */
  onAddTask: (title: string, quadrant: QuadrantType, deadline?: number) => void;
  /** 全局控制是否隐藏已完成任务的渲染 */
  hideCompleted: boolean;
  /** 任务删除回调 */
  onDeleteTask: (taskId: string) => void;
  /** 点击任务打开编辑详情弹窗的回调 */
  onEditTask: (task: Task) => void;
}
```

### 2.3 快速添加弹窗 (`QuickAddPopover`)
点击象限右上角 "+" 号按钮时弹出的轻量级定位表单气泡。

```typescript
interface QuickAddPopoverProps {
  /** 当前气泡所关联的象限类型 */
  quadrant: QuadrantType;
  /** 点击添加或表单提交后的确认回调 */
  onAdd: (title: string, quadrant: QuadrantType, deadline?: number) => void;
  /** 关闭气泡弹窗回调 */
  onClose: () => void;
  /** 锚定触发按钮 DOM，用于计算气泡的 fixed 位置 (基于 getBoundingClientRect) */
  triggerRef: React.RefObject<any>;
}
```

### 2.4 可折叠标签组 (`CollapsibleGroup`)
将象限内的任务按照截止期限（一天内、三天内、一周内、一周外、无日期）聚合包裹并提供折叠交互的组件。

```typescript
interface CollapsibleGroupProps {
  /** 折叠组标题 (如 "一天内") */
  title: string;
  /** 当前分组下的任务总数。若 count === 0，组件返回 null 不进行渲染 */
  count: number;
  /** 组内包含的任务卡片列表节点 */
  children: React.ReactNode;
  /** 默认展开状态 (默认开启) */
  defaultExpanded?: boolean;
}
```

---

## 3. 后端 Tauri IPC 命令接口 (Tauri IPC Commands)

四象限工作台的所有状态更新由前端以**乐观更新 (Optimistic UI)** 机制先通过 Zustand Store (`useTimeStore`) 修改内存状态与 `localStorage`，而后异步调度 Rust 后端与 TiDB 交互。

### 3.1 载入全部数据
* **命令 (Command)**: `tm_load_all`
* **说明**: 从 TiDB 中拉取全量的任务信息，交由前端进行象限及时间过滤。

### 3.2 任务数据 Upsert (新增或更新)
* **命令 (Command)**: `tm_upsert_task`
* **输入**: `{ task: Task }`
* **说明**: 
  - 当通过 `QuickAddPopover` 新增任务时调用。
  - 当进行四象限卡片跨区拖拽放置 (`onMoveTask`) 时调用，用于同步更新库中该任务的 `quadrant` 字段。
  - 当勾选/取消勾选完成状态 (`onToggleComplete`) 时调用，同步更新 `completed` 和 `completedAt`。

### 3.3 任务物理删除
* **命令 (Command)**: `tm_delete_task`
* **输入**: `{ id: string }`
* **说明**: 从 TiDB 中物理删除指定 ID 的记录。
