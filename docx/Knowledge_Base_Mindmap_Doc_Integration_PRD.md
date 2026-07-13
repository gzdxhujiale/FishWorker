# Product Requirements Document (PRD): 知识库导图与文档联动及 UIUX 优化

## 1. 概述
### 包含:
- **问题陈述：** 当前知识库中的思维导图和长文档存在割裂，用户无法从导图结构中直观地切入文档进行深入编辑。另外，文档缺乏导出能力，且导图的编辑器工具栏过于拥挤（单行显示），影响了用户体验和效率。
- **建议的解决方案：** 支持在思维导图模式下双击节点直接进入该节点的长文本编辑模式（Word 模式）。添加将文档内容导出为 `.docx` 或 `.md` 格式的支持。优化导图编辑器上方的工具栏，将其分为两栏展示，减轻单行排版的视觉压力和寻找工具的困难。

## 2. 核心理念
通过知识库导图和文档的无缝联动，打造“结构化思考（导图）+ 深度表达（长文档）”的一体化编辑体验。UIUX 应当服务于工具的易用性，遵循“常用优先、分类清晰”的原则进行界面排版。

## 3. 解决方案概述

### 3.1 建议的解决方案
- **高层级描述**: 我们正在对现有的 `FishWorker` 知识库模块进行功能增强和体验升级，核心是通过事件监听打通导图和文档，并增加格式导出与布局优化。
- **核心能力**:
  - 节点级事件响应：捕获导图节点的双击操作。
  - 多格式文档导出：在 Document 模式增加导出入口。
  - 两栏工具栏布局：对现有的 Toolbar UI 重构。

### 3.2 包含在本次范围内
- **功能点 1（导图文档联动）：** 在导图视图（`MindMapWorkspace` / `simpleMindMapAdapter`）中，支持双击（`dblclick` 或 `node_dblclick`）某节点，将该节点设为选中状态，并立即触发编辑器模式切换（`onEditorModeChange("word")`），直接进入该节点的文档模式。
- **功能点 2（文档导出支持）：** 在 `KnowledgeDocumentWorkspace` 的功能菜单中，增加“导出”按钮。支持调用相关库将当前文档数据转换为 `.docx` 及 `.md` 格式并提供给用户下载。
- **功能点 3（导图 UIUX 优化）：** 修改 `mindmap.css` 及 `MindMapWorkspace.tsx` 中的 `.mindmap-local-toolbar`，将其结构从单行横向溢出（`white-space: nowrap`, `overflow-x: auto`）重构为双栏布局（可使用 CSS Grid 或者 Flex Wrap 分类展示：例如一栏放置基础操作如节点增删、连线等；另一栏放置 `MindMapTextFormatToolbar` 文本格式化工具），减少用户滑动。

### 3.3 超出本次范围
- 一次性导出整个导图树所有节点合并后的一份大文档（本次仅考虑单节点对应的文档导出，或者整个大纲的合并导出可作为二期评估）。
- 导图的自动布局算法替换或高级定制。

## 4. 用户故事与需求

### 4.1 用户故事
```
作为一名 知识库深度使用者
我希望 能够在思维导图中双击一个节点
以便于 我能立即开始撰写和查看关于这个节点的详细长文本内容

验收标准：
[ ] 在导图模式下，双击任意带有文本的节点。
[ ] 界面自动无缝切换到 `Word` 模式。
[ ] 此时 `Word` 模式加载的是刚刚双击对应的节点数据。
```

```
作为一名 内容创作者
我希望 能够将我写好的知识库文档导出为 docx 和 md 格式
以便于 分享给未安装此系统的同事，或者上传到其他平台

验收标准：
[ ] 文档编辑界面有明显的“导出”下拉框或按钮。
[ ] 选中 `.md` 后，成功下载包含 Markdown 语法的纯文本文件。
[ ] 选中 `.docx` 后，成功下载可被 Word 打开的对应文件。
```

### 4.2 功能需求
| ID | 需求描述 | 备注 |
|----|------------|-------|
| FR1 | 系统捕获 `simple-mind-map` 的节点双击事件并触发模式切换。 | 依赖修改 `simpleMindMapAdapter.ts` 和传入相关 Handler |
| FR2 | 文档支持导出为 `.docx` 格式。 | 需要引入并调研如 `docx` 或 `html-to-docx` 等 npm 包进行 AST 或 HTML 转换。 |
| FR3 | 文档支持导出为 `.md` 格式。 | 若原数据是 JSON/HTML，需转换为 Markdown 语法输出。 |
| FR4 | 工具栏分为上下（或左右）两排，确保屏幕较窄时不会互相遮挡挤压。 | 依赖修改 `mindmap.css` 及相关组件层级。 |

### 4.3 非功能需求
- **易用性 (Usability)：** 工具栏拆分后，相关功能的归类需符合直觉，比如基础节点操作在一栏，文本颜色字体等格式操作在另一栏。

## 5. 设计与用户体验

### 5.1 设计原则
- **操作连贯性：** 节点双击进入文档是“放大细节”，操作需自然且不打断心流。
- **直观可见性：** 工具栏拆分为两栏后，用户一眼就能看到所需的工具，而不需要拖拽横向滚动条。

### 5.2 页面结构与交互流程
1. 用户打开知识库进入 Mindmap 视图。
2. 鼠标双击节点 A：触发 `node_dblclick` 事件 -> 调用 `publishSelectedNode(A)` -> 调用 `onEditorModeChange("word")`。
3. 界面切换为 `KnowledgeDocumentWorkspace`，显示节点 A 的富文本。
4. 用户在文档模式点击“导出”，下拉选择“导出为 Word (.docx)”或“导出为 Markdown (.md)”。
5. 导图顶部工具栏原 `mindmap-local-toolbar`：
   - 上半部分：节点增删、上级/下级节点、连线、布局、撤销重做等结构性操作。
   - 下半部分：字体加粗、颜色、字号、边框等样式相关操作（即 `MindMapTextFormatToolbar` 独立为一排或占据下方）。

## 6. 技术规格说明

### 6.1 前端代码修改建议
- **事件监听补充**：在 `simpleMindMapAdapter.ts` 的事件绑定阶段，监听 `node_dblclick`。在回调中，抛出自定义事件或直接将节点的 uid 作为 `WorkspaceModeChangeRequest` 传回给 `MindMapWorkspace` 触发模式变更。
- **Toolbar 拆分**：
  在 `MindMapWorkspace.tsx` 的渲染中，原先可能是所有操作放进一个 `div.mindmap-local-toolbar`，可分离为：
  ```html
  <div className="mindmap-toolbar-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <div className="mindmap-local-toolbar structural-toolbar">...</div>
    <div className="mindmap-local-toolbar style-toolbar">
       <MindMapTextFormatToolbar ... />
    </div>
  </div>
  ```
- **文档导出实现**：
  在 `KnowledgeDocumentWorkspace.tsx` 增加导出处理函数。如果是导出 md，可以将编辑器的内容转换或提取为 md 字符串并生成 Blob 提供下载。如果是 docx，可以引入类似 `html-to-docx` 的库，在前端直接生成 blob 并触发下载。
