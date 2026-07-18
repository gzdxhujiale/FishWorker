---
kind: configuration_system
name: Tauri+Vite 多源配置加载与用户偏好持久化系统
category: configuration_system
scope:
    - '**'
source_files:
    - src-tauri/tauri.conf.json
    - src-tauri/mysql.config.json
    - src-tauri/src/db.rs
    - src-tauri/src/lib.rs
    - vite.config.ts
    - package.json
---

FishWorker 采用 Tauri v2 + Vite 的桌面应用架构，配置系统由三层组成：构建期配置、运行时数据库连接配置、以及用户级偏好设置。

## 1. 构建期与打包配置
- `src-tauri/tauri.conf.json`：Tauri v2 核心配置，声明应用元信息（productName、identifier）、窗口尺寸、安全策略、前端资源路径（`../dist`）以及打包目标。通过 `$schema` 引用官方 JSON Schema，IDE 可获得自动补全。
- `vite.config.ts`：Vite 开发服务器固定监听 `1420` 端口，HMR 通过 `TAURI_DEV_HOST` 环境变量注入；同时配置了 `quill` 包的别名重定向到本地 stub。
- `package.json`：定义 `tauri:dev` / `tauri:build` 脚本，作为统一入口调用 Tauri CLI，再由 Tauri 反向驱动 Vite 构建。

## 2. 运行时数据库连接配置（多源优先级加载）
`src-tauri/src/db.rs` 实现了完整的 `mysql.config.json` 多路径回退加载器，按以下顺序查找并读取第一个有效文件：
1. Cargo 清单目录下的 `mysql.config.json`（开发时）
2. 当前工作目录 `src-tauri/mysql.config.json`
3. 当前工作目录根 `mysql.config.json`
4. 可执行文件同级目录 `mysql.config.json`（安装后）
5. Windows ProgramData 下 `AIstudyPublicData/config/mysql.config.json`（全局共享）
6. Windows ProgramData 下 `AIstudyUserData/mysql.config.json`（用户级）
7. Windows AppData/Roaming 下 `AIstudy/mysql.config.json`（默认写入位置）
每个字段均为 `Option<T>`，若所有路径均不存在或解析失败则返回空结构体，并在建立连接时使用硬编码的 TiDB Cloud 默认值。`skipSchemaCreation` 字段控制是否在后台协程中自动执行建表。

## 3. 用户偏好设置（数据库持久化）
除配置文件外，应用还通过 `app_preferences` 表以 key-value 形式存储用户偏好：
- `db_get_preference(key)` / `db_set_preference(key, value)` 两个 Tauri 命令暴露给前端
- 使用 `INSERT ... ON DUPLICATE KEY UPDATE` 实现幂等写入

## 4. 前端侧配置访问
前端通过 `@tauri-apps/api` 调用 Rust 侧命令获取和保存配置，未使用 `.env` 文件或 `import.meta.env`，所有运行时配置均由后端集中管理。

## 开发者约定
- 新增数据库连接参数应在 `MysqlConfigJson` 结构体中添加 `Option<T>` 字段，并在 `establish_connection` 中提供默认值。
- 新增用户偏好键应遵循 `snake_case` 命名，并通过 `db_get_preference` / `db_set_preference` 存取，避免直接操作数据库表。
- 敏感信息（host、user、password）不应硬编码在源码中，应放入上述第 5-7 条路径之一，推荐放在 AppData 下以便随用户迁移。
- 不要在前端直接使用 `process.env` 或 `import.meta.env` 读取数据库凭据，所有连接细节必须经 Tauri 命令层中转。