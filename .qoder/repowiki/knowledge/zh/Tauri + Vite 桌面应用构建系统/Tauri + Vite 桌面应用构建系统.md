---
kind: build_system
name: Tauri + Vite 桌面应用构建系统
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - vite.config.ts
    - tsconfig.json
    - vitest.config.ts
    - src-tauri/Cargo.toml
    - src-tauri/tauri.conf.json
    - src-tauri/build.rs
---

## 构建体系概览

本项目采用 **Tauri v2 + React + Vite + Rust** 的混合栈，前端使用 Vite 7 进行开发与打包，Rust 后端通过 Tauri CLI 与前端工程集成，最终打包为跨平台桌面应用。

### 核心工具链

- **包管理器**: pnpm（根级 `pnpm-workspace.yaml`，但当前为单包）
- **前端构建**: Vite 7 + `@vitejs/plugin-react`，输出到 `dist/`
- **类型检查**: TypeScript 5.8，`tsc -b` 联合编译（含 `tsconfig.node.json`）
- **测试**: Vitest 4，jsdom 环境，匹配 `src/**/*.test.{ts,tsx}`
- **桌面打包**: Tauri CLI (`@tauri-apps/cli`)，调用 `cargo build` 生成原生二进制
- **样式预处理**: sass-embedded（SCSS）

### 关键文件与职责

| 文件 | 作用 |
|------|------|
| `package.json` | 定义 npm scripts：`dev`、`build`、`tauri:dev`、`tauri:build`、`test` |
| `vite.config.ts` | Vite 配置：固定端口 1420、HMR 主机、忽略 `src-tauri` 监听、quill 别名重定向 |
| `tsconfig.json` | 严格模式 + bundler 解析 + quill 路径映射 |
| `vitest.config.ts` | 测试环境 jsdom + 全局关闭 |
| `src-tauri/Cargo.toml` | Rust 依赖：sqlx(MySQL)、tokio、chrono、rfd 等 |
| `src-tauri/tauri.conf.json` | Tauri 应用元信息、窗口尺寸、bundle targets=all、图标集 |
| `src-tauri/build.rs` | 调用 `tauri_build::build()` 生成 schema |

### 构建流程

```
pnpm tauri:dev → Tauri dev server (port 1420)
  ├─ beforeDevCommand: pnpm dev (Vite HMR)
  └─ 监听 src-tauri/** 外的变更

pnpm tauri:build → 完整打包
  ├─ beforeBuildCommand: pnpm build (tsc -b && vite build)
  ├─ cargo build (Rust 后端)
  └─ bundle targets=all (Windows/macOS/Linux 全平台)
```

### 特殊处理

- **quill 兼容层**: 通过 `scripts/npm-stubs/quill/` 提供空实现，配合 Vite alias 和 tsconfig paths 将 `quill/*` 重定向到本地 `src/*`，解决第三方库依赖问题
- **端口锁定**: Vite 使用 `strictPort: true` 确保 Tauri 能稳定连接 HMR
- **开发时忽略 Rust 源**: `watch.ignored` 排除 `src-tauri/**`，避免不必要的重新加载

### 约定与约束

- 版本号在 `package.json` 与 `src-tauri/Cargo.toml`、`tauri.conf.json` 中需保持一致（当前均为 `0.1.0`）
- 前端产物必须输出到 `../dist`（由 `tauri.conf.json` 的 `frontendDist` 指定）
- 未找到 CI/CD 流水线（无 `.github/workflows`）、Dockerfile、Makefile 或发布脚本
- 未配置代码签名、增量构建或缓存策略