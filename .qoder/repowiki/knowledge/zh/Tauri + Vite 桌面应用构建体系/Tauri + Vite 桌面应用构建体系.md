---
kind: build_system
name: Tauri + Vite 桌面应用构建体系
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - vite.config.ts
    - src-tauri/Cargo.toml
    - src-tauri/tauri.conf.json
    - src-tauri/build.rs
    - vitest.config.ts
    - pnpm-workspace.yaml
---

## 构建系统概览
FishWorker 采用 **Tauri v2 + Vite + React** 的混合栈，通过 Tauri CLI 统一编排前端（Vite/TypeScript）与后端（Rust/Cargo）的编译、打包与发布流程。

## 核心工具链
- **包管理**: pnpm（启用 workspace，仅允许 `@parcel/watcher` 和 `esbuild` 执行原生构建）
- **前端构建**: Vite 7 + TypeScript（`tsc -b` 增量类型检查 → `vite build` 产物输出到 `dist/`）
- **测试**: Vitest 4，jsdom 环境，匹配 `src/**/*.test.{ts,tsx}`
- **桌面壳层**: Tauri v2，Cargo 静态库 + cdylib + rlib 三合一 crate
- **样式预处理**: sass-embedded（SCSS 文件由 Vite 直接处理）

## 关键配置文件
- `package.json`: 定义 `dev` / `build` / `tauri:dev` / `tauri:build` 等脚本入口；依赖版本集中在 devDependencies 中声明
- `vite.config.ts`: 针对 Tauri 开发优化——固定端口 1420、HMR 端口 1421、忽略 `src-tauri/**` 监听、别名 `quill/*` 重定向到本地 stub
- `src-tauri/Cargo.toml`: Rust crate 配置，暴露 `fishworker_lib` 静态库供 Tauri 链接；按 target cfg 条件引入 window-state 插件
- `src-tauri/tauri.conf.json`: 声明 `beforeDevCommand: pnpm dev`、`beforeBuildCommand: pnpm build`、`frontendDist: ../dist`，将前后端构建串联
- `src-tauri/build.rs`: 调用 `tauri_build::build()` 生成能力清单与 schema
- `vitest.config.ts`: 全局关闭 globals，限定测试文件路径
- `pnpm-workspace.yaml`: 白名单放行两个需要编译的原生包

## 构建流水线
```
开发者运行 pnpm tauri:dev
→ Tauri 触发 beforeDevCommand: pnpm dev
→ Vite 在 :1420 启动 HMR（忽略 src-tauri 变更）
→ Tauri 窗口加载 http://localhost:1420
→ 用户修改 .rs 代码时，cargo 重新编译并刷新前端
```

打包阶段：`pnpm tauri:build` → 先执行 `pnpm build` 产出 `dist/` → Cargo 编译 Rust 后端 → 使用 Tauri bundler 按 `bundle.targets = "all"` 为各平台生成安装包，图标取自 `src-tauri/icons/`。

## 约定与约束
- 版本号在 `package.json` 与 `src-tauri/Cargo.toml` 两处同步维护（当前均为 0.1.0），需保持一致
- 所有前端资源必须经 Vite 管线，禁止绕过 `dist/` 直接引用源码
- 第三方库如 `quill` 通过 `scripts/npm-stubs/quill` 以 file: 协议覆盖，避免引入完整实现
- 仅在非移动端目标上启用 window-state 插件（`cfg(not(any(target_os = "android", target_os = "ios")))`）