# 时间管理模块同步接口 API 文档

本文档描述了时间管理模块如何与 Tauri / Rust 后端进行通信并同步至 TiDB 数据库的接口定义。

## 1. 数据库设计 (TiDB / MySQL)

时间管理数据主要分为“角色”与“任务”两张实体表，使用外键及关联设计以支持高粒度的数据流转与同步。

### 1.1 角色数据来源 (联动自「人生罗盘」)

时间管理模块的角色数据表 `time_management_roles` 不再使用，当前全部关联至「人生罗盘」模块的 `mission_roles` 数据库表。角色代表色 `color` 由前端根据排序等规律动态分配渲染，在数据库中不单独存储。

### 1.2 任务表 (`time_management_tasks`)

| 字段名 | 数据类型 | 描述 |
| ------ | -------- | ---- |
| `id` | `VARCHAR(36)` | 主键 (UUID) |
| `title` | `VARCHAR(255)` | 任务标题 |
| `role_id` | `VARCHAR(36)` | 关联的「人生罗盘」角色 ID，可空 |
| `quadrant` | `VARCHAR(10)` | 艾森豪威尔四象限分类 ('Q1'|'Q2'|'Q3'|'Q4') |
| `scheduled_date` | `VARCHAR(20)` | 排期执行日期字符串 ('YYYY-MM-DD')，可空 |
| `time_of_day` | `VARCHAR(20)` | 上下午排期标识 ('morning'|'afternoon')，可空 |
| `completed` | `TINYINT(1)` | 完成状态 (0 或 1) |
| `created_at` | `BIGINT` | 创建时间戳 (ms) |
| `completed_at` | `BIGINT` | 完成时间戳 (ms)，可空 |
| `description` | `TEXT` | 任务备注详细信息，可空 |
| `deadline` | `BIGINT` | 截止日期时间戳 (ms)，可空 |
| `updated_at` | `TIMESTAMP` | 记录更新时间 |

---

## 2. IPC 接口定义 (Tauri API)

时间管理模块通过 Tauri 的 `@tauri-apps/api/core` 中的 `invoke` 方法与后端通信。

### 2.1 载入全部时间管理数据 (`tm_load_all`)

应用启动或打开面板时调用，其中 `roles` 的数据将直接从 `mission_roles` 表加载，`tasks` 的数据来自 `time_management_tasks` 表。

- **Command Name**: `tm_load_all`
- **Request Payload**: 无参数 `{}`
- **Response**: `Promise<{ roles: Role[], tasks: Task[] }>`

### 2.2 保存/更新角色 (`tm_upsert_role` - 已弃用)

周计划内不单独管理角色。角色添加与更新请使用人生罗盘模块对应的接口（如 `mission_create_role`）。

### 2.3 删除角色 (`tm_delete_role` - 已弃用)

周计划内不单独管理角色。删除请使用人生罗盘模块对应的 `mission_delete_role`。在人生罗盘中删除角色后，系统会自动更新本模块任务，使相关所有关联任务的 `role_id` 字段设为 `NULL`。

### 2.4 保存/更新任务 (`tm_upsert_task`)

添加或修改任务字段，或移动象限、改变完成状态、设置排期。

- **Command Name**: `tm_upsert_task`
- **Request Payload**: `{ task: Task }`
- **Response**: `Promise<void>`

### 2.5 删除任务 (`tm_delete_task`)

物理删除该任务。

- **Command Name**: `tm_delete_task`
- **Request Payload**: `{ id: string }`
- **Response**: `Promise<void>`

---

## 3. 乐观更新与防抖同步机制 (v1.2)

在 v1.2 的任务编辑交互重构中，`TaskDetailModal` 前端不再需要手动提交确认：
1. **乐观更新 (Optimistic UI)**：在标题输入、时间变更或 Tiptap 内容改变时，前端会同步且即时地修改本地的 Zustand State，从而实现 UI 视觉上的瞬间更新（无顿挫感）。
2. **防抖同步 (Debounced Sync)**：
   - 对于文本类频繁变更字段（如任务标题、富文本详细内容），在值改变后，前端不会立即向 Tauri 发送 `tm_upsert_task` 指令，而是采取 **500ms 的防抖机制**，将多次按键修改合并为单次 `invoke` 请求。
   - 对于突发关闭（如点击外侧遮罩层、点击右上角关闭按钮），弹窗组件会在卸载瞬间强制执行一次刷盘（Flush），保证最后一次未保存的修改立即写入数据库。

