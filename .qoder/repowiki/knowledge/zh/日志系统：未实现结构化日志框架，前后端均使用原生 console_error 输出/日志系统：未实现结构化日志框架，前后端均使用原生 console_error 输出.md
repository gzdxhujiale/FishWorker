---
kind: logging_system
name: 日志系统：未实现结构化日志框架，前后端均使用原生 console/error 输出
category: logging_system
scope:
    - '**'
source_files:
    - src-tauri/src/lib.rs
    - src/features/daily-review/dailyReviewService.ts
    - src/features/daily-review/dailyReviewStore.ts
---

经对仓库全量扫描，FishWorker 项目未引入任何日志框架或结构化日志方案。前后端均采用最基础的原始输出方式，不存在统一的日志级别、结构化字段、日志路由或持久化机制。

- Rust/Tauri 后端（src-tauri）：未依赖 log、tracing、sentry、fern 等任何日志 crate；仅在数据库连接失败时使用 eprintln! 打印错误信息（lib.rs:110），其余命令层无任何日志埋点。
- React 前端（src）：未发现 pino、winston、bunyan、morgan 等浏览器日志库；业务代码中零星出现 console.error / console.log 调用（如 dailyReviewService.ts、dailyReviewStore.ts、image-upload-node.tsx、simple-editor.tsx 等），主要用于调试与异常捕获，无统一封装、无日志级别、无上下文字段。
- 构建/运行期：package.json 与 Cargo.toml 均未声明日志相关依赖；Vite/Tauri 配置也未注入日志中间件。

结论：该项目当前处于零日志体系状态，所有可观测性输出均为裸 console.* / eprintln!，不具备生产环境所需的结构化、分级、可聚合能力。若需完善，建议在后端引入 tracing + tracing-subscriber，在前端引入 pino 或自定义 logger 模块以统一格式与级别。