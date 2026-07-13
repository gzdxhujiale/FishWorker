# FishWorker 前端接口规范

本文档旨在规范 FishWorker 桌面端应用中 UI 组件的扩展方式。在完成了整体的 UI 重构后（去除了系统原生菜单并采用固定的 上下布局 + 左右侧边栏 布局），添加新的工具模块必须遵循以下接口规范。

## 1. 工具栏配置接口 (`ToolConfig`)

所有的工具模块都通过一个统一的接口进行注册，该接口在 `src/components/layout/types.ts` 中定义。

```typescript
import React from "react";

export interface ToolConfig {
  /**
   * 工具的唯一标识符。
   * 该 ID 将用于在状态管理中标记当前处于激活状态的模块 (activeToolId)。
   */
  id: string;

  /**
   * 工具的展示名称。
   * 当鼠标悬停在工具栏按钮上时，将作为 tooltip (title) 显示，并在 accessibility 属性中被使用。
   */
  name: string;

  /**
   * 工具的图标组件。
   * 建议统一使用 `lucide-react` 图标库。
   */
  icon: React.ElementType;

  /**
   * 工具对应的主内容组件（目前保留该接口以便于后续动态渲染，或者用于类型约束）。
   * 实际上主渲染逻辑在 `MainContent` 容器的子节点中根据 `activeToolId` 控制。
   */
  component: React.FC;
}
```

## 2. 布局组件说明

### 2.1 `AppLayout`, `MenuBar`, `Toolbar`, `MainContent`

整个基础结构容器与固定边界都封装在 `AppLayout` 中，而作为子组件的 `MenuBar`、`Toolbar` 和 `MainContent` 同样被放置在同一个文件中以方便集中管理。

**文件路径**: `src/components/layout/AppLayout.tsx`

```typescript
// 顶部自定义菜单栏（包含窗口控制）
export const MenuBar: React.FC = () => { ... }

// 左侧工具导航栏，用于承载应用侧边工具的切换
interface ToolbarProps {
  tools: ToolConfig[];          // 根据 ToolConfig 规范传入所有支持的工具模块
  activeToolId: string;         // 当前处于激活状态的工具 ID
  onToolSelect: (id: string) => void; // 用户点击切换工具时的回调函数
  onSettingsClick: () => void;  // 点击底部设置按钮时的回调函数
}
export const Toolbar: React.FC<ToolbarProps> = (...) => { ... }

// 主内容容器，为当前激活的工具模块提供边界和渲染位置
export const MainContent: React.FC<{ children: React.ReactNode }> = ({ children }) => { ... }

// 全局布局
export const AppLayout: React.FC<{
  menuBar: React.ReactNode;   // 顶部菜单栏区域
  toolbar: React.ReactNode;   // 左侧工具栏区域
  mainContent: React.ReactNode; // 主内容区域
}> = ({ menuBar, toolbar, mainContent }) => { ... }
```

## 3. 功能模块内部布局规范

根据 v1.1 架构设计，复杂的功能模块（如 Course, Time Management）应当内聚自身的状态，并遵循清晰的屏幕分区。

### 3.1 知识库模块 (Course)
采用**三栏布局 (Left / Center / Right)**：
- **左侧 (Sidebar)**：知识库分类、目录列表 (`CourseSidebar.tsx`)
- **中间 (Center)**：主要编辑与工作区，如思维导图/文档容器 (`MindMapWorkspace`)
- **右侧 (Detail Pane)**：大纲、排版或属性面板

### 3.2 时间管理模块 (Time Management)
采用**上下布局与内容区左右分栏**结合的方式：
- **顶部 (Menu Bar)**：时间管理主导航栏，包含模块标题、视图切换 Tab（周计划 / 四象限），以及全局设置（如隐藏已完成任务）。
- **内容区 (Content Area)**：位于菜单栏下方，高度自动占满。内部视需要采用左右布局：
  - **左侧 (Sidebar)**：待办分类、角色列表，用于拖拽分配任务等。
  - **右侧 (Workspace)**：动态切换的主工作台面板（如周计划看板或四象限网格）。内容区容器会根据 Tab 视图需要自动启用横向滚动条。

## 4. 设置模块 (Settings) 的挂载规范

所有的设置选项，不应散落在各自的模块中，必须统合于 `SettingsModal` 组件中：
- 统一挂载在 `main.tsx` 的最外层，受 `isSettingsOpen` 状态控制。
- 模块特定的设置（例如数据库设置），应作为独立子组件放至 `src/features/settings/components/`，再由 `SettingsModal` 引入为设置页的其中一栏。

## 5. 扩展新工具示例

如果您需要添加一个名为“设置中心 (Settings)”的新面板（若作为独立路由）：

1. **新建组件和样式**：在 `src/features/settings/` 目录下创建 `SettingsPanel.tsx` 和 `SettingsPanel.css`。
2. **注册工具**：
   在 `src/main.tsx` 的 `tools` 数组中添加对应的注册信息：
   
   ```tsx
   import { Settings as SettingsIcon } from "lucide-react";
   
   // ...
   { 
     id: "settings", 
     name: "设置", 
     icon: SettingsIcon, 
     component: () => <SettingsPanel /> 
   }
   ```
3. **主内容挂载**：
   在 `mainContent` 属性对应的条件渲染中，增加对 `activeToolId === "settings"` 的判断并渲染：

   ```tsx
   {activeSection === "settings" ? <SettingsPanel /> : null}
   ```
