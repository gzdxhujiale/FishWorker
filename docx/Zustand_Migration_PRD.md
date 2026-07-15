# 产品需求文档 (PRD)：状态管理 Zustand 迁移规划

## 1. 概述
- **问题陈述：** 当前 FishWorker 采用的“本地单例对象 + 手动事件派发 / 手动刷新”的状态管理模式存在性能瓶颈，尤其在时间管理（高频拖拽）、深层清单树等复杂交互下，全量重新渲染会导致卡顿。此外，大量手动的状态同步及事件监听/卸载增加了代码维护成本和内存泄漏风险。
- **建议的解决方案：** 引入轻量级状态管理库 `Zustand`，将现有的各个独立 Store（如 `listsStore`、`timeManagementStore`）无缝重构为 Zustand 钩子（Hooks），利用其精确的 Selector 订阅机制实现界面的精准渲染和状态自动同步。

## 2. 核心理念
**可预测的状态与按需渲染 (Predictable State & On-Demand Rendering)**
在重交互（如拖拽、画布）的桌面级 React 应用中，UI 组件只应在其所依赖的局部状态发生变化时才进行重新渲染。Zustand 极简的设计哲学与本项目分离 Store 的架构高度契合，能以最小的代码侵入实现最大的渲染效能提升。

## 3. 解决方案概述

### 3.1 建议的解决方案
- **核心逻辑迁移**：将 `src/features/*/` 下的 Store 代码转换为 Zustand 的 `create`。
- **自动响应改造**：移除各组件中的 `refreshData()` 以及 `window.dispatchEvent`，改为通过 `useStore(state => state.xxx)` 的方式读取和触发更新。
- **Tauri IPC 集成**：保持现有的 Tauri `invoke` 与 Rust 后端的通讯逻辑不变，将其封装在 Zustand 的 Action 中。

### 3.2 包含在本次范围内
- **时间管理模块重构 (Time Management)：** 改造 `timeManagementStore.ts`，修复拖拽任务时整个面板重绘的性能问题。
- **清单系统重构 (Lists)：** 改造 `listsStore.ts`，实现深层文件夹和列表的按需渲染。
- **每日复盘重构 (Daily Review)：** 改造 `dailyReviewStore.ts`。
- **配置系统重构 (Settings & Preferences)：** 新增 `app_preferences` 表及 `usePreferencesStore` 偏好状态管理 Hook，用以将“隐藏已完成”等全局 UI 偏好配置自动持久化同步至后端 TiDB。

### 3.3 超出本次范围
- **主业务逻辑调整**：本次不改变任何现有的用户界面 UI 设计或交互逻辑。


## 4. 用户故事与需求

### 4.1 用户故事
```text
作为一名 [前端开发工程师]
我希望 [用 Zustand 重构状态订阅系统]
以便于 [减少手动维护事件派发产生的 Bug，并显著提升列表拖拽等重交互操作的帧率体验]

验收标准：
[ ] 所有的 `window.addEventListener('xxx-updated')` 被彻底移除。
[ ] 所有的 `refreshData()` 强制刷新逻辑被移除。
[ ] 在“四象限”或“周计划”面板拖拽任务时，只有相关的任务卡片和象限发生重绘，整个父面板不重绘。
[ ] 现有功能（新增、编辑、删除、拖拽、持久化保存）行为表现与重构前完全一致。
```

### 4.2 功能需求
| ID | 需求描述 | 备注 |
|----|------------|-------|
| FR1 | 将 `listsStore` 类实例重构为 `useListsStore` Hook | 核心模块 1 |
| FR2 | 将 `timeManagementStore` 模块重构为 `useTimeStore` Hook | 核心模块 2 |
| FR3 | 将 `dailyReviewStore` 重构为 `useDailyReviewStore` Hook | 核心模块 3 |
| FR4 | 所有 Store 保留 `syncAllFromDB()` 等与 Tauri 交互的方法 | 保证数据持久化 |
| FR5 | 实现 `usePreferencesStore` 及配置数据库表对全局 UI 配置进行保存同步 | 偏好设置同步 |

### 4.3 非功能需求
- **性能 (Performance)：** 拖拽任务或新建文档时的 React 重渲染组件数量应下降 80% 以上。
- **可维护性 (Maintainability)：** 减少前端组件层与状态层之间的样板代码（Boilerplate）。
- **可靠性 (Reliability)：** 杜绝由于遗漏注销 `window.removeEventListener` 导致的内存泄漏隐患。

## 5. 设计与用户体验
本次为底层技术栈优化，不涉及直接的用户界面改版，所有的视觉交互必须保持与当前版本 100% 相同。用户将体验到更流畅的拖拽跟手性和更快速的页面响应。

## 6. 技术规格说明

### 6.1 Zustand Store 架构设计参考
```typescript
// 重构示例参考
import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core';

interface TimeStore {
  data: TimeManagementData;
  syncStatus: TimeManagementSyncStatus;
  load: () => void;
  save: (data: TimeManagementData) => void;
  addTask: (title: string, quadrant: string) => void;
}

export const useTimeStore = create<TimeStore>((set, get) => ({
  data: { roles: [], tasks: [] },
  syncStatus: { state: 'saved', pendingCount: 0 },
  
  load: async () => {
    // 调用现有的 Tauri API 加载
  },
  
  save: (newData) => {
    set({ data: newData }); // 自动触发精确渲染
    // 触发后端保存
  },
  
  addTask: (title, quadrant) => {
    // ...逻辑...
    get().save(newData);
  }
}));
```

### 6.2 迁移策略
1. **安装依赖**：`pnpm add zustand`
2. **渐进式迁移**：按照 `Daily Review` -> `Time Management` -> `Lists` 的顺序逐个模块进行重构。
3. **回归测试**：每完成一个模块，确保在 Tauri 桌面端本地构建运行，测试核心的增删改查和拖拽功能。
