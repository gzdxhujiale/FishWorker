---
kind: error_handling
name: 错误处理策略：Rust Result + String 与前端 try/catch 混合模式
category: error_handling
scope:
    - '**'
source_files:
    - src-tauri/src/lib.rs
    - src-tauri/src/db.rs
    - src-tauri/src/time_management.rs
    - src-tauri/src/list.rs
    - src/components/tiptap-node/image-upload-node.tsx
---

## 系统概述

FishWorker 采用前后端分离的错误处理架构：后端 Rust/Tauri 使用 `Result<T, String>` 统一返回错误，前端 React/TypeScript 通过 Tauri IPC 调用并依赖 Promise 的 reject 机制。整个代码库没有定义统一的错误类型、错误码体系或全局错误中间件。

## 后端（Rust/Tauri）

### 核心约定
- 所有 `#[tauri::command]` 函数统一返回 `Result<T, String>`，错误信息直接以字符串形式传播到前端
- 数据库操作通过 `.map_err(|e| e.to_string())?` 将 sqlx 错误转为字符串
- 文件 I/O 使用 `.map_err(|e| e.to_string())` 包装错误
- 配置读取失败时静默降级（如 `unwrap_or_else` 提供默认值），而非报错

### 关键实现位置
- `src-tauri/src/lib.rs`：Tauri 应用入口，数据库连接建立失败时仅 `eprintln!` 打印日志，不中断启动
- `src-tauri/src/db.rs`：配置读取循环遍历多个路径，任一失败则继续尝试下一个
- `src-tauri/src/time_management.rs`、`list.rs`、`daily_review.rs`、`mission.rs`：所有业务命令遵循相同 `Result<T, String>` 模式

### 初始化阶段
- `lib.rs:104-113`：数据库连接失败仅记录日志，应用仍可运行（可能后续操作会失败）
- `db.rs:86-92`：表结构创建在后台任务中执行，失败仅 `eprintln!`

## 前端（React/TypeScript）

### 现有模式
- 仅在富文本编辑器组件中使用 `try/catch` 和 `throw new Error()`（如图片上传逻辑）
- 功能模块（features 目录下的 Service/Store）未发现显式错误处理代码，推测通过 Zustand store 或异步状态管理隐式处理

### 缺失部分
- 无全局错误边界（Error Boundary）
- 无统一的 API 请求拦截器
- 无用户友好的错误提示封装

## 设计决策与问题

1. 错误粒度粗糙：所有错误都扁平化为字符串，丢失了错误分类、可恢复性判断等语义信息
2. 缺少错误码：前端无法根据错误类型做差异化处理（如网络错误 vs 权限错误）
3. 未利用 Rust 错误枚举：`String` 作为错误类型放弃了编译期穷尽检查的优势
4. 初始化错误被吞掉：数据库连接失败不影响应用启动，但后续所有数据库操作都会失败

## 开发者应遵循的规则

1. 后端命令：继续使用 `Result<T, String>` 保持现状，但建议逐步引入自定义错误类型
2. 数据库操作：统一使用 `.map_err(|e| e.to_string())?` 模式
3. 配置文件读取：遵循静默降级策略，提供合理默认值
4. 前端调用：对 Tauri 命令调用添加 try/catch，并将错误信息展示给用户
5. 避免 panic!：当前代码库未使用 `panic!`，应保持此约定