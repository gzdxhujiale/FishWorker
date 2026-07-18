---
kind: configuration_system
name: FishWorker 配置系统：Tauri 应用配置与用户偏好管理
category: configuration_system
scope:
    - '**'
source_files:
    - src-tauri/src/db.rs
    - src-tauri/tauri.conf.json
    - src-tauri/Cargo.toml
    - src-tauri/mysql.config.json
---

## 配置系统概述

FishWorker 采用分层配置策略，将构建期配置、运行时数据库连接配置和用户运行时偏好分离管理。

### 1. 构建期配置（开发/打包）
- Tauri 应用配置：src-tauri/tauri.conf.json — 定义产品名称、版本、窗口尺寸、安全策略、前端资源路径等 Tauri v2 元数据
- Cargo 依赖配置：src-tauri/Cargo.toml — Rust 后端依赖声明，包含 sqlx、tokio、chrono 等核心库
- Vite 构建配置：根目录 vite.config.js / vite.config.ts 控制前端构建流程

### 2. 数据库连接配置（核心配置层）
位于 src-tauri/src/db.rs 的 read_config() 函数实现了多级回退加载策略，按优先级依次查找 mysql.config.json：
1. Cargo manifest 目录下的配置文件
2. 当前工作目录的 src-tauri/mysql.config.json
3. 当前工作目录根级的 mysql.config.json
4. 可执行文件同目录下的配置文件
5. Windows ProgramData 下的 AIstudyPublicData/config/mysql.config.json
6. Windows ProgramData 下的 AIstudyUserData/mysql.config.json
7. Windows AppData 下的 AIstudy/mysql.config.json（写入目标位置）

配置结构体 MysqlConfigJson 支持字段：host、port、user、password、database、skipSchemaCreation，所有字段均为可选并带默认值。

### 3. 用户运行时偏好存储
通过 Tauri 命令暴露的 db_get_preference / db_set_preference 接口，将用户偏好持久化到 MySQL 的 app_preferences 表中，使用 key-value 形式存储。

### 4. 架构约定
- 配置读取：仅在启动时调用 establish_connection() 加载一次，后续复用连接池
- 配置写入：仅允许写入 AppData 目录，避免覆盖开发环境配置
- 安全策略：数据库密码通过环境变量或配置文件注入，不硬编码在源码中
- 向后兼容：新增配置字段使用 Option<T> 类型，保持旧配置文件的兼容性

### 开发者注意事项
- 生产部署时应将敏感配置放在第 5-7 级回退路径中
- 修改 MysqlConfigJson 结构体时需考虑向后兼容性
- 用户偏好应通过 Tauri 命令访问，禁止直接读写文件系统