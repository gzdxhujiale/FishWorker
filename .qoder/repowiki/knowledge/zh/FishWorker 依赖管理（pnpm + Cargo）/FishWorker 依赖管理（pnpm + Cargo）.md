---
kind: dependency_management
name: FishWorker 依赖管理（pnpm + Cargo）
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - pnpm-lock.yaml
    - pnpm-workspace.yaml
    - src-tauri/Cargo.toml
    - src-tauri/Cargo.lock
---

## 1. 使用的系统与工具

- **前端/Node 层**：使用 pnpm 作为包管理器，通过 package.json 声明依赖，pnpm-lock.yaml 锁定版本。
- **Rust/Tauri 后端**：使用 Cargo 作为包管理器，通过 src-tauri/Cargo.toml 声明 crate 依赖，src-tauri/Cargo.lock 锁定版本。
- 两个子系统的依赖完全解耦，分别由各自的锁文件保证可重复构建。

## 2. 关键文件与位置

- 前端清单：package.json；前端锁文件：pnpm-lock.yaml
- Rust 清单：src-tauri/Cargo.toml；Rust 锁文件：src-tauri/Cargo.lock
- pnpm 工作区配置：pnpm-workspace.yaml（允许 @parcel/watcher、esbuild 在 CI 中构建）

## 3. 架构与约定

### 前端依赖策略
- 大多数依赖使用 ^ 前缀（如 react ^19.1.0、@tiptap/* ^3.27.4），少数关键包使用精确版本（如 @tiptap/suggestion 3.27.4、simple-mind-map 0.14.0-fix.3）。
- Tiptap 生态大量使用 core/react 及多个 extension，版本号严格对齐到 3.27.4，避免扩展间版本不匹配。
- 通过 pnpm.overrides 和 overrides 将 quill 替换为本地 scripts/npm-stubs/quill，同时覆盖 simple-mind-map>quill，解决第三方库兼容问题。
- 所有 @types/ 类型包放在 devDependencies 中，与运行时依赖分离。
- 构建工具链集中在 devDependencies：Vite 7 + TypeScript ~5.8.3 + Vitest 4 + sass-embedded。

### Rust/Tauri 依赖策略
- Tauri v2 插件体系：tauri-plugin-opener、tauri-plugin-window-state 以独立 crate 引入，并通过 cfg 目标段对桌面平台做条件编译。
- 数据库层：sqlx 0.7 配合 mysql feature 和 runtime-tokio-rustls 连接 MySQL；chrono 提供时间处理，uuid 生成唯一 ID。
- 异步运行时：tokio { version = "1", features = ["full"] } 作为整个后端异步运行时基础。
- 序列化：serde + serde_json 用于 JSON 编解码，配合 derive feature 简化代码。

### 锁文件与可重复性
- pnpm-lock.yaml 记录每个包的完整解析树（含 peer dependency 组合），确保不同机器安装结果一致。
- Cargo.lock 记录每个 crate 的 checksum，防止上游篡改。
- 两个锁文件均已提交至版本控制，CI 应基于锁文件安装而非重新生成。

## 4. 开发者应遵循的规则

1. 新增依赖时：运行依赖加入 dependencies，仅构建/测试用依赖加入 devDependencies；修改 package.json 后必须重新生成 pnpm-lock.yaml 并提交。
2. 处理冲突或补丁：需要覆盖第三方依赖时使用 pnpm.overrides（推荐）或 overrides，并添加注释说明原因；Rust 侧 patch 应在 Cargo.toml 中使用 [patch.crates-io] 段。
3. Tauri 插件更新：升级 tauri、tauri-plugin-* 时应保持主版本一致（当前均为 v2），避免 API 不兼容；平台特定依赖使用 cfg 目标段声明。
4. 锁文件维护：禁止手动编辑 pnpm-lock.yaml 或 Cargo.lock；定期执行 pnpm up --latest 或 cargo update 检查安全更新，但需回归测试后再提交。
5. 私有仓库/代理：当前未配置私有 npm registry 或 crates.io mirror，所有依赖均来自公共源。若后续引入企业内包，应在 .npmrc 或 ~/.cargo/config.toml 中集中配置。