# AI Coding & Vibecoding 最佳实践与方法论

基于 FishWorker 项目的实践文档沉淀，本方法论旨在指导如何通过“自然语言编写的高质量文档”驱动 AI 进行高效、可控的前端/桌面端应用开发（Vibecoding）。

## 1. AI 原生需求文档 (AI-Native PRD) 规范

传统的 PRD 主要面向人类开发者和测试，而 AI 原生 PRD 需要兼顾宏观的业务上下文和微观的技术约束。从 FishWorker 的多份 PRD 中可以提取出以下标准化结构：

### 1.1 核心结构

- **概述与理念 (Overview & Concepts)**：向 AI 解释**“为什么”**要做这个功能。例如在“四象限工作台”中强调了“艾森豪威尔法则”，让 AI 理解功能的业务意图，从而在生成 UI 色调（如 Q1 红色，Q2 绿色）时符合预期心理暗示。
- **解决方案边界 (Scope)**：
  - **In Scope (包含)**：明确列出需要 AI 生成的具体功能点（如 2x2 矩阵、拖拽流转）。
  - **Out of Scope (不包含)**：极其重要，防止 AI 产生幻觉或过度设计（例如明确提出“本次不改变已有 UI 设计”）。
- **用户故事与验收标准 (User Stories & AC)**：以 `[ ]` Checkbox 形式列出严格的交互验收标准，作为 AI 编写测试用例或自我审查的 Check-list。
- **技术规格与约束 (Tech Specs)**：在 PRD 尾部直接注入架构级约束（如：使用 Zustand hook、指定某个核心方法的签名）。

## 2. “接口与规范先行”开发流 (Interface-Driven Development)

AI 在局部代码生成能力极强，但在全局工程架构规划上容易妥协。因此，**必须由人类（或架构级 PRD）先行锁定接口契约**。

- **全局布局锁定**：如 `Frontend_Interfaces.md` 中严格规定了工具栏的 `ToolConfig` 接口和布局容器（左中右、上下分栏）。有了这个“插槽”规范，后续让 AI 增加任何新页面，只需要一句“遵循 ToolConfig 规范增加一个模块”。
- **数据模型演进**：在迭代版本（如 `time_management_prd_v1.1.md`）中，显式声明 `Task` 数据模型的新增字段（`description`, `deadline`），确保 AI 在修改组件时前后端数据结构一致。

## 3. 应对 AI 代码技术债的“重构型 PRD”

Vibecoding 的初期，为了快速实现功能，AI 往往倾向于使用最原始或最简单的技术方案（例如 FishWorker 初期大量使用了 `window.dispatchEvent` 和手动 `refreshData()`），这在应用复杂后会导致严重的性能瓶颈和状态混乱。

- **专门设立重构节点**：不要在开发新功能的同时要求 AI 重构。应该像 `Zustand_Migration_PRD.md` 一样，发布专门的“重构 PRD”。
- **指令明确，限定范围**：在重构 PRD 中，明确要求“仅替换底层状态管理机制为 Zustand，不允许更改任何现有交互逻辑”。这能极大程度保证重构的成功率。

## 4. Vibecoding 交互与 UI 控制论

如何让 AI 写出具有“设计感”的 UI？

- **提供意象和情感词**：在文档中使用“沉浸式”、“极简无把手”、“边缘单线分隔”、“视觉弱化”等词汇，引导 AI 使用更加现代化的 CSS 处理方式，而非生硬的原生边框。
- **组件拆分指引**：在文档的“前端核心组件列表”中，提前为 AI 划定好组件的文件名和职责边界（如 `DailyQuadrants.tsx`, `QuickAddPopover.tsx`），避免 AI 把几千行代码堆砌在一个文件中。

## 5. 总结流程模板

1. **定义基建 (Foundation)**：编写 `Interfaces.md`，锁定路由、布局和全局状态规范。
2. **场景 PRD (Feature PRD)**：按功能拆分独立 Markdown，包含业务意图、AC 列表和 UI 约束。
3. **隔离开发 (Isolated Gen)**：让 AI 根据单个 PRD 生成独立的组件，然后通过基建定义的接口挂载。
4. **技术债清理 (Refactor PRD)**：每经历 3-4 个业务迭代，输出一份纯技术维度的重构 PRD 进行代码治理。