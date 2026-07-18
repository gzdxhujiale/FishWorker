---
kind: dependency_management
name: pnpm + Cargo 双栈依赖管理（含本地 stub 覆盖）
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
---

## 系统概览
FishWorker 采用「前端 pnpm monorepo + Rust/Cargo」双栈依赖管理：
- 前端使用 pnpm v9 lockfile，通过 `package.json` 声明依赖，`pnpm-lock.yaml` 锁定精确版本；未启用多 workspace 包，仅用 `pnpm-workspace.yaml` 允许特定原生构建器。
- 后端使用 Cargo，`src-tauri/Cargo.toml` 声明 crate 与 features，`Cargo.lock` 锁定所有子依赖及 checksum。
- 两个锁文件均提交至仓库，保证 CI/协作可复现安装。

## 关键文件与位置
- 前端清单与脚本：`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`
- 后端清单与锁：`src-tauri/Cargo.toml`、`src-tauri/Cargo.lock`
- 本地 npm stub 覆盖入口：`scripts/npm-stubs/quill/package.json`（被以 `file:` 引用）

## 架构与约定
1. **pnpm 作为唯一包管理器**
   - 根级 `package.json` 集中声明所有运行时与开发依赖，无子包 `package.json`，属于“单包 workspace”。
   - `pnpm-lock.yaml` 记录每个包的精确解析结果（包括 peer deps），并开启 `autoInstallPeers: true`，避免手动安装 peer。
   - `pnpm-workspace.yaml` 仅配置 `allowBuilds`，显式放行 `@parcel/watcher` 与 `esbuild` 的原生编译，防止 pnpm 默认拒绝 native addon 的构建失败。

2. **版本策略**
   - 核心库普遍使用 `^` 或 `~` 范围（如 `react ^19.1.0`、`typescript ~5.8.3`），在保持兼容性的同时允许小版本升级；Tiptap 生态内部各包统一对齐到 `3.27.4`，避免扩展与 core 不匹配。
   - Tauri 相关依赖使用主版本号范围（`@tauri-apps/* ^2`、`tauri-plugin-* "2"`），跟随 Tauri v2 大版本演进。

3. **本地 stub 覆盖 quill**
   - 项目依赖 `simple-mind-map`，其间接依赖了 `quill`。为规避 quill 的复杂构建/类型问题，项目在 `scripts/npm-stubs/quill` 下提供最小 `index.js` + `package.json` 作为“空实现”。
   - 通过三种方式强制生效：
     - `devDependencies.quill = "file:./scripts/npm-stubs/quill"`（直接依赖）
     - `pnpm.overrides.simple-mind-map>quill = "file:..."`（按路径覆盖子依赖）
     - `overrides.quill = "link:..."`（兼容其他工具链）
   - 该模式确保无论谁拉取代码，quill 都会被替换为本地 stub，消除环境差异。

4. **Rust 侧依赖治理**
   - `Cargo.toml` 中仅声明顶层 crate，具体版本由 `Cargo.lock` 锁定；数据库层通过 sqlx 的 `mysql` + `runtime-tokio-rustls` feature 组合选择 MySQL 驱动与 TLS 运行时。
   - 使用 `cfg(not(...))` 条件依赖仅在桌面平台引入 `tauri-plugin-window-state`，避免移动端不必要的二进制体积。

## 开发者应遵循的规则
- **新增依赖**：优先在 `package.json` 的 `dependencies` 中添加，不要手写 `pnpm-lock.yaml`；修改后运行 `pnpm install` 生成一致锁文件。
- **版本范围**：生产依赖尽量使用 `^` 保持小版本自动升级，对编译器/类型等强约束工具使用 `~`（如 typescript）；跨包协同的套件（如 Tiptap 系列）需统一主版本。
- **覆盖第三方行为**：如需替换某依赖的实现，优先使用 `pnpm.overrides` 指定精确路径，并在 PR 中说明原因（参考现有 quill stub 做法）。
- **原生构建**：若新依赖包含 native addon，需在 `pnpm-workspace.yaml` 的 `allowBuilds` 中显式放行对应包名，否则安装会失败。
- **Rust 依赖**：只改 `Cargo.toml`，让 `cargo update` 更新 `Cargo.lock`；新增 platform-specific 依赖时使用 `cfg(target_os = ...)` 条件段，避免污染全平台构建。
- **私有源/代理**：当前仓库未发现 `.npmrc` / `.pnp*` / `Cargo.config.toml` 等私有注册表配置，如有需要应在根目录添加相应配置文件并提交，确保团队共享。