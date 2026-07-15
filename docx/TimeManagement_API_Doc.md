# 时间管理模块同步接口 API 文档

本文档描述了时间管理模块如何与 Tauri / Rust 后端进行通信并同步至 TiDB 数据库的接口定义。

## 1. 数据库设计 (TiDB / MySQL)

时间管理数据主要分为“角色”与“任务”两张实体表，使用外键及关联设计以支持高粒度的数据流转与同步。

### 1.1 角色表 (`time_management_roles`)

| 字段名 | 数据类型 | 描述 |
| ------ | -------- | ---- |
| `id` | `VARCHAR(36)` | 主键 (UUID) |
| `name` | `VARCHAR(255)` | 角色名称 (例如 "个人成长") |
| `color` | `VARCHAR(50)` | 角色代表色十六进制 |
| `created_at` | `BIGINT` | 创建时间戳 (ms) |
| `updated_at` | `TIMESTAMP` | 记录更新时间 |

### 1.2 任务表 (`time_management_tasks`)

| 字段名 | 数据类型 | 描述 |
| ------ | -------- | ---- |
| `id` | `VARCHAR(36)` | 主键 (UUID) |
| `title` | `VARCHAR(255)` | 任务标题 |
| `role_id` | `VARCHAR(36)` | 关联的角色 ID，可空 |
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

应用启动或打开面板时调用，用于获取数据库中所有角色和任务的状态。

- **Command Name**: `tm_load_all`
- **Request Payload**: 无参数 `{}`
- **Response**: `Promise<{ roles: Role[], tasks: Task[] }>`

### 2.2 保存/更新角色 (`tm_upsert_role`)

添加或修改角色属性。

- **Command Name**: `tm_upsert_role`
- **Request Payload**: `{ role: Role }`
- **Response**: `Promise<void>`

### 2.3 删除角色 (`tm_delete_role`)

物理删除该角色。并自动将相关所有关联任务的 `roleId` 字段设为 `null`。

- **Command Name**: `tm_delete_role`
- **Request Payload**: `{ id: string }`
- **Response**: `Promise<void>`

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
