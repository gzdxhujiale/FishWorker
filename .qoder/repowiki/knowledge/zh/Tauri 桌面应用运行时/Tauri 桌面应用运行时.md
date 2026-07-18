---
kind: external_dependency
name: Tauri 桌面应用运行时
slug: tauri
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

本项目基于 Tauri 构建桌面端，前端通过 `@tauri-apps/api` 的 `invoke` 调用 Rust 后端暴露的命令（如 `daily_review_load_all`、`daily_review_save`、`daily_review_delete`）来持久化每日复盘数据。前端仅负责 UI 与状态管理，所有数据库读写均经 Tauri invoke 通道进入后端。