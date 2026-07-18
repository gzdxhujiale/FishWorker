---
kind: error_handling
name: Rust/Tauri 命令式错误处理与前端静默吞错
category: error_handling
scope:
    - '**'
source_files:
    - src-tauri/src/lib.rs
    - src-tauri/src/db.rs
    - src-tauri/src/time_management.rs
    - src-tauri/src/list.rs
    - src-tauri/src/daily_review.rs
    - src/features/daily-review/dailyReviewService.ts
---

## 1. 采用的系统/方法
- Rust 后端：所有 `#[tauri::command]` 函数统一返回 `Result<T, String>`，通过 `.map_err(|e| e.to_string())?` 将底层错误（sqlx、文件系统、序列化等）转换为字符串错误码。
- Tauri 启动期：在 `lib.rs` 的 `.setup()` 中用 `match` 显式处理数据库连接失败，仅 `eprintln!` 打印日志后继续运行；`.run(...).expect("error while running tauri application")` 在应用启动阶段直接 panic。
- 无自定义错误类型、无 `thiserror`/`anyhow`、无全局 panic/recover 中间件，错误以字符串形式透传到前端。
- 前端：每个 Service 层使用 `try/catch` 包裹 `invoke` 调用，`console.error` 记录后重新抛出，由上层 store 或组件自行决定 UI 反馈。未发现统一的错误拦截器或 toast 提示封装。

## 2. 关键文件与包
- `src-tauri/src/lib.rs` — Tauri 入口、命令注册、启动期错误处理
- `src-tauri/src/db.rs` — 配置读取、MySQL 连接池建立、偏好设置读写
- `src-tauri/src/time_management.rs` — 时间管理领域命令（角色/任务 CRUD）
- `src-tauri/src/list.rs` — 清单领域命令（文件夹/列表/笔记/分组/模板 CRUD + 迁移）
- `src-tauri/src/daily_review.rs` — 每日复盘领域命令
- `src/features/daily-review/dailyReviewService.ts` — 前端 Service 层示例（try/catch + console.error + rethrow）

## 3. 架构与约定
- 错误边界位于 Tauri 命令层：每个命令独立捕获并转换错误为 `String`，不存在跨模块的错误传播链。
- 事务性操作（如 `list_delete_folder`、`list_duplicate_list`、`list_reorder_*`）在单个命令内使用 `pool.begin()` / `commit()`，任何一步失败都会回滚整个事务，错误信息原样返回给前端。
- 软删除策略：删除操作通过设置 `deleted_at` 字段实现，而非真正移除数据，避免级联删除带来的复杂错误场景。
- 前端未定义统一错误类型，Service 层仅负责日志记录与异常冒泡，UI 层需自行判断是否展示用户可见的错误消息。

## 4. 开发者应遵循的规则
- 新增 Tauri 命令必须返回 `Result<T, String>`，对可能失败的 I/O 和 SQL 操作使用 `.map_err(|e| e.to_string())?` 统一包装。
- 涉及多步写操作的命令应使用事务（`pool.begin()`），确保原子性并在任意步骤失败时自动回滚。
- 前端 Service 层应对 `invoke` 调用包裹 `try/catch`，至少记录 `console.error` 后再抛出，以便上层能区分网络/后端错误与业务逻辑错误。
- 不要在命令层 `panic!` 或 `unwrap()` 用户可控输入，所有可恢复错误都应通过 `Result` 返回。
- 如需向用户展示友好错误信息，应在前端根据 `String` 错误内容做映射，或在后续迭代中引入结构化错误类型替代纯字符串。