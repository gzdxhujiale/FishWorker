# 模板模块前端接口与数据模型文档 (Templates Frontend API)

本文档描述了独立解耦后的“模板”功能模块（`src/features/templates`）的前端数据模型定义、Zustand Store (`useTemplateStore`) 接口与数据持久化机制。

## 1. 架构解耦背景 (Architectural Decoupling)

在原先版本中，模板（`Template`）的代码与数据状态混入在“清单”模块（`src/features/lists`）内部。随着业务演进，每日复盘（`daily-review`）等多个独立模块均需要调用模板选择与编辑功能。

为了遵循单一职责与高内聚解耦设计，我们将模板功能重构抽取为 `src/features/templates` 独立模块，提供统一的模板状态管理、持久化服务与 UI 弹窗组件。

---

## 2. 数据模型定义 (Data Models)

### 2.1 Template (模板)
表示用户用于快速填充笔记或复盘内容的预设模板。

```typescript
export interface Template {
  id: string;       // 唯一标识符 (例如 'tpl-1' 或 'tpl-1719876543-abc')
  name: string;     // 模板名称 (例如 '会议纪要'、'每周工作总结')
  content: string;  // 模板正文内容 (支持 HTML 富文本或 JSON 格式)
}
```

### 2.2 默认模板预设 (Default Templates)
系统内置三套预设模板 (`DEFAULT_TEMPLATES`)：
1. **会议纪要**: 包含主题、时间、与会人、会议目标、预期成果等节点。
2. **阅读笔记**: 包含书名、作者、灵感摘要、读后感悟等节点。
3. **每周工作总结**: 包含本周工作目标、成就感事项、阻碍及总结反思。

---

## 3. Store 接口定义 (useTemplateStore API)

`useTemplateStore` 提供了对模板数据集中管理的 Zustand Store 操作：

```typescript
interface TemplateStoreState {
  templates: Template[];
  initialized: boolean;
  
  getTemplates: () => Template[];
  addTemplate: (name: string, content: string) => Template;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  setTemplates: (templates: Template[]) => void;
}
```

### 3.1 方法说明
- **`getTemplates(): Template[]`**
  获取当前所有可用模板列表。
- **`addTemplate(name: string, content: string): Template`**
  创建并保存新模板，自动生成以 `tpl-` 为前缀的唯一 ID，并同步持久化。
- **`updateTemplate(id: string, updates: Partial<Template>): void`**
  更新已有模板的名称或正文内容，并同步写入持久化层。
- **`deleteTemplate(id: string): void`**
  删除指定 ID 的模板，并同步更新后端与内存状态。
- **`setTemplates(templates: Template[]): void`**
  批量设置/初始化模板列表（用于从后端或数据库批量恢复数据）。

---

## 4. 后端持久化与 IPC 通信 (templateService)

模板数据的持久化通过 `templateService.ts` 封装 Tauri IPC 命令：

- **`upsertTemplate(template: Template): Promise<void>`**
  - **Tauri IPC Command**: `list_upsert_template`
  - **说明**: 将新建或修改后的模板对象同步至 TiDB 数据库。
- **`deleteTemplate(id: string): Promise<void>`**
  - **Tauri IPC Command**: `list_delete_template`
  - **说明**: 从 TiDB 数据库中删除指定模板。

---

## 5. UI 组件接口 (TemplateModal & ConfirmBubble)

### 5.1 TemplateModal 组件
组件路径：`src/features/templates/TemplateModal.tsx`

支持在弹窗内浏览模板网格、关键字实时搜索、预览模板正文，以及使用 `reactjs-tiptap-v1` 编辑器对模板进行可视化编辑与二次保存。

```typescript
interface TemplateModalProps {
  templates: Template[];
  onSelect: (template: Template) => void;
  onClose: () => void;
  onEdit?: (id: string, name: string, content: string) => void;
  onDelete?: (id: string) => void;
}
```

---

## 6. 模块集成示例 (Integration Example)

```typescript
import { TemplateModal, useTemplateStore } from '../templates';

export function MyComponent() {
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const templates = useTemplateStore(state => state.templates);
  const updateTemplate = useTemplateStore(state => state.updateTemplate);
  const deleteTemplate = useTemplateStore(state => state.deleteTemplate);

  return (
    <>
      <button onClick={() => setIsTemplateModalOpen(true)}>使用模板</button>
      {isTemplateModalOpen && (
        <TemplateModal
          templates={templates}
          onSelect={(tpl) => console.log('Selected:', tpl)}
          onClose={() => setIsTemplateModalOpen(false)}
          onEdit={(id, name, content) => updateTemplate(id, { name, content })}
          onDelete={(id) => deleteTemplate(id)}
        />
      )}
    </>
  );
}
```
