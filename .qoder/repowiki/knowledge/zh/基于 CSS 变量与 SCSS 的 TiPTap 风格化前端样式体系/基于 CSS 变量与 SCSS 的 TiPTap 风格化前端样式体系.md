---
kind: frontend_style
name: 基于 CSS 变量与 SCSS 的 TiPTap 风格化前端样式体系
category: frontend_style
scope:
    - '**'
source_files:
    - src/styles/_variables.scss
    - src/styles/_keyframe-animations.scss
    - src/index.css
    - src/components/tiptap-ui-primitive/button.scss
    - src/components/tiptap-ui-primitive/badge.scss
    - src/components/layout/AppLayout.css
---

## 系统概述
FishWorker 采用「CSS 自定义属性（CSS Variables）+ SCSS + BEM 命名」的前端样式方案，围绕自研 tiptap-ui-primitive 基础组件库构建统一的视觉语言。整个样式体系以设计令牌（Design Tokens）为核心，通过 :root 和 .dark 双主题实现明暗模式切换，不依赖 Tailwind、styled-components 等原子/JS-in-CSS 框架。

## 核心架构
- 设计令牌层：src/styles/_variables.scss 集中定义所有颜色、圆角、阴影、过渡动效等 Token，按 light/dark 两套变量组织，前缀统一为 --tt-*。
- 全局入口：src/index.css 作为唯一入口，使用 @import 顺序引入 _variables.scss、动画、布局、共享样式及各模块 CSS。
- 基础组件库：src/components/tiptap-ui-primitive/ 提供 Button、Badge、Card、Input、Popover、Tooltip、Toolbar 等原子 UI，每个组件由一个 .tsx + 同名 .scss 组成，类名遵循 tiptap-button / tiptap-badge 等 BEM 风格。
- 业务样式：各 feature 目录内自带独立 CSS（如 features/time-management/timeManagement.css、features/lists/lists.css），通过 index.css 按需注入。
- 布局样式：src/styles/layout.css、components/layout/AppLayout.css 定义桌面应用整体 Shell（菜单栏、工具栏、主内容区）。

## 关键文件与包
- src/styles/_variables.scss — 全部设计令牌（颜色、半径、阴影、过渡、对比度）
- src/styles/_keyframe-animations.scss — 全局 keyframes（fadeIn、zoom、slideFrom*、spin）
- src/index.css — 全局样式入口，聚合所有 @import
- src/components/tiptap-ui-primitive/*.scss — 基础组件样式（button、badge、card、input、popover、tooltip、toolbar 等）
- src/components/layout/AppLayout.css — 应用外壳布局
- vite.config.js — 仅启用 @vitejs/plugin-react，无 tailwind/postcss 插件；SCSS 由 Vite 内置处理

## 架构约定与设计决策
1. CSS 变量驱动主题：所有颜色、尺寸、阴影均通过 var(--tt-*) 引用，切换 .dark 根类即可全局换肤，无需 JS 计算。
2. BEM + data-* 变体：组件样式通过 data-size="small|large"、data-appearance="emphasized|subdued"、data-highlighted="true" 等属性控制变体，避免类名爆炸。
3. SCSS 局部作用域：每个组件的 .scss 只写该组件的样式，不互相 import，保持低耦合。
4. 无 Tailwind/原子 CSS：项目未引入任何原子 CSS 框架，样式完全手写 SCSS，便于精细控制 Tauri 桌面端渲染表现。
5. 动画集中管理：所有 @keyframes 集中在 _keyframe-animations.scss，组件通过 animation-name 引用，避免重复定义。
6. 字体与排版：全局字体栈 "Microsoft YaHei", "微软雅黑", Arial, sans-serif，文本层级通过 --text-strong/--text-primary/--text-muted/--text-faint 四档变量区分。
7. Tauri 适配：AppLayout.css 中大量使用 -webkit-user-select: none、固定 viewport 高度等桌面端专用样式。

## 开发者应遵守的规则
- 新增颜色/圆角/阴影必须先在 _variables.scss 中声明 --tt-* 变量，禁止在组件中硬编码色值。
- 新增基础组件需在 tiptap-ui-primitive/ 下创建 *.tsx + 同名 .scss，类名前缀使用 tiptap-。
- 组件变体一律通过 data-* 属性驱动，不要新增修饰类名。
- 业务页面样式放入对应 features/<name>/<name>.css，并通过 index.css 的 @import 引入。
- 动画优先复用 _keyframe-animations.scss 中的 keyframes，必要时再新增并统一命名（小驼峰）。