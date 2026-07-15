# 时间管理模块同步接口 API 文档

本文档描述了时间管理模块如何与 Tauri / Rust 后端进行通信并同步至 TiDB 数据库的接口定义。

## 1. 数据库设计 (TiDB / MySQL)

为避免复杂的表结构变更及实现跨平台的简单同步，时间管理数据采用单行 JSON 记录进行存储。

**表名：** `time_management_data`

| 字段名 | 数据类型 | 描述 |
| ------ | -------- | ---- |
| `id` | `VARCHAR(64)` | 主键，默认存储单条记录 `'default'` |
| `payload_json` | `LONGTEXT` | 完整的时间管理数据，序列化的 JSON |
| `updated_at` | `DATETIME(3)` | 该条数据的最后更新时间 |

**`payload_json` 结构定义 (TypeScript Reference):**
```typescript
interface TimeManagementData {
  roles: {
    id: string;
    name: string;
    color?: string;
    createdAt: number;
  }[];
  tasks: {
    id: string;
    title: string;
    roleId?: string;
    quadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    scheduledDate?: string; // YYYY-MM-DD
    timeOfDay?: 'morning' | 'afternoon';
    completed: boolean;
    createdAt: number;
    completedAt?: number;
    description?: string;
    deadline?: number; // Timestamp
  }[];
}
```

---

## 2. IPC 接口定义 (Tauri API)

时间管理模块通过 Tauri 的 `@tauri-apps/api/core` 中的 `invoke` 方法与后端通信。

### 2.1 拉取数据 (`time_management_load`)

应用启动或打开时间管理面板时调用，用于获取云端最新状态。

- **Command Name**: `time_management_load`
- **Request Payload**: 无参数 `{}`
- **Response**: `Promise<TimeManagementData | null>`
- **返回逻辑**:
  - 成功连接且有数据时返回解析后的 JSON 对象。
  - 数据表为空（未曾同步）时返回 `null`。
  - 异常断网、连接失败时抛出错误 (`Promise.reject`)。

### 2.2 保存数据 (`time_management_save`)

在新增/修改/删除角色或任务后，采用防抖机制（例如 1000 毫秒）延时后调用，以全量覆盖的方式保存至云端。

- **Command Name**: `time_management_save`
- **Request Payload**:
  ```typescript
  {
    payload: TimeManagementData
  }
  ```
- **Response**: `Promise<void>`
- **返回逻辑**:
  - 成功写入数据库后 `resolve`。
  - 写入失败时 `reject` 抛出错误字符串，前端据此更新后台同步状态并启动数据冲突对齐或重试机制。
