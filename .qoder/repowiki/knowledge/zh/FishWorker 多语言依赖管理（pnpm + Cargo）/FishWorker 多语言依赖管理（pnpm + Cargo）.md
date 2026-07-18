---
kind: dependency_management
name: FishWorker 多语言依赖管理（pnpm + Cargo）
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - pnpm-workspace.yaml
    - pnpm-lock.yaml
    - src-tauri/Cargo.toml
    - src-tauri/Cargo.lock
    - scripts/npm-stubs/quill/package.json
---

## 1. 使用的系统/方法
- **前端**：使用 **pnpm v9** 作为包管理器，通过 `package.json` 声明依赖，`pnpm-lock.yaml` 锁定版本。
- **Rust 后端**：使用 **Cargo** 管理 crate 依赖，通过 `src-tauri/Cargo.toml` 声明、`src-tauri/Cargo.lock` 锁定。
- **构建工具链**：Vite 7 + TypeScript 5.8 + Tauri v2 CLI，由 `package.json` scripts 统一编排。

## 2. 关键文件与位置
- 前端依赖清单与脚本：`package.json`
- pnpm 工作区配置：`pnpm-workspace.yaml`（仅允许特定原生包构建）
- pnpm 锁文件：`pnpm-lock.yaml`（lockfileVersion 9）
- Rust 依赖清单：`src-tauri/Cargo.toml`
- Rust 锁文件：`src-tauri/Cargo.lock`（自动生成，提交到仓库）
- 本地 npm stub 覆盖：`scripts/npm-stubs/quill/package.json`（被 `quill` 和 `simple-mind-map>quill` 同时 override）

## 3. 架构与约定
- **双仓单库**：前端与 Rust 后端同属一个 Git 仓库，各自维护独立的依赖清单与锁文件，互不共享 node_modules / target。
- **版本策略**：
  - 前端主要依赖使用 `^` 宽松前缀（如 `react ^19.1.0`、`@tauri-apps/api ^2`），由 pnpm-lock.yaml 固定实际安装版本；部分内部强耦合包（tiptap 系列）使用精确版本号避免横向不一致。
  - Rust 端对核心 crate 使用语义化范围（`tauri = "2"`、`sqlx = "0.7"`），并显式启用所需 features（如 `mysql`、`runtime-tokio-rustls`、`chrono`）。
- **平台条件依赖**：Rust 侧通过 `[target.'cfg(not(...))'.dependencies]` 仅在非移动平台引入 `tauri-plugin-window-state`。
- **私有/本地包覆盖**：通过 `pnpm.overrides` 与 `overrides` 将第三方 `quill` 替换为本地 `file:./scripts/npm-stubs/quill`，解决上游依赖冲突。
- **workspace 模式**：当前根级 workspace 未拆分子包，`pnpm-workspace.yaml` 仅用于白名单放行 `@parcel/watcher`、`esbuild` 的原生构建。

## 4. 开发者应遵循的规则
- **新增依赖**：
  - 前端：在 `package.json` 的 `dependencies`/`devDependencies` 中声明，运行 `pnpm install` 生成/更新 `pnpm-lock.yaml`，并提交锁文件。
  - Rust：在 `src-tauri/Cargo.toml` 添加 crate 及必要 `features`，运行 `cargo build` 生成/更新 `Cargo.lock`，并提交锁文件。
- **版本升级**：优先使用 `pnpm up` 与 `cargo update` 更新锁文件，再审查变更；对 tiptap 等强耦合套件建议整体升级以保持内部版本一致。
- **覆盖/补丁**：如需替换第三方包行为，沿用现有 `pnpm.overrides` + `overrides` + `scripts/npm-stubs/<pkg>` 的模式，并在 `package.json` 中同步声明。
- **平台差异**：Rust 新依赖若仅适用于桌面端，使用 `[target.'cfg(...)'.dependencies]` 条件段声明，避免跨平台编译失败。
- **禁止手动编辑锁文件**：`Cargo.lock` 与 `pnpm-lock.yaml` 均为自动生成，修改依赖后重新安装即可。