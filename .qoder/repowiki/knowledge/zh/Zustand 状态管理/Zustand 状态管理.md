---
kind: external_dependency
name: Zustand 状态管理
slug: zustand
category: external_dependency
category_hints:
    - framework_behavior
scope:
    - '**'
---

项目使用 Zustand v5 作为前端状态管理库，配合 createSyncEngine.ts 实现与 Tauri 后端的同步机制。各 feature 模块（daily-review、habits、lists、settings、time-management、tiptap）均通过 Zustand store 管理本地状态。