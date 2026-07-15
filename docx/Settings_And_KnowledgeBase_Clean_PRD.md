# 产品需求文档 (PRD) - 设置与知识库清理模块 v1.0

## 1. 概述
### 问题陈述：
当前应用中包含“知识库”（Course/MindMap/Document/Importer 系列功能）和设置页面中的“更新管理”功能。随着业务定位的调整，知识库与本地更新检测不再是核心业务场景。保留这些不再维护的模块会导致代码库臃肿、增加打包后的体积以及后续的维护成本。此外，设置页面中的“数据库连接配置”面板直接在内容区域渲染 `<h3>` 标题，导致视觉层级不够统一，界面布局显得拥挤。

### 建议的解决方案：
1. **全面下线知识库功能**：彻底移除“知识库”页面及左侧边栏布局，并清理前端与 Rust 后端所有与其关联的引用和冗余代码（包括 course、mindmap、documents 及 importer 目录）。
2. **移除更新管理模块**：下线设置面板中的“更新管理”标签页及相关功能，并清理前端与其绑定的自动下载、轮询及升级调用逻辑。
3. **数据库配置标题调整**：将数据库连接配置面板中的 `<h3>` 标题（“数据库连接配置”）移到设置弹窗的顶部窗口栏（Header）中，使表单内容区更加紧凑与现代。

---

## 2. 解决方案概述

### 2.1 建议的解决方案

#### 核心能力：
- **业务流精简**：侧边栏功能导航仅保留“清单”、“周计划”、“四象限工作台”、“每日复盘”。
- **设置界面精简**：设置 Modal 仅保留“快捷键”和“数据库配置”两个标签页。
- **窗口栏标题统一**：设置窗口的 Header 栏能够根据当前选中的设置页面，动态显示对应的配置标题（如：“数据库连接配置”、“快捷键设置”）。

---

### 2.2 包含在本次范围内

#### 功能点 1：删除“知识库”功能及引用
- **前端清理范围**：
  - 删除 `src/features/course/` 下的所有文件。
  - 删除 `src/features/mindmap/` 下的所有文件。
  - 删除 `src/features/documents/` 下的所有文件。
  - 删除 `src/features/importer/` 下的所有文件。
  - `src/main.tsx`：
    - 移除 `AppSection` 类型的 `"knowledge"`。
    - 移除 `Toolbar` 属性 `tools` 中的“知识库”项。
    - 移除 `MainContent` 渲染分支中 `activeSection === "knowledge"` 渲染 `<CoursePanel />` 的逻辑。
    - 移除对 `CoursePanel` 的 import 语句。
  - `src/index.css`：
    - 移除 `@import "./features/course/course.css";`
    - 移除 `@import "./features/mindmap/mindmap.css";`
    - 移除 `@import "./features/documents/document.css";`
    - 移除 `@import "./features/mindmap/catalog.css";`
- **后端清理范围**：
  - 删除 `src-tauri/src/course.rs`。
  - 删除 `src-tauri/src/document.rs`。
  - `src-tauri/src/lib.rs`：
    - 移除 `mod course;` 和 `mod document;`。
    - 移除 `tauri::generate_handler![]` 中所有与 `course::*` 和 `document::*` 相关的命令绑定。
  - `src-tauri/src/schema.rs`：
    - 移除知识库相关的建表语句，包括 `course_management_courses`、`course_management_sections`、`knowledge_documents`、`knowledge_document_snapshots` 和 `mind_maps`。

#### 功能点 2：下线“更新管理”功能
- `src/features/settings/SettingsModal.tsx`：
  - 移除“更新管理”侧边栏导航项 `<button>`。
  - 移除对 `updates` 页面的相关渲染（`activePage === "updates"` 分支的全部 UI 代码）。
  - 移除组件内部与更新流程绑定的全部 `useState`、`useEffect` 以及 API 调用（`loadUpdateInfo`、`checkUpdate`、`downloadUpdate`、`pauseDownload`、`resumeDownload`、`cancelDownload`、`installUpdate`）。
- `src/types/updates.ts`：
  - 修改 `SettingsPage` 类型为 `export type SettingsPage = "database" | "shortcuts";`。
  - 移除更新相关的类型定义（如 `UpdateManagerInfo`、`UpdateCheckResult`、`UpdateDownloadResult`、`UpdateDownloadProgress`、`UpdateDownloadStatus`）。
- `src/types/global.d.ts`：
  - 移除 `Window` 接口中 `aistudyUpdates` 的声明。
  - 移除与更新相关的类型 import。

#### 功能点 3：设置页面标题上移至窗口栏
- `src/features/settings/components/DatabaseSettingsPanel.tsx`：
  - 移除顶部的 `<section className="settings-section runtime-check-intro">` 节点（其中包含 `<h3>数据库连接配置</h3>` 标题及描述）。
- `src/features/settings/SettingsModal.tsx`：
  - 将原本位于表单内部的标题逻辑移动到设置弹窗的标题栏 `<header className="settings-header">`。
  - 标题栏将根据当前的 `activePage` 状态，渲染动态标题：
    - 当 `activePage === "database"` 时，显示 `<h2>数据库连接配置</h2>`。
    - 当 `activePage === "shortcuts"` 时，显示 `<h2>快捷键设置</h2>`。

---

### 2.3 超出本次范围
- **数据迁移与备份**：不提供已存“知识库”或“导图”数据的手工导出备份工具。此功能为彻底下线。
- **诊断日志清理**：虽然与更新相关的类型被精简，但为了不破坏性能诊断等功能，`ErrorLogEntry`、`RuntimeDiagnosticResult` 等诊断代码依然予以保留。

---

## 3. 用户故事与需求

### 3.1 用户故事
```text
作为一名 系统管理员/高阶用户
我希望 能够保持应用的功能和界面足够纯粹，并且只保留真正使用到的“清单”、“时间管理”等核心业务板块，
以便于 在进行设置操作时能在一个结构清爽、标题直观的窗口中快速完成配置。
```

### 3.2 功能需求
| ID | 需求描述 | 优先级 | 备注 |
|----|------------|---|-------|
| FR1 | 隐藏“知识库”导航入口 | P0 | 侧边栏及菜单层级移除“知识库”入口，默认选中“清单” |
| FR2 | 彻底清理相关源文件 | P0 | 移除 `course`、`mindmap`、`documents`、`importer` 相关源文件，确保不再参与编译和打包 |
| FR3 | 移除“更新管理”导航和面板 | P0 | 设置窗口仅保留“快捷键”和“数据库配置”两个标签页 |
| FR4 | 清除 window.aistudyUpdates 依赖 | P0 | 移除所有 window 属性的生命周期监听与 API 调用 |
| FR5 | 窗口标题栏动态化 | P0 | 设置窗口 Header 栏左侧根据活动标签页动态展示标题 |
| FR6 | 去除面板内部标题 | P0 | 数据库配置表单上方的 redundant 标题容器被安全移除 |

---

## 4. 设计与用户体验 (UX/UI)

### 4.1 页面结构变化对比

#### 变更前 (Before)：
```text
+------------------------------------------------------------+
| ⚙️ 设置                                           [X]      |
+------------------------------------------------------------+
| [导航栏]       | [内容区 (Database Panel)]                 |
| - 快捷键       |                                            |
| - 更新管理     |  <h3> 数据库连接配置 </h3>                 |
| > 数据库配置   |  用于修改连接到的本地 MySQL 或远程 TiDB... |
|                |  [表单项 Host/Port/User/Password...]      |
+------------------------------------------------------------+
```

#### 变更后 (After)：
```text
+------------------------------------------------------------+
| ⚙️ 数据库连接配置                                 [X]      |
+------------------------------------------------------------+
| [导航栏]       | [内容区 (Database Panel)]                 |
| - 快捷键       |                                            |
| > 数据库配置   |  [表单项 Host/Port/User/Password...]      |
|                |                                            |
+------------------------------------------------------------+
```

---

## 5. 技术规格说明

### 5.1 受影响的文件列表 (总结)
- **删除的文件**：
  - `src/features/course/*`
  - `src/features/mindmap/*`
  - `src/features/documents/*`
  - `src/features/importer/*`
  - `src-tauri/src/course.rs`
  - `src-tauri/src/document.rs`
- **修改的文件**：
  - `src/main.tsx`
  - `src/index.css`
  - `src/types/updates.ts`
  - `src/types/global.d.ts`
  - `src/features/settings/SettingsModal.tsx`
  - `src/features/settings/components/DatabaseSettingsPanel.tsx`
  - `src-tauri/src/lib.rs`
  - `src-tauri/src/schema.rs`
