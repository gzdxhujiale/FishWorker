# 产品需求文档 (PRD)：时间管理模块同步至 TiDB

## 1. 概述
### 包含:
- **问题陈述：** 目前时间管理模块（Time Management）的数据（任务 Tasks 和角色 Roles）仅保存在本地浏览器的 `localStorage` 中。这不仅带来了清理缓存导致数据丢失的风险，还使得用户无法在多设备间无缝同步和漫游时间管理数据。
- **建议的解决方案：** 参考知识库（Knowledge Base）和课程模块的同步机制，对时间管理模块的数据存储层进行改造。将本地操作防抖后同步保存至远程 TiDB / MySQL 数据库，同时在 UI 层增加同步状态指示器，确保数据的安全性和跨设备可用性。

## 2. 核心理念

- **本地优先响应 (Local-First & Optimistic UI)：** 用户在时间管理面板上的新增、修改、拖拽等操作应立即在前端 UI 上生效，不应因网络延迟导致卡顿。
- **防抖保存与最终一致性 (Debounced Sync)：** 用户的连续操作合并后，通过后端/数据库 API 异步持久化到 TiDB 数据库。
- **离线与故障恢复 (Offline Resilience)：** 参考知识库的设计，即使数据库写入失败，也能利用本地 IndexedDB 等缓存机制保障数据暂存，待网络恢复后重新同步。

## 3. 解决方案概述

### 3.1 建议的解决方案
- **高层级描述**: 重构 `timeManagementStore.ts`，将其从单纯依赖 `localStorage` 迁移为“数据库主导 + 本地状态机”架构，并在 `TimeManagementPanel` 等核心组件中引入类似 `CourseSyncStatus` 的同步状态标识。
- **核心能力**:
  - 时间管理数据的云端拉取（Load）。
  - 时间管理数据的云端保存（Save）。
  - UI 层的同步状态提示（如：保存中、已保存、同步失败重试）。

### 3.2 包含在本次范围内
- **功能点 1：后端及 API 层对接**。设计并在 `aistudyDatabase` (Tauri API) 中新增读取和保存时间管理数据的接口。
- **功能点 2：数据存储层重构**。重写 `timeManagementStore` 的持久化逻辑，支持异步状态处理及异常重试。
- **功能点 3：UI 同步状态指示器**。在时间管理界面右下角或顶部提供直观的“保存状态”提示，出现同步错误时允许用户手动重试。

### 3.3 超出本次范围
- 不做：多用户并发实时协作编辑冲突解决（CRDT）。目前假定为单用户的多端同步，以最后一次写入为准即可。
- 不做：时间管理数据的历史版本管理或回收站功能。

## 4. 用户故事与需求

### 4.1 用户故事
```
作为一名 深度使用时间管理功能的用户
我希望 我的四象限任务和角色标签能够自动保存到 TiDB 数据库中
以便于 我无论在办公室还是家里的电脑上打开软件，都能看到最新的时间安排，并且不用担心本地缓存丢失。

验收标准：
[ ] 标准 1：应用启动时，时间管理模块优先从 TiDB 数据库拉取最新的 Tasks 和 Roles 数据。
[ ] 标准 2：在界面上新增、修改、删除任务或角色时，数据会自动防抖同步到数据库。
[ ] 标准 3：界面上需有明确的同步状态提示（如“正在保存”、“已保存”）。如果网络断开或数据库连接失败，会有明显的“部分内容暂时没同步”及重试按钮。
```

### 4.2 功能需求
| ID | 需求描述 | 备注 |
|----|------------|-------|
| FR1 | 系统启动及打开时间管理模块时，需调用数据库接口拉取 `TimeManagementData`。 | 替代原先直接读 LocalStorage |
| FR2 | 所有修改任务/角色的操作（新增/更新/删除/移动象限）需触发异步保存逻辑。 | 建议设置 1000ms - 2000ms 的防抖防频繁写入 |
| FR3 | 提供 UI 状态组件展示：保存中、已保存、本地已存等待同步、同步失败。 | 参考 `CourseSidebar` 中的实现 |
| FR4 | 在数据库写入失败时，应当将最新数据暂存在本地缓存（IndexedDB/LocalStorage），支持稍后重试。 | 容灾方案 |

### 4.3 非功能需求
- **性能：** 数据库读取和保存不应阻塞主线程渲染。
- **可靠性：** 在意外断网、强制关闭应用时，应有相应的 `beforeunload` 等机制尽可能将缓存中的数据落盘。

## 5. 设计与用户体验

### 5.1 设计原则
- **无感同步：** 同步过程对用户透明，正常情况下用户只感受到数据顺畅地被“自动保存”。
- **一致性体验：** 同步状态指示器的 UI 设计必须和现有的知识库、课程模块（如 `.course-sync-status`）保持视觉和交互一致。

### 5.2 页面结构与交互流程
- **同步指示器位置**：建议放置在时间管理主面板 (`TimeManagementPanel.tsx`) 的顶部 Header 区域或右下角。
- **交互逻辑**：
  1. 用户编辑任务 -> 状态变为“正在保存...”
  2. 防抖结束，发起数据库写入 -> 成功 -> 状态变为“已保存”
  3. 若数据库连接失败 -> 状态变为“部分内容暂时没同步”并显示“重试”按钮。

## 6. 技术规格说明

### 6.1 API 设计
在暴露的 Tauri IPC (`window.aistudyDatabase`) 或相应 API 对象中扩展时间管理的方法：
- `getTimeManagementData(): Promise<TimeManagementData | null>`
- `saveTimeManagementData(data: TimeManagementData): Promise<void>`

*(注：如果采用全局 JSON 存储策略，可复用系统的 key-value 表；如果采用结构化存储，则需具体设计 Schema)*

### 6.2 数据库设计
**方案 A (推荐，简单敏捷)：** 键值对或单条 JSON 记录存储。
在现有的 Config 或 User 表中新增一个 Key/列，例如 `time_management_blob`，存储完整的 `TimeManagementData` (包含 roles 和 tasks 数组的 JSON)。由于时间管理任务量通常不大，整取整存可以大幅降低复杂度。

**方案 B (结构化存储，利于日后扩展统计分析)：**
设计两张表：
1. `time_management_roles`
   - `id` (VARCHAR)
   - `name` (VARCHAR)
   - `color` (VARCHAR)
   - `created_at` (BIGINT)
2. `time_management_tasks`
   - `id` (VARCHAR)
   - `title` (VARCHAR)
   - `role_id` (VARCHAR)
   - `quadrant` (VARCHAR: Q1/Q2/Q3/Q4)
   - `scheduled_date` (VARCHAR)
   - `completed` (BOOLEAN)
   - `created_at` (BIGINT)
   - `completed_at` (BIGINT)

### 6.3 迁移策略
为了不丢失用户现有的时间安排：
1. 首次上线该功能并在新设备上初始化时，若检测到 TiDB 中无数据，但 `localStorage` (`aistudy_time_management_data`) 存在数据，则执行**向上同步**。
2. 将 `localStorage` 中的数据写入 TiDB 后，清除或废弃旧的 `localStorage` 存储键，后续统一以数据库和新的离线缓存机制为准。
