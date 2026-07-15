# PRD: 高效能时间管理模块 v1.2 (基于《七个习惯》)

## 1. 概述 (Overview)
本模块旨在将《高效能人士的七个习惯》中的“要事第一”原则与“四象限时间管理法”结合，帮助用户跳出日常琐事，聚焦于真正重要的事情。通过“以角色为中心的周计划”和“以四象限为基础的日执行”，实现从宏观目标到微观行动的落地。

**v1.2 迭代目标：**
在 v1.1 核心管理流程与 UI 优化的基础上，进一步提升任务详情编辑的交互体验与效率：
1. **截止日期选择器重构**：采用符合项目已有技术栈的第三方库（推荐 `react-day-picker`），提供更优雅的日期时间选择体验。
2. **任务详情即时保存与富文本化**：任务详情改用即时保存机制，详细内容区引入 `tiptap` 富文本编辑器，配合**乐观更新 (Optimistic UI Updates)** 与 **防抖保存 (Debounced Saving)**，让编辑过程如行云流水。
3. **全局弹窗交互优化**：所有的弹窗窗口（包含任务详情弹窗、新增/编辑清单弹窗、模板弹窗等）均支持点击窗口外（Overlay/Backdrop）区域进行关闭，提升整体操作连贯性。

## 2. 核心理念 (Core Concepts)
*   **原则驱动**: 以价值观 and 原则为核心，而不是被突发事件牵着鼻子走。
*   **无感保存**: 消除繁琐的“保存/取消”按钮，通过防抖和乐观更新，让用户的修改立即生效且体验流畅。
*   **极致交互**: 降低操作阻力，支持点击遮罩层快速退出弹窗，并提供结构化的日期选择器。

## 3. 解决方案概述 (Solution Overview)

### 3.1 包含在本次范围内

#### 功能点 1：截止日期选择器升级 (第三方库引入)
*   **描述**：将任务详情弹窗 ([TaskDetailModal](file:///c:/Users/Admin/Documents/FishWorker/src/features/time-management/TaskDetailModal.tsx)) 中的原生 `<input type="datetime-local">` 替换为项目已有的 `react-day-picker` 配合自定义时间选择组件，或者功能完备的第三方日期选择库。
*   **交互要求**：
    *   提供日历面板直观选择日期。
    *   支持清除日期。
    *   时间选择精准到时分。
    *   样式与应用全局的极简现代风保持一致。

#### 功能点 2：任务详情“即时保存 + Tiptap 编辑 + 乐观更新 + 防抖保存”
*   **即时保存与防抖**：
    *   移除任务详情弹窗底部的“保存更改”按钮（保留“删除”或“关闭”等必要辅助手段，或只通过 X/空白处关闭）。
    *   **标题**：输入框失去焦点 (Blur) 或每次输入进行防抖保存（300ms-500ms），即时更新至本地 store 和数据库。
    *   **截止时间**：一旦选择变化，立即保存。
    *   **详细内容 (Tiptap)**：引入 `tiptap` 富文本编辑器（结合项目已有的 `@tiptap/react` 依赖），用户修改内容时，采用 500ms 的**防抖 (Debounce)** 保存。
*   **乐观更新 (Optimistic Updates)**：
    *   当修改发生时，前端立即更新 Zustand Store 中的任务状态 (UI 瞬间响应)，并异步向后端/数据库发起保存请求。
    *   如果同步失败，在界面上给出微弱的提示或自动重试，不阻塞用户继续操作。

#### 功能点 3：全局弹窗“点击外侧关闭” (Overlay Click to Close)
*   **修改范围**：
    *   任务详情弹窗 [TaskDetailModal](file:///c:/Users/Admin/Documents/FishWorker/src/features/time-management/TaskDetailModal.tsx)
    *   添加/编辑清单弹窗 [AddListModal](file:///c:/Users/Admin/Documents/FishWorker/src/features/lists/AddListModal.tsx)
    *   文件夹管理弹窗 [FolderModal](file:///c:/Users/Admin/Documents/FishWorker/src/features/lists/FolderModal.tsx)
    *   模板弹窗 [TemplateModal](file:///c:/Users/Admin/Documents/FishWorker/src/features/lists/TemplateModal.tsx)
    *   批量导出弹窗 [BatchExportModal](file:///c:/Users/Admin/Documents/FishWorker/src/features/lists/BatchExportModal.tsx)
*   **交互逻辑**：
    *   点击弹窗的内容区域以外的半透明遮罩层 (Overlay/Backdrop) 时，触发 `onClose` 关闭弹窗。
    *   **注意防误触**：如果在任务详情弹窗内有正在进行的防抖保存，应确保关闭时数据已被捕获且不会丢失（如在 `onClose` 时立即同步一次最新值）。

### 3.2 超出本次范围
*   Tiptap 富文本的协同编辑或多端实时同步。
*   日历选择器的农历、节日等复杂日程标注功能。

## 4. 用户故事与需求

### 4.1 用户故事
```text
作为一名 [重度时间管理用户]
我希望 在编辑任务详情时，修改能自动保存，且能使用丰富的格式记录备忘，
以便于 我可以快速完成记录并退出，不用反复去寻找并点击“保存”按钮。
同时，我希望通过点击弹窗外侧快速关闭弹窗，保持操作的高效流畅。

验收标准：
[ ] 任务详情弹窗中的截止日期改用规范 of 第三方日期选择面板。
[ ] 详细内容区域支持富文本编辑（Tiptap）。
[ ] 任务详情的修改（标题、内容、日期）在操作后立即进行乐观更新，并防抖自动保存。
[ ] 移除弹窗底部的“保存更改”确认按钮，关闭弹窗即视为保存完毕。
[ ] 所有的 Modal 弹窗都可以通过点击外部遮罩层区域进行关闭。
```

### 4.2 功能需求
| ID | 需求描述 | 优先级 | 备注 |
|----|------------|----|-------|
| FR1 | 基于 `react-day-picker` 的截止日期选择器 | P0 | 代替不美观的原生 datetime-local |
| FR2 | 任务详情引入 Tiptap 富文本编辑器 | P0 | 提供富文本和 Markdown 支持 |
| FR3 | 乐观更新与防抖保存机制 | P0 | 标题/内容防抖 500ms，Zustand Store 乐观更新 UI |
| FR4 | 全局 Modal 遮罩层点击关闭事件 | P0 | 确保阻止冒泡，防止内容区点击误关闭 |

## 5. 设计与用户体验 (UX)

### 5.1 页面结构变化 (任务详情 Modal 重构)
```text
+------------------------------------------------------------+
| 任务详情                                            [X]    |
+------------------------------------------------------------+
| 📌 任务标题 [ 乐观更新输入框... ]                             |
| 📅 截止日期 [ 触发 react-day-picker 的下拉/弹窗选择器 ]         |
| 📝 详细内容 [ Tiptap 富文本编辑区域（防抖自动保存） ]         |
|                                                            |
| * 所有更改均实时保存                                         |
+------------------------------------------------------------+
```

## 6. Technical Specifications

### 6.1 前端组件变更建议

#### 1. `TaskDetailModal.tsx`
*   引入 `@tiptap/react` 和 `StarterKit` 渲染描述区域。
*   引入 `react-day-picker` 或自定义日期下拉组件。
*   使用 React `useEffect` 配合防抖逻辑（或自定义 debounce hook）在输入变化时自动调用 `onSave(task.id, updates)`。
*   在组件卸载 (Unmount) 或关闭前，如有未保存的改动，执行一次立即保存 (flush)。

#### 2. 全局 Modal 外部点击关闭
*   统一检查各个 Modal 的 Overlay 节点，绑定 `onClick` 事件判断 `e.target === e.currentTarget` 则触发 `onClose`：
    ```typescript
    const handleOverlayClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };
    ```

### 6.2 数据库与 Store 变更
*   由于我们在 v1.1 中已经扩展了 `description` 和 `deadline`，数据结构本次无需更改。
*   `timeManagementStore.ts` 的 `updateTask` 默认已具备防抖同步的能力，需要确认高频/低频保存的逻辑，防止高频 Tiptap 编辑引发过多网络请求。
