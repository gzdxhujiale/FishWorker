# 清单模块前端接口与数据模型文档 (Lists Frontend API)

本文档描述了“清单”功能模块（v1.4）的前端数据模型定义，以及 Zustand Store (`useListsStore`) 提供的数据操作接口与 Tauri 后端 API。当前数据存储**基于 Rust 后端直连 TiDB** 实现，前端通过 Tauri IPC (Invoke) 与后端同步数据，并采用内存乐观更新策略以保证极速响应。

## 1. 数据模型定义 (Models)

### 1.1 List (清单)
表示一个清单（类似一个项目或笔记本），可以包含多个笔记，并且可以被放入一个文件夹中。

```typescript
export type ViewType = 'list' | 'board';

export interface List {
  id: string;               // 唯一标识符
  name: string;             // 清单名称
  icon: string;             // 清单图标 (Lucide 图标名)
  color: string;            // 颜色十六进制或 'none'
  viewType: ViewType;       // 视图模式
  folderId: string | null;  // 所属文件夹的 ID，null 表示独立清单
  isPinned?: boolean;       // 是否置顶
  itemCount?: number;       // UI 展示用的项目数量 (非持久化核心字段)
  sortOrder?: number;       // 用于拖拽排序的连续型整数
}
```

### 1.2 Folder (文件夹)
用于对清单进行分组管理。

```typescript
export interface Folder {
  id: string;               // 唯一标识符
  name: string;             // 文件夹名称
  isPinned?: boolean;       // 是否置顶
  sortOrder?: number;       // 用于拖拽排序的连续型整数
}
```

### 1.3 Note (笔记)
清单中的具体内容项。

```typescript
export interface Note {
  id: string;               // 唯一标识符
  listId: string;           // 归属的清单 ID
  groupId: string | null;   // 归属的分组 ID，null 为未分组
  title: string;            // 笔记标题
  content: string;          // 笔记正文内容 (HTML 富文本格式，支持多级标题、加粗/斜体/下划线、有序/无序/任务列表，文本颜色，背景高亮等)
  isPinned?: boolean;       // 是否置顶
  sortOrder?: number;       // 用于拖拽排序的连续型整数
  createdAt: number;        // 创建时间 (时间戳)
  updatedAt: number;        // 更新时间 (时间戳)
}
```

### 1.4 NoteGroup (分组)
清单内容区的分组管理。

```typescript
export interface NoteGroup {
  id: string;               // 唯一标识符
  listId: string;           // 所属清单 ID
  name: string;             // 分组名称
  sortOrder?: number;       // 排序用整数
}
```

### 1.4 Template (模板)
用于快速创建笔记的预设模板。

```typescript
export interface Template {
  id: string;               // 唯一标识符
  name: string;             // 模板名称
  content: string;          // 模板正文内容 (HTML 富文本格式，支持与笔记相同的富文本排版元素)
}
```

## 2. Store 接口定义 (Store API)

`useListsStore` 提供了以下对上述模型进行增删改查（CRUD）的方法。

### 2.1 清单 (List) 操作
- `getLists(): List[]`
  获取所有清单。返回的数据应优先按 `isPinned` 降序排列。
- `addList(list: Omit<List, 'id'>): List`
  添加一个新清单并生成唯一 ID，返回添加后的清单对象。
- `updateList(id: string, updates: Partial<List>): void`
  更新指定清单的属性（如：重命名、置顶状态等）。
- `duplicateList(id: string): void`
  复制指定清单，并深拷贝该清单下的所有分组 and 笔记。
- `deleteList(id: string): void`
  删除指定清单，并级联删除该清单下的所有分组和笔记。
- `reorderLists(orderedIds: string[]): void`
  根据提供的 ID 数组更新同文件夹内清单的顺序。
- `moveList(listId: string, folderId: string | null, targetIndex?: number): void`
  将清单移动到指定文件夹下，并可选地插入到指定索引位置。

### 2.2 文件夹 (Folder) 操作
- `getFolders(): Folder[]`
  获取所有文件夹。优先按 `isPinned` 降序排列。
- `addFolder(name: string): Folder`
  创建一个新文件夹并生成唯一 ID。
- `updateFolder(id: string, updates: Partial<Folder>): void`
  更新指定文件夹属性（如：重命名、置顶）。
- `deleteFolder(id: string): void`
  删除指定文件夹，同时将该文件夹下的所有清单的 `folderId` 置为 `null`。
- `reorderFolders(orderedIds: string[]): void`
  根据提供的 ID 数组更新所有文件夹的排序顺序（`sortOrder`），并异步同步至云端。

### 2.3 笔记 (Note) 操作
- `getNotesByListId(listId: string): Note[]`
  获取指定清单下的所有笔记。优先按 `isPinned` 降序，其次按 `sortOrder` 和 `updatedAt` 降序排列。
- `addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note`
  添加一条新笔记，自动生成 ID 和时间戳。
- `updateNote(id: string, updates: Partial<Note>): void`
  更新笔记，自动更新 `updatedAt` 时间戳。
- `duplicateNote(id: string): void`
  复制指定的笔记，生成一条带有“副本”后缀的新笔记。
- `deleteNote(id: string): void`
  删除指定笔记。
- `moveNoteAndReorder(noteId: string, groupId: string | null, targetIndex?: number): void`
  将笔记移动 to 指定分组下，并可选地插入到该分组的指定位置进行排序。

### 2.4 分组 (NoteGroup) 操作
- `addGroup(listId: string, name: string): NoteGroup`
  在指定清单下创建一个新分组。
- `updateGroup(id: string, updates: Partial<NoteGroup>): void`
  更新分组（如重命名等）。
- `deleteGroup(id: string): void`
  删除指定分组，系统会将原先属于该分组的笔记的 `groupId` 置为 `null`（即移至未分组），不会级联删除笔记。

### 2.4 模板 (Template) 操作
- `getTemplates(): Template[]`
  获取所有可用的笔记模板。系统应内置几套默认模板（如：会议纪要、阅读笔记、每周工作总结）。
- `addTemplate(name: string, content: string): Template`
  用户从笔记中保存或新建的模板。
- `updateTemplate(id: string, updates: Partial<Template>): void`
  更新模板的名称或内容。
- `deleteTemplate(id: string): void`
  删除指定的模板。

### 2.5 数据持久化与同步机制 (Data Persistence & Sync)
- **初始加载 (Initialization)**: `useListsStore` 中的 `init()` 异步从 Tauri IPC 加载所有数据。如果检测到本地 `localStorage` 有遗留数据，会自动进行一次性迁移到 TiDB。
- **乐观更新 (Optimistic UI)**: 前端的所有 CRUD 操作都会通过 Zustand **同步**更新本地内存状态，以实现极速响应（例如即时新建、拖拽即时生效），然后以“触发后不管 (fire-and-forget)”的方式异步调用 Tauri IPC 命令将变更写入 TiDB 数据库。
- **写入防抖 (Debouncing)**: 针对笔记内容的编辑这种极高频操作，在 Zustand Action 中使用 `500ms` 的防抖拦截，减少向后端和数据库发送的 IO 频率。
- **数据回退 (Fallback)**: 若 Tauri 后端 IPC 调用失败（例如未在 Tauri 环境下运行或数据库离线），Zustand Store 具备后备处理，可降级从 `localStorage` 获取数据以确保本地调试依然可用。

## 3. 后端 Native API 与集成优化

### 3.1 跨平台系统文件对话框 API
为规避 WebView2 对前端 `Blob` 文件下载的沙箱限制，使用 Rust 后端原生系统文件对话框完成 Markdown 文件读写。

- **导入 Markdown 文件**
  * **命令**: `pick_markdown_file`
  * **输入**: 无
  * **输出**: `Promise<string>`
  * **说明**: 触发系统原生文件打开选择器，限制选择 `.md` 格式文件。确认后返回选中文件的全部 Markdown 字符串。前端在获取到字符串后，利用 `TipTap` 的 `Editor` 实例及 `tiptap-markdown` 插件将源码解析为对应富文本 HTML 结构，再显示并保存。
- **导出 Markdown 文件**
  * **命令**: `save_markdown_file`
  * **输入**: `{ defaultName: string, content: string }`
  * **输出**: `Promise<void>`
  * **说明**: 触发系统原生文件保存选择器，默认指定初始保存名称。确认后由后端直接将 Markdown 字符串内容写入指定磁盘路径。
- **批量导入 Markdown 文件**
  * **命令**: `pick_multiple_markdown_files`
  * **输入**: 无
  * **输出**: `Promise<Array<{ title: string, content: string }>>`
  * **说明**: 触发系统原生的文件打开选择器（支持多选），限制选择 `.md` 格式。确认后，由后端批量读取选中文件，以文件名（不含扩展名）作为 `title`，文件正文内容作为 `content` 返回给前端数组。前端遍历数组时，会调用 `TipTap Editor` （无头模式）先将 Markdown 文本转化并解析为正规的 HTML，再持久化入库，保障富文本正常渲染。
- **批量导出 Markdown 文件**
  * **命令**: `save_multiple_markdown_files`
  * **输入**: `{ files: Array<{ title: string, content: string }> }`
  * **说明**: 触发系统原生的文件夹选择器（`pick_folder`）。用户确认保存的目录路径后，后端自动循环将文件数组中的 `content` 转换为 Markdown 文件内容，并在该目录下以 `{title}.md` 进行批量保存，并处理好同名冲突和非法字符过滤。

### 3.2 数据库连接初始化性能优化
- **延迟/异步初始化**: 更改 `establish_connection` 流程，通过 `connect_lazy` 毫秒级建立句柄并不阻塞 Tauri 程序 `.setup` 的主线程（修复冷启动白屏白字现象），并将 `ensure_tables` 表结构迁移放置在后台 Tokio 异步进程中执行。
- **SSL 安全连接**: 后端连接选项显式添加了 `ssl-mode=required` 参数以对接远端 TiDB 加密通信审计，并设置连接超时限制为 `10s`。

### 3.3 数据库同步与重新排序 API
- **文件夹重新排序**
  * **命令**: `list_reorder_folders`
  * **输入**: `{ items: Array<[string, number]> }`
  * **输出**: `Promise<void>`
  * **说明**: 批量更新后端数据库中各文件夹的 `sort_order`，保证排序后的永久一致性。

## 4. 全局提示组件接口 (Toast API)

为提供非阻塞式的操作状态反馈，前端通过统一的 Toast 提示状态对各种文件与操作行为进行全局通知。

### 4.1 Toast 属性与类型定义
```typescript
export type ToastType = 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}
```

### 4.2 提示函数定义
- `showToast(message: string, type?: ToastType): void`
  在主视图中心顶部拉起一条浮动提示消息。成功时提示“导入成功”、“导出成功”等；发生错误或被取消时进行静默或显著的错误提示。提示消息显示 3 秒后将自动渐隐销毁。

## 5. 本地持久化缓存与状态记忆 (LocalStorage API)

清单模块在客户端通过 `localStorage` 缓存一些非核心业务、属于用户偏好/导航状态的数据，以提升使用连贯性：

- **`lists-sidebar-collapsed`**
  * **类型**: `"true" | "false"`
  * **说明**: 记忆左侧侧边栏折叠/收起状态。
- **`lists-active-list-id`**
  * **类型**: `string` (UUID)
  * **说明**: 记忆最后一次点击并激活的清单 ID。切换页面导航再切换回来时，将首先查找并尝试恢复该 ID 代表的清单，从而保持激活状态不变。若首次启动或记录失效，则降级按第一个文件夹的首个清单规则进行默认初始化。

## 6. 前端架构及编辑器配置 (Frontend Architecture & Editor Config)

为了支持全模块和全应用统一的富文本体验，避免 React Strict Mode 下 TipTap 报错 (Duplicate extension names found)，所有 TipTap 编辑器的核心扩展与悬浮菜单都在 `src/features/tiptap` 中进行集中管理。在 v2.5 中，引入了统一包装的简单编辑器模板组件：

- **`config.ts`**: 暴露 `getTiptapExtensions()` 方法用于每次生成全新独立的扩展实例组，包含 Markdown、Color、TextStyle、Highlight 以及拖拽插件。
- **`SimpleEditor.tsx`**: 统一包装的 React 编辑器组件，支持通过 Props 自定义行为，并支持将内部 Editor 实例暴露给父组件（用于 Markdown 导入导出）。
- **`TipTapBubbleMenu.tsx`**: 基于光标选中文字触发的纯图标状态悬浮菜单 (Bubble Menu)。
- **`BlockDragHandleMenu.tsx`**: 提供块级别拖拽重排序及富文本属性转换（如设为标题、高亮、删除块等）操作 of 上下文菜单。

### 6.1 `SimpleEditor` API 定义与属性

组件路径：[SimpleEditor.tsx](file:///c:/Users/Admin/Documents/FishWorker/src/features/tiptap/SimpleEditor.tsx)

```typescript
interface SimpleEditorProps {
  content: string;                         // 受控或半受控的 HTML 富文本内容
  onChange: (html: string) => void;        // 内容更新时的回调函数
  placeholder?: string;                    // 编辑器空白时的占位提示文本
  editable?: boolean;                      // 是否处于可编辑状态 (默认为 true)
  className?: string;                      // 附加在最外层容器的 CSS 类名
  style?: React.CSSProperties;             // 附加在最外层容器的内联样式
  editorClassName?: string;                // 附加在编辑器内容区 (EditorContent) 的 CSS 类名
  editorStyle?: React.CSSProperties;       // 附加在编辑器内容区 (EditorContent) 的内联样式
  enableMarkdown?: boolean;                // 是否启用 Markdown 支持 (默认为 true)
  enableDragHandle?: boolean;              // 是否启用块级拖拽手柄 (默认为 true)
  enableBubbleMenu?: boolean;              // 是否启用选中文本悬浮气泡菜单 (默认为 true)
  enableTopToolbar?: boolean;              // 是否启用顶部固定菜单栏 (默认为 true)
  dense?: boolean;                         // 是否启用紧凑间距 (默认为 true，缩小行高和段落边距)
  onCreated?: (editor: Editor) => void;    // 编辑器实例就绪后的回调，可供父组件直接获取句柄以调用其 API
}
```

### 6.2 集成指南与使用示例

#### 1) 在笔记详情抽屉集成
在 [NoteDrawer.tsx](file:///c:/Users/Admin/Documents/FishWorker/src/features/lists/NoteDrawer.tsx) 中引入 `SimpleEditor`，替代原本手写的 `TipTapBubbleMenu` / `BlockDragHandleMenu` / `EditorContent` 代码，并接收 `onCreated={setEditor}` 状态回调，以便在组件内继续使用 `editor` 变量以调用 `commands.setContent` 执行 Markdown 导入及获取 Markdown 文本导出：
```typescript
import { SimpleEditor } from '../tiptap/SimpleEditor';

// ...
const [editor, setEditor] = useState<Editor | null>(null);

// ...
<SimpleEditor
  content={content}
  onChange={setContent}
  onCreated={setEditor}
  placeholder=""
  editorStyle={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column' }}
  editorClassName="tiptap-editor-wrapper"
/>
```

#### 2) 在模板编辑弹窗集成
在 [TemplateModal.tsx](file:///c:/Users/Admin/Documents/FishWorker/src/features/lists/TemplateModal.tsx) 中引入 `SimpleEditor`，并关闭 Markdown 转换：
```typescript
<SimpleEditor
  content={editContent}
  onChange={setEditContent}
  onCreated={setEditor}
  placeholder=""
  enableMarkdown={false}
  className="template-editor-wrapper"
  style={{ border: '1px solid var(--line-soft)', borderRadius: '4px', display: 'flex', flexDirection: 'column', minHeight: '200px' }}
  editorStyle={{ flex: 1, overflowY: 'auto', padding: '12px' }}
/>
```


