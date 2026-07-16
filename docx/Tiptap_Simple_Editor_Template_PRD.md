# 产品需求文档 (PRD) - Tiptap 简单编辑器模板组件化与每日复盘集成

## 1. 概述
- **问题陈述**：
  在当前项目中，多个功能模块（如笔记 Lists 模块的抽屉、模板 Modal 以及每日复盘模块等）都需要使用 Tiptap 富文本编辑器。然而，每个模块目前都是各自通过 `useEditor` 设置独立的编辑器实例，并分别配置相同的扩展（StarterKit、Markdown 等）与工具栏气泡菜单（TipTapBubbleMenu）、拖拽手柄（BlockDragHandleMenu）。这导致了大量的冗余代码，并使得维护不便。此外，各处的 ProseMirror 编辑器样式和布局在不同的 CSS 文件中被分散定义（大部分在 `lists.css` 内），如果直接在非 Lists 模块（如每日复盘）中使用，会遇到样式缺失或依赖 Lists 样式文件的问题。

- **建议的解决方案**：
  在 `src/features/tiptap` 目录下创建并发布一个统一包装的 `SimpleEditor` React 组件，作为通用的 “Simple Editor Template”。
  该组件将：
  1. 封装通用的 `useEditor` 与 `EditorContent` 初始化。
  2. 内置气泡快捷菜单 (`TipTapBubbleMenu`) 和拖拽块菜单 (`BlockDragHandleMenu`)。
  3. 提供可配置的属性参数（Props），控制 placeholder 文本、是否启用拖拽手柄、是否启用 Markdown 等功能。
  4. 抽离通用 Tiptap 样式至公共的 `tiptap.css` 并全局引入。
  同时，重构“每日复盘”模块的编辑器 `ReviewEditor.tsx`，以引用此通用 tsx 组件，消除重复代码并统一编辑体验。

---

## 2. 核心理念
- **DRY (Don't Repeat Yourself) 组件封装**：将配置选项、编辑器扩展、以及配套气泡和拖拽菜单整体封装在 `SimpleEditor` 中，各业务面板仅作为数据的控制端和状态容器。
- **高阶配置解耦**：通过简单的 API 属性（如 `enableDragHandle`、`enableBubbleMenu`、`placeholder` 等），向外暴露丰富但语义清晰的配置接口，使得业务层无需感知 Tiptap 底层的具体 API。
- **全局一致的编辑质感**：通过独立的 `tiptap.css`，为系统内所有编辑器实例提供一致性的字体排版（Heading、List、Blockquote 等）与菜单动效，提升产品整体质感。

---

## 3. 解决方案概述

### 3.1 建议的解决方案
- **高层级描述**：
  在 `src/features/tiptap` 中引入 `SimpleEditor.tsx`，它是一个对外接收 `content` 与 `onChange` 的受控或半受控组件。它会将 Tiptap 原生实例进行托管，并负责把富文本相关的气泡工具栏和拖拽手柄合理定位并渲染在输入区上层。
  此外，在 `src/features/tiptap` 建立 `tiptap.css`，将原有在 `lists.css` 中的 bubble menu 及 ProseMirror 标准样式剥离并聚合，引入全局。
  最后，重构 `ReviewEditor.tsx`，直接在核心输入区域渲染 `<SimpleEditor />` 替换原有分散在 ReviewEditor 内部的初始化逻辑。

### 3.2 包含在本次范围内
- **功能点 1：Tiptap 简单编辑器通用组件 (`SimpleEditor.tsx`)**
  - **状态与内容映射**：接收 `content: string` Props，支持在父组件中改变 `content` 时（如切换日期/笔记）自动更新编辑器内容。
  - **改变回调**：暴露 `onChange: (html: string) => void`，在内容编辑时触发回调，供父组件进行乐观更新或数据防抖保存。
  - **特性配置**：支持配置 `placeholder`、`editable`（只读/编辑切换）、`enableMarkdown`、`enableDragHandle`、`enableBubbleMenu`。
  - **菜单内置**：内置 `TipTapBubbleMenu` 与 `BlockDragHandleMenu`，免去父组件手动引入的繁琐步骤。
- **功能点 2：通用样式剥离与全局注册 (`tiptap.css` & `index.css`)**
  - 剥离原有的气泡菜单 (`.tiptap-bubble-menu`)、工具栏按钮 (`.toolbar-btn` 等)、拖拽下拉菜单 (`.lists-dropdown-menu` 等)、以及 ProseMirror 标准排版样式。
  - 创建 `src/features/tiptap/tiptap.css`。
  - 在 `src/index.css` 中添加 `@import "./features/tiptap/tiptap.css";`，使得全站无缝继承基础排版规范。
- **功能点 3：每日复盘模块重构 (`ReviewEditor.tsx`)**
  - 移除 `ReviewEditor.tsx` 中的本地 `@tiptap/react` 的 `useEditor`、`StarterKit`、`Markdown` 导入。
  - 引入 `<SimpleEditor />`，传入对应的 `content`、`onChange` 回调以及 `placeholder` 配置参数。
  - 保留 `ReviewEditor.tsx` 的原有的日期导航、日历时间选择器、打分星级组件，以及基于 ref 的乐观保存和 `500ms` 输入防抖云端同步持久化逻辑。

### 3.3 超出本次范围
- 一次性在所有模块（如 `NoteDrawer` 和 `TemplateModal`）全量替换为 `SimpleEditor`。我们在本次交付中将保持 Lists 模块的原样，以验证通用样式的兼容性，在后续迭代中再建议合并。

---

## 4. 用户故事与需求

### 4.1 用户故事
```text
作为一名 项目开发者与维护人员
我希望 能够有一个封装好的、即插即用的 Tiptap 简单富文本编辑器组件
以便于 我无需为每个新页面都去复制几十行 setup 代码，且可以一处修改样式、全局生效。

作为一名 每日复盘功能的用户
我希望 每日复盘编辑器的使用体验依旧无比流畅，能够支持加粗、列表、标题等富文本排版
以便于 我能以结构化的方式记录每日收获，且完全保留已实现的“防抖同步”与“切换日期时强制保存”机制。
```

### 4.2 功能需求
| ID | 需求描述 | 优先级 | 备注 |
|----|------------|---|-------|
| FR1 | `SimpleEditor` 核心包装 | P0 | 提供 `content` / `onChange` 的受控绑定接口，并在 `content` 变化时执行内容同步 |
| FR2 | 配置化扩展与菜单集成 | P0 | 支持开关参数 `enableDragHandle`、`enableBubbleMenu`，并集成气泡及块拖拽菜单 |
| FR3 | 占位符支持 | P0 | 提供统一的 `placeholder` Props 并自动调用 Placeholder 扩展插件实现提示 |
| FR4 | 样式模块化沉淀 | P0 | 将所有 Tiptap 相关的样式类迁移至 `tiptap.css` 并全局生效，防止因 Lists 模块未载入导致复盘页面格式错乱 |
| FR5 | 每日复盘无缝重构 | P0 | 重构 `ReviewEditor.tsx` 引用 `SimpleEditor`，保持其原本的高频输入 500ms 防抖同步和评星逻辑完全可用 |

### 4.3 非功能需求
- **向前兼容性**：新封装的 `SimpleEditor` 必须能平滑替换原有逻辑，不能造成任何数据结构层面的修改，其生成的富文本 HTML 必须保持一致性。
- **切换流畅度**：复盘页面切换日期时，新日期的内容必须即时加载并正确渲染，不能出现旧内容闪烁或数据覆盖错误。

---

## 5. 设计与用户体验
- **一致性体验**：所有编辑器中选中文本弹出的 Bubble Menu 和块前的 Drag Handle 交互动作保持像素级一致。
- **沉浸式 Placeholder**：当复盘内容完全为空时，编辑器应展示深灰色的引导语，且在用户键入第一个字符时平滑消失。

---

## 6. 技术规格说明

### 6.1 `SimpleEditor.tsx` 核心 API 定义
```typescript
interface SimpleEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  enableMarkdown?: boolean;
  enableDragHandle?: boolean;
  enableBubbleMenu?: boolean;
}
```

### 6.2 依赖与配置文件调整
- 调整 `src/features/tiptap/config.ts` 中的 `getTiptapExtensions` 以确保对各类场景（如 markdown 渲染 and 拖拽菜单）支持更灵活。
- 在 `src/index.css` 中使用 `@import` 整合样式，减少模块样式相互引用的混乱。

### 6.3 编辑器高级功能与官方拖拽插件迁移 (v2.6 新增)
为了解决原三方拖拽插件 `tiptap-extension-global-drag-handle` 在列表、段落边缘等复杂布局下可能出现的定位漂移、重合以及不可控等体验问题，在 v2.6 中对编辑器架构进行如下升级：

#### 1) 拖拽手柄官方化迁移
- **依赖替换**：卸载三方插件 `tiptap-extension-global-drag-handle`，迁移至官方第一方开源扩展 **`@tiptap/extension-drag-handle`**。
- **自定义手柄渲染**：使用官方提供的 `render` API 动态创建包含 `.drag-handle` 类的 DOM 节点，并配置 svg Grip 图标，以此无缝复用原有的 CSS 样式规范，确保对 `BlockDragHandleMenu` 组件的选中和唤醒流程零侵入。
- **嵌套深度支持**：启用 `nested: true` 属性，保障嵌套列表和多级块元素在拖拽时的精准抓取与排序。

#### 2) 代码块语法高亮 (`lowlight`)
- **高亮引擎**：集成 `@tiptap/extension-code-block-lowlight` 和 `lowlight`，用以替代 StarterKit 默认的无高亮代码块。支持主流开发语言的智能高亮，并配套 VS Code 风格的 `.hljs-*` 主题样式。

#### 3) Notion 风格的斜杠快捷命令菜单 (`SlashCommands`)
- **交互规范**：通过键盘输入 `/` 时拉起命令气泡面板，支持键盘 `ArrowUp`/`ArrowDown` 进行导航切换，`Enter` 键确认执行。支持的快速块类型包括：正文、标题 1/2/3、无序列表、有序列表、待办任务列表、引用块和高亮代码块。

