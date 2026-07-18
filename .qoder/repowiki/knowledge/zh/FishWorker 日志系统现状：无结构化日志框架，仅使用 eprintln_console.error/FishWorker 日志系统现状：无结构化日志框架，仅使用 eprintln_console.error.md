---
kind: logging_system
name: FishWorker 日志系统现状：无结构化日志框架，仅使用 eprintln/console.error
category: logging_system
scope:
    - '**'
source_files:
    - src-tauri/Cargo.toml
    - src-tauri/src/main.rs
    - src-tauri/src/lib.rs
    - src-tauri/src/db.rs
---

## 现状概述

FishWorker 工程当前**未引入任何专门的日志框架或日志子系统**。Rust 后端与前端均直接依赖运行时标准输出/控制台 API 进行错误输出，不存在统一的日志级别、结构化字段、日志轮转或集中收集机制。

## Rust 后端（src-tauri）

- **依赖情况**：`Cargo.toml` 中未声明 `log`、`tracing`、`slog`、`env_logger`、`fern` 等任何日志 crate。所有依赖集中在 Tauri、SQLx、Tokio、serde、chrono、uuid、rfd 上。
- **实际用法**：全仓仅有两处 `eprintln!` 调用：
  - `src/lib.rs:109` — 数据库连接失败时打印到 stderr：`eprintln!("Failed to connect to MySQL database: {}", e);`
  - `src/db.rs:89` — 后台建表任务异常时打印：`eprintln!("Failed to ensure tables in background: {}", e);`
- **启动入口**：`main.rs` 仅通过 `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` 抑制 Windows release 下的控制台窗口，随后转发到 `fishworker_lib::run()`，无任何日志初始化逻辑。
- **架构影响**：Tauri v2 的 `Builder` 链中未注册任何日志插件（如 `tauri-plugin-log`），stderr 输出在 release 模式下被静默丢弃，导致生产环境无法捕获这些错误。

## 前端（src）

- **实际用法**：各 feature 模块中的 Service/Store 层直接使用浏览器 `console.error` / `console.log` 输出错误信息，例如：
  - `features/daily-review/dailyReviewService.ts`：`console.error("Failed to load daily reviews from DB:", e);`
  - `features/lists/listsService.ts`：`console.error('[listsService] load_all failed:', e);`
  - `components/tiptap-ui/*.ts`：大量 `console.log` 用于调试提示（多为注释示例代码）。
- **无统一封装**：未发现任何全局 logger 工具函数、日志等级配置或错误上报通道。

## 结论与建议

当前仓库对 logging_system 这一横切关注点处于**完全缺失状态**——既没有 Rust 侧的日志 crate 集成，也没有前端侧的日志抽象层，更没有跨前后端的统一日志策略。若需完善，建议：
1. Rust 端引入 `tracing` + `tracing-subscriber`（或 `env_logger`），并通过 `tauri-plugin-log` 将日志桥接到前端 DevTools；
2. 前端建立轻量 logger 模块，统一 `console.*` 调用并支持日志级别过滤；
3. 定义统一的日志字段规范（timestamp、module、level、message、correlation_id 等）。