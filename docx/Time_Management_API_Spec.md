# 时间管理模块前端接口规范 (v1.2 更新)

本文档补充了时间管理模块在 v1.2 UI 重构后的组件接口规范，特别是四象限任务快速添加与折叠分组组件。

## 1. 核心数据类型 (`timeManagementTypes.ts`)

为了支持周计划上下午拖拽分区，`Task` 类型新增了 `timeOfDay` 属性：

```typescript
export type QuadrantType = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface Task {
  id: string;
  title: string;
  roleId?: string; 
  quadrant: QuadrantType;
  scheduledDate?: string; 
  timeOfDay?: 'morning' | 'afternoon'; // v1.2 新增：支持上下午时间段分区
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  description?: string;
  deadline?: number; 
}
```

## 2. 基础组件接口

### 2.1 快速添加弹窗 (`QuickAddPopover`)

位于象限右上角，点击 `+` 号唤出的快速添加任务组件。

```typescript
interface QuickAddPopoverProps {
  /** 当前所属象限 */
  quadrant: QuadrantType;
  /**
   * 确认添加回调函数
   * @param title 任务标题
   * @param quadrant 象限类型
   * @param deadline 截止时间戳（可选）
   */
  onAdd: (title: string, quadrant: QuadrantType, deadline?: number) => void;
  /** 关闭弹窗回调，例如在外部点击或提交完成后触发 */
  onClose: () => void;
  /** 触发弹窗的按钮 DOM 引用，用于计算弹窗绝对定位位置及点击外部判断 */
  triggerRef: React.RefObject<HTMLElement>;
}
```

### 2.2 折叠标签组 (`CollapsibleGroup`)

用于将不同时间跨度的任务在四象限面板内进行分组收纳。

```typescript
interface CollapsibleGroupProps {
  /** 分组标题，如 "一天内"、"无日期" */
  title: string;
  /** 分组下的任务数量，如果为 0，组件不会进行渲染 (返回 null) */
  count: number;
  /** 内部渲染的 Task 列表组件 */
  children: React.ReactNode;
  /** 默认展开状态，默认为 true */
  defaultExpanded?: boolean;
}
```

## 3. 核心面板组件接口变更

### 3.1 `DailyQuadrants` 属性变更

原先底部的行内输入框被右上角的 Popover 替代，`onAddTask` 支持了第三个可选参数 `deadline`。

```typescript
interface DailyQuadrantsProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onMoveTask: (taskId: string, newQuadrant: QuadrantType) => void;
  onAddTask: (title: string, quadrant: QuadrantType, deadline?: number) => void; // 支持截止时间
  hideCompleted: boolean;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}
```

### 3.2 `WeeklyPlanning` 属性变更

为了支持精确到上下午的日历面板拖放调度，`onScheduleTask` 接口增加了 `timeOfDay` 识别。
**[v1.3 更新]**: 当任务被拖拽到具体某一天时，`onScheduleTask` 会在底层自动为该任务设定一个截至该日深夜 `23:59:59` 的 `deadline`，同时将该任务的 `quadrant` 属性强制变更为 `'Q2'`（重要不紧急）。

```typescript
interface WeeklyPlanningProps {
  roles: Role[];
  tasks: Task[];
  /**
   * 将任务调度到指定日期
   * @param taskId 任务ID
   * @param date 日期字符串 YYYY-MM-DD
   * @param timeOfDay 上午或下午
   * 
   * 注：一旦调度，将自动设置该日的 deadline，并移至 Q2 象限。
   */
  onScheduleTask: (taskId: string, date: string | undefined, timeOfDay?: 'morning' | 'afternoon') => void;
  hideCompleted: boolean;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}
```
