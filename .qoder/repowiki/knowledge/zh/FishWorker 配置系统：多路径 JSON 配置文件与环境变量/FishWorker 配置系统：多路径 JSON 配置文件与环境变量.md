---
kind: configuration_system
name: FishWorker 配置系统：多路径 JSON 配置文件与环境变量
category: configuration_system
scope:
    - '**'
source_files:
    - src-tauri/tauri.conf.json
    - src-tauri/mysql.config.json
    - src-tauri/src/db.rs
    - src-tauri/src/lib.rs
    - vite.config.ts
---

## 1. 使用的系统与工具
- Tauri v2 作为桌面应用框架，通过 tauri.conf.json 声明式配置应用元信息、窗口与打包行为。
- Vite 作为前端构建与开发服务器，通过 vite.config.ts 与 TAURI_DEV_HOST 环境变量控制 dev server 行为。
- Rust + serde_json 在运行时按优先级顺序扫描多个文件系统路径加载 MySQL 连接配置（JSON），并通过 Tauri command 暴露读写能力给前端。
- MySQL (TiDB Cloud) 持久化用户偏好设置（key-value），通过 SQLx 访问。

## 2. 关键文件与包
- src-tauri/tauri.conf.json — Tauri 应用级配置（名称、版本、窗口尺寸、构建命令、bundle 图标等）
- src-tauri/mysql.config.json — 默认 MySQL 连接参数（host/port/user/password/database/skipSchemaCreation）
- src-tauri/src/db.rs — 配置读取/写入核心逻辑：多路径查找、默认值回退、数据库连接池建立、偏好存储 API
- src-tauri/src/lib.rs — Tauri 初始化入口，注册所有 Rust 命令并注入 MySqlPool 到应用状态
- vite.config.ts — Vite 配置，使用 process.env.TAURI_DEV_HOST 控制 HMR host
- src-tauri/Cargo.toml — Rust 依赖与特性开关（sqlx mysql、tauri-plugin-window-state 等）

## 3. 架构与设计约定
### 3.1 配置文件加载策略（多路径优先级）
db::read_config() 按以下顺序查找 mysql.config.json，返回第一个成功解析的配置对象：
1. Cargo manifest 目录下的 src-tauri/mysql.config.json
2. 当前工作目录的 src-tauri/mysql.config.json
3. 当前工作目录根 mysql.config.json
4. 可执行文件所在目录的 mysql.config.json
5. Windows ProgramData/AIstudyPublicData/config/mysql.config.json
6. Windows ProgramData/AIstudyUserData/mysql.config.json
7. Windows AppData/Roaming/AIstudy/mysql.config.json
任一字段缺失时回退到硬编码默认值（如 TiDB Cloud 地址）。

### 3.2 配置写入位置
仅允许写入第 7 个路径（%APPDATA%/AIstudy/mysql.config.json），由 db_save_config Tauri command 调用，确保用户配置位于可写的应用数据目录。

### 3.3 运行时偏好存储
除 JSON 文件外，应用还通过 app_preferences 表以 key-value 形式持久化用户偏好，提供 db_get_preference / db_set_preference 两个 Tauri command。

### 3.4 前端配置来源
前端未使用 .env 或 import.meta.env，所有运行时配置均通过 Tauri command 从后端获取，保持前后端配置源统一。

## 4. 开发者应遵循的规则
- 新增配置项：在 MysqlConfigJson 结构体中添加可选字段，并在 establish_connection 中补充默认值回退逻辑；如需持久化到数据库，同步实现对应的 preference getter/setter。
- 配置路径扩展：仅在 read_config 的 paths 向量中追加新路径，不要改变既有顺序；写入路径固定为 %APPDATA%/AIstudy/mysql.config.json。
- 敏感信息：避免将密码等敏感信息提交到仓库；生产环境应通过 CI 注入或引导程序生成 mysql.config.json。
- Tauri 配置变更：修改 tauri.conf.json 后需重新运行 tauri build/dev 生效；窗口安全策略（csp）应保持 null 或显式配置。
- Vite 环境变量：仅使用 TAURI_DEV_HOST 控制 HMR host，不要在业务代码中直接引用 import.meta.env。