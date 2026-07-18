---
kind: dependency_management
name: 多语言依赖管理：pnpm + Cargo 双栈与本地 stub 覆盖策略
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - pnpm-lock.yaml
    - pnpm-workspace.yaml
    - src-tauri/Cargo.toml
    - src-tauri/Cargo.lock
    - scripts/npm-stubs/quill/package.json
    - scripts/npm-stubs/quill/index.js
    - tsconfig.json
---

本仓库为 Tauri v2 桌面应用，同时包含 React 前端（TypeScript/Vite）与 Rust 后端，采用两套独立的包管理器进行依赖声明与锁定。

## 1. 前端依赖管理（pnpm）
- **包管理器**：使用 pnpm，根目录存在 `pnpm-lock.yaml` 锁文件，确保安装可重现。
- **工作区配置**：`pnpm-workspace.yaml` 仅通过 `allowBuilds` 放行 `@parcel/watcher` 与 `esbuild` 两个原生构建包，未启用多子包 workspace，当前为单包结构。
- **版本范围**：所有运行时依赖在 `package.json` 的 `dependencies` 中以 `^` 主版本范围声明（如 `react: ^19.1.0`、`@tiptap/react: ^3.27.4`），开发依赖集中在 `devDependencies`（Vite、TypeScript、Tauri CLI、Vitest 等）。
- **私有/本地包覆盖**：针对第三方库 `simple-mind-map` 内部强依赖的 `quill`，仓库通过三层机制将其替换为本地 stub：
  - `package.json` 中 `dependencies.quill = file:./scripts/npm-stubs/quill` 直接引入；
  - `pnpm.overrides.simple-mind-map>quill` 将子依赖也重定向到同一 stub；
  - `overrides.quill = link:./scripts/npm-stubs/quill` 兼容其他解析器；
  - `tsconfig.json` 中 `paths.quill` 指向 `scripts/npm-stubs/quill/index.js`，使 TypeScript 编译期也能解析。
  - Stub 包位于 `scripts/npm-stubs/quill/package.json`，仅暴露空实现，用于满足类型/模块加载而不引入真实 quill。
- **构建脚本**：`scripts` 提供 `tauri:dev` / `tauri:build` 等命令，由 `@tauri-apps/cli` 驱动，与 Vite 集成。

## 2. 后端依赖管理（Cargo）
- **包清单**：`src-tauri/Cargo.toml` 声明所有 Rust crate 依赖，包括 `tauri v2`、`sqlx v0.7`（MySQL）、`tokio`、`chrono`、`uuid`、`rfd` 等。
- **特性开关**：通过 `[features]` 与 target-specific 条件编译控制平台能力（如 `tauri-plugin-window-state` 仅在非移动端目标启用）。
- **锁文件**：`src-tauri/Cargo.lock` 锁定具体版本，保证跨机器一致构建。

## 3. 架构约定与约束
- 前后端依赖完全解耦，各自维护独立 lock 文件，无共享包。
- 对不兼容或不可用上游包的修补采用「本地 stub + overrides」模式，避免 fork 整个上游仓库。
- 未配置私有 npm registry 或 Cargo registry mirror，默认使用官方源。
- 未使用 vendoring（无 `vendor/` 目录），依赖均从远程注册表拉取后缓存于 pnpm store / Cargo registry cache。

## 4. 开发者应遵循的规则
- 新增前端依赖时统一写入 `package.json` 对应字段，并让 pnpm 生成更新后的 `pnpm-lock.yaml`。
- 需要替换第三方依赖行为时，优先在 `scripts/npm-stubs/` 下创建 stub 并通过 `pnpm.overrides` 与 `tsconfig.paths` 双重映射，而非修改 node_modules。
- 新增 Rust crate 时在 `src-tauri/Cargo.toml` 声明，必要时添加 `features` 与 target 条件，提交前运行 `cargo build` 以更新 `Cargo.lock`。
- 不要手动编辑 lock 文件；如需升级，使用 `pnpm up` / `cargo update` 并由 CI 校验一致性。