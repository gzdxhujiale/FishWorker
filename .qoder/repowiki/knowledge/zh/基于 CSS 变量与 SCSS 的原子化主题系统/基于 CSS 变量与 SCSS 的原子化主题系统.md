---
kind: frontend_style
name: 基于 CSS 变量与 SCSS 的原子化主题系统
category: frontend_style
scope:
    - '**'
source_files:
    - src/styles/_variables.scss
    - src/index.css
    - src/styles/_keyframe-animations.scss
    - src/styles/layout.css
    - src/components/layout/AppLayout.css
    - src/components/tiptap-ui-primitive/button.scss
    - src/components/tiptap-ui-primitive/badge.scss
---

## 样式体系概览
FishWorker 采用「CSS 自定义属性 + SCSS 变量」驱动的主题系统，配合 BEM 风格的类名命名，在 Tauri + React + Vite 桌面应用中实现一致的视觉风格。项目未使用 Tailwind、styled-components 等框架，而是自建了一套轻量级设计令牌（Design Tokens）。

## 核心架构
- **设计令牌集中管理**：`src/styles/_variables.scss` 通过 `:root` 和 `.dark` 双作用域定义全部颜色、圆角、阴影、过渡曲线等基础变量，前缀统一为 `--tt-`（tiptap theme），并辅以 `--surface-*`、`--text-*`、`--accent` 等应用层语义变量。
- **全局入口聚合**：`src/index.css` 作为唯一入口，按顺序 import 变量、动画、布局、共享样式及各 feature 的独立 CSS，确保加载顺序可控。
- **组件级样式隔离**：基础 UI 组件位于 `src/components/tiptap-ui-primitive/`，每个组件一个 `.tsx` + 同名 `.scss` 文件对，如 `button.tsx` + `button.scss`；业务组件则遵循相同模式（如 `dailyReview.css`、`lists.css`、`timeManagement.css`）。
- **暗色模式切换**：通过在根节点添加/移除 `.dark` class 覆盖变量值，无需 JS 计算，完全由 CSS cascade 驱动。

## 关键约定
1. **命名空间**：所有设计令牌以 `--tt-` 前缀，避免与应用变量冲突；BEM 类名使用 `tiptap-*` 前缀区分组件域。
2. **尺寸与间距**：通过 `--tt-radius-*`（xxs→xl）、`--tt-transition-duration-*`、`--tt-transition-easing-*` 等变量统一，组件内部用 `data-size="small|large"` 等 data 属性组合变体，而非多套类名。
3. **状态驱动外观**：按钮、徽章等组件通过 `data-appearance="emphasized|subdued"`、`data-active-state="on"`、`data-highlighted="true"` 等属性控制视觉态，SCSS 中用属性选择器匹配，保持 HTML 结构干净。
4. **动画复用**：`_keyframe-animations.scss` 提供 fadeIn/fadeOut/zoom/slideFrom* /spin 等通用 keyframes，被各 feature 按需引用。
5. **布局策略**：主布局使用 CSS Grid（`app-shell` 64px 侧边栏 + 1fr 内容区），可折叠面板通过 CSS 变量 `--library-pane-width`、`--catalog-pane-width` 动态控制宽度，结合 `visibility` 与 `pointer-events` 实现平滑展开/收起。

## 开发者规范
- 新增颜色/圆角/阴影时优先修改 `_variables.scss`，禁止在组件内硬编码色值。
- 新组件样式文件必须放在对应目录并与 TSX 同名，通过 `index.css` 统一导入。
- 交互态优先使用 `data-*` 属性 + 属性选择器，避免创建大量修饰类。
- 暗色模式下需同步提供 `.dark` 下的变量覆盖，保证对比度达标。
- 动画应复用 `_keyframe-animations.scss` 中的 keyframes，必要时扩展而非重写。