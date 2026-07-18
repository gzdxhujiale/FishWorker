---
kind: configuration_system
name: FishWorker 配置系统：分层 JSON + 环境变量 + 数据库偏好
category: configuration_system
scope:
    - '**'
source_files:
    - src-tauri/tauri.conf.json
    - vite.config.ts
    - src-tauri/mysql.config.json
    - src-tauri/src/db.rs
    - src-tauri/src/schema.rs
    - src/features/settings/preferencesStore.ts
---

## 1. 采用的配置体系

FishWorker 采用**三层混合配置模型**，分别面向不同生命周期与权限边界：

- **构建/打包期配置**：`src-tauri/tauri.conf.json`（Tauri 应用元数据、窗口尺寸、安全策略、bundle 图标等）+ `vite.config.ts`（开发服务器端口、HMR、别名）。
- **运行时环境配置**：`src-tauri/mysql.config.json`（MySQL/TiDB 连接信息），由 Rust 后端按多路径回退策略加载；同时通过 `process.env.TAURI_DEV_HOST` 注入开发主机。
- **用户持久化偏好**：前端 `usePreferencesStore` 以 Zustand 状态为缓存层，落盘到浏览器 `localStorage`，并异步同步至后端 MySQL 的 `app_preferences` 表，提供跨会话、跨设备的键值对存储。

## 2. 关键文件与位置

| 层级 | 文件 | 作用 |
|---|---|---|
| Tauri 应用配置 | `src-tauri/tauri.conf.json` | 应用名、版本、标识符、窗口参数、CSP、打包目标与图标 |
| Vite 构建配置 | `vite.config.ts` | 固定 dev 端口 1420、HMR 端口 1421、忽略 `src-tauri` 监听、别名映射 quill |
| 包脚本入口 | `package.json` | `tauri:dev` / `tauri:build` 脚本、pnpm overrides 覆盖 quill |
| 数据库连接配置 | `src-tauri/mysql.config.json` | host/port/user/password/database（含默认值） |
| 配置读取与写入 | `src-tauri/src/db.rs` | `read_config()` 多路径回退、`db_get_config`/`db_save_config` Tauri 命令、`db_get_preference`/`db_set_preference` |
| 首屏表结构（含偏好表） | `src-tauri/src/schema.rs` | `app_preferences(pref_key, pref_value)` 建表语句 |
| 前端偏好 Store | `src/features/settings/preferencesStore.ts` | Zustand store，初始化时批量拉取 key 列表，写操作双写 localStorage + 后端 |

## 3. 架构与设计约定

### 3.1 配置文件发现顺序（Rust 侧）

`read_config()` 按以下顺序查找 `mysql.config.json`，**首个存在且可解析者胜出**：

1. Cargo manifest 目录下的 `mysql.config.json`（开发时源码根）
2. `src-tauri/mysql.config.json`
3. 当前工作目录 `mysql.config.json`
4. 可执行文件同级目录 `mysql.config.json`
5. Windows ProgramData → `AIstudyPublicData/config/mysql.config.json`
6. Windows ProgramData → `AIstudyUserData/mysql.config.json`
7. Windows AppData/Roaming → `AIstudy/mysql.config.json`

写入路径固定为第 7 项（AppData/Roaming/AIstudy/mysql.config.json），保证用户级覆盖。

### 3.2 默认值与回退

所有字段均为 `Option<String>` / `Option<u16>`，`establish_connection()` 中用 `unwrap_or_else` 提供硬编码默认值（TiDB Cloud 地址、端口 4000、用户名密码、库名）。这意味着即使找不到配置文件也能启动，但会连到默认云端实例。

### 3.3 偏好系统的双写策略

- **读**：Zustand 内存 → `localStorage` → 调用 `db_get_preference` → 传入 `defaultValue`。
- **写**：先更新 Zustand 和 `localStorage`，再异步 `invoke('db_set_preference')`，失败仅打印日志不抛错，保证 UI 响应性。
- **初始化**：启动时只预取白名单 key（`tm-hide-completed`、`lists-sidebar-collapsed`、`lists-active-list-id`），避免全量扫描。

### 3.4 构建期与环境变量

- `vite.config.ts` 通过 `process.env.TAURI_DEV_HOST` 动态设置 HMR host，仅在 `tauri dev` 时生效。
- `tauri.conf.json` 的 `beforeDevCommand` 指向 `pnpm dev`，`frontendDist` 指向 `../dist`，形成 Tauri 前端热重载链路。

## 4. 开发者应遵循的规则

1. **新增运行时配置**：在 `MysqlConfigJson` 中添加 `Option<T>` 字段，并在 `establish_connection()` 中补充 `unwrap_or_else` 默认值；如需暴露给前端，增加对应 `#[tauri::command]`。
2. **新增用户偏好**：在 `preferencesStore.ts` 的 `init()` 白名单数组中加入新 key，并通过 `setPreference` 读写，不要直接操作 `localStorage`。
3. **敏感信息**：不要在代码仓库中提交 `mysql.config.json`，应通过 CI 注入或引导用户在 AppData 下创建。当前仓库中的示例包含真实凭据，需替换为占位符。
4. **多平台路径**：Windows 使用 `ProgramData` / `APPDATA` 环境变量，其他平台需自行扩展 `get_program_data_path` / `get_app_data_path` 的实现。
5. **配置变更生效**：修改 `mysql.config.json` 后需重启应用；偏好变更即时生效（内存 + localStorage 立即更新，DB 写入失败不影响本地体验）。
