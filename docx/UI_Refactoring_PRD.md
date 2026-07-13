# UI Refactoring Product Requirements Document (PRD) v1.2

## 1. 概述
- **问题陈述：** 
  - 当前应用的界面结构较为传统，Tauri默认的系统菜单栏与应用内界面的融合度不够，扩展新工具时缺乏统一的容器和插槽机制。
  - **(v1.1新增)** `main.tsx` 入口文件过度臃肿，仍然耦合了大量“知识库 (Course)”相关的组件状态与业务逻辑。
  - **(v1.1新增)** 设置相关组件（如 `SettingsDialog.tsx` 和 `DatabaseSettingsPanel.tsx`）散落，未形成统一的功能模块。
  - **(v1.1新增)** 各独立功能模块（如 `course` 和 `time-management`）内部缺乏明确的结构分区与交互定义。
  - **(v1.2新增)** 知识库的收起目录按钮位置偏左，交互体验不佳。时间管理模块内部缺乏统一的导航与动态滚动容器定义，影响不同视图（如周计划、四象限）的展示。
- **建议的解决方案：** 
  - 取消Tauri自带的系统菜单栏，采用自定义的顶部菜单栏与左侧工具栏的固定布局。
  - **(v1.1新增)** 将 `main.tsx` 中属于知识库的逻辑彻底剥离，统一迁移到 `src/features/course` 中。
  - **(v1.1新增)** 建立独立的 `src/features/settings` 模块，统一接管所有设置相关界面。
  - **(v1.1新增)** 为 `course` 和 `time-management` 等核心模块制定标准化的内部结构规范。

## 2. 核心理念
通过建立严格的、固定的区域划分（菜单栏、工具栏、主内容区），以及规范的组件插槽机制，实现前端框架的高内聚与低耦合。主入口只负责加载外壳和路由分发，各特性（Feature）模块内部必须实现自闭环。

## 3. 解决方案概述

### 3.1 建议的解决方案
- **高层级描述**: 重构FishWorker应用的主窗口UI架构，并对内部核心业务模块进行深度解耦和文件归档。
- **核心能力**:
  - 全局固定的主界面外壳（MenuBar + Toolbar + MainContent）。
  - **(v1.1新增)** 高度内聚的功能模块（Course、TimeManagement、Settings）。

### 3.2 包含在本次范围内
- **功能点 1：全局布局框架 (v1.0已完成)**
  - 实现自定义的Menu Bar与Toolbar，禁止窗口缩放。
- **功能点 2：知识库 (Course) 模块内聚与结构化 (v1.1新增)**
  - 将目前散落在 `main.tsx` 的 `CourseSidebar`, `MindMapWorkspace`, `MindMapCatalog` 等状态和逻辑，封装并迁移到 `src/features/course/CoursePanel.tsx` 统一出口。
  - 明确规定知识库内部的页面分区：左侧（资料库/目录）、中侧（主编辑区）、右侧（格式/大纲侧边栏）。
- **功能点 3：时间管理 (Time Management) 模块结构化 (v1.1新增)**
  - 在 `src/features/time-management` 内部进行功能区隔定义。
- **功能点 4：设置模块 (Settings) 的统合 (v1.1新增)**
  - 新建 `src/features/settings` 模块，合并 `SettingsDialog.tsx` 与 `DatabaseSettingsPanel.tsx`。
- **功能点 5：界面细节与时间管理容器优化 (v1.2新增)**
  - 将知识库收起目录的按钮向右移动。
  - 重构时间管理面板布局：分为固定的“时间管理菜单栏”与高度动态占满的“时间管理内容区”，并在内容区按需启用横向滚动条。

### 3.3 超出本次范围
- 复杂的主题切换（暗黑模式等，可作为未来迭代）。
- 响应式设计（因窗口尺寸固定而无需考虑）。

## 4. 用户故事与需求

### 4.1 用户故事
```text
作为一名 [桌面端应用开发者/维护者]
我希望 [业务模块的代码与状态能高度收敛到对应的功能文件夹内，且各功能模块内部UI有清晰的分区]
以便于 [在未来开发新工具或维护老工具时，不用再在主入口文件中大海捞针]

验收标准：
[ ] main.tsx 代码量大幅减少，不再包含 Course 相关的具体业务状态 (如 activeCourseId, workspaceMode 等)。
[ ] Settings 和 DatabaseSettings 合并为一个专用的功能组件。
[ ] 打开知识库或时间管理工具时，其内部布局规范、不与其他工具逻辑冲突。
```

## 5. 设计与用户体验 (v1.1 更新模块规范)

### 5.1 知识库模块 (Course) 结构定义
```text
+---------------------------------------------------+
| [Left Pane]    | [Center Workspace] | [Right Pane]  |
| - 课程列表      | - 导图/文档编辑器    | - 属性排版     |
| - 章节树        | - 工具栏 (模式切换)  | - 节点大纲     |
+---------------------------------------------------+
```
- **交互规范**: 左中右三栏布局，左右侧边栏可折叠。**其中左侧收起目录的按钮需向右侧偏移以优化点击体验 (v1.2新增)**。切换节点时中间和右侧动态响应。

### 5.2 时间管理模块 (Time Management) 结构定义 (v1.2更新)
```text
+---------------------------------------------------+
| [Time Management Menu Bar]                        |
| - 标题                 | - Tab (周计划 / 四象限) | - 设置 |
+---------------------------------------------------+
| [Time Management Content Area]                    |
| - 根据 Tab 动态切换: 周计划视图 / 四象限工作台       |
| - 高度动态占满除菜单栏外的所有可用空间            |
+---------------------------------------------------+
```
- **交互规范**: 
  - **菜单栏 (Menu Bar)**: 顶部固定，包含模块标题、视图切换 Tab（周计划与四象限）、以及时间管理相关的设置按钮（如“隐藏已完成任务”等）。
  - **内容区 (Content Area)**: 位于菜单栏下方，高度自动占满剩余可用区域。内容区需根据当前选中的视图动态判断是否需要展示**横向滚动条**。例如：周计划视图必然需要横向滚动条以查看周五之后的任务，而四象限工作台视图则不需要横向滚动条。

### 5.3 设置模块 (Settings) 结构定义
```text
+---------------------------------------------------+
| [Settings Nav]  | [Settings Detail]                 |
| - 快捷键        | - 对应配置表单 / 展示页                 |
| - 更新管理      |                                     |
| - 数据库配置    |                                     |
+---------------------------------------------------+
```
- **交互规范**: 与原先的 Dialog 类似，但可以作为全局模态框，也可以作为独立工具面板嵌入（推荐保留全局模态框形态，但由独立 feature 管理状态）。

## 6. 技术规格说明 (v1.1)

### 6.1 `main.tsx` 瘦身方案
`main.tsx` 仅需要维护全局的 `activeToolId` 以及 `isSettingsOpen`，其核心渲染代码将简化为：
```tsx
const TOOLS = [
  { id: "knowledge", icon: Folder, component: CoursePanel },
  { id: "time-management", icon: Clock, component: TimeManagementPanel },
  // ...
];

<AppLayout
  menuBar={<MenuBar />}
  toolbar={<Toolbar tools={TOOLS} activeToolId={activeToolId} onSettingsClick={() => setSettingsOpen(true)} />}
  mainContent={ <ActiveToolComponent /> }
/>
<SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
```

### 6.2 Settings 模块重构
- 移动 `src/components/SettingsDialog.tsx` -> `src/features/settings/SettingsModal.tsx`
- 移动 `src/components/DatabaseSettingsPanel.tsx` -> `src/features/settings/components/DatabaseSettingsPanel.tsx`
- 统一通过 `src/features/settings/index.ts` 导出需要的接口。
