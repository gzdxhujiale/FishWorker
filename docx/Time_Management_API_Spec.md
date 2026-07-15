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

---

## 4. 任务详情与自动保存规范 (v1.2.1 更新)

### 4.1 截止日期选择器 (Arco Design `DatePicker`)
- **位置**：`src/features/time-management/TaskDetailModal.tsx`
- **核心逻辑**：
  - 原有的基于 `react-day-picker` 的自定义时间选择器已被重构，现引入了 Arco Design 的 `DatePicker` 组件以统一项目设计语言并提供更健壮的交互体验。
  - **动态时间控制**：增加了“添加时间/移除时间”的动态切换功能。当只选择日期时，选择器仅显示 `YYYY-MM-DD` 格式；当开启时间选择时，支持 `YYYY-MM-DD HH:mm` 精确到分钟的时间设定。

### 4.2 任务详情弹窗自动保存机制 (`TaskDetailModal`)
- **即时保存**：移除了手动的“保存/取消”按钮，将全部字段的修改绑定到自动保存逻辑。
  - **标题 (title)**：采用 500ms 的防抖保存，或在 `onBlur` 失去焦点时进行强制刷盘保存。如果标题为空，则在失去焦点时恢复为原标题。
  - **截止时间 (deadline)**：当在 Arco Design 的 `DatePicker` 中点选日期或动态切换时间模式时，立即触发同步刷盘保存，确保日历显示及时更新。
  - **详细内容 (description)**：详细内容区域引入了 Tiptap 富文本编辑器，支持基本的文本格式排版。编辑内容时触发 500ms 防抖保存。
- **强制刷盘机制 (Flush)**：在点击外部遮罩层关闭弹窗时，会自动清除所有待处理的防抖定时器，并比对最新状态，如有未保存的数据会执行一次同步刷盘，避免数据丢失。

