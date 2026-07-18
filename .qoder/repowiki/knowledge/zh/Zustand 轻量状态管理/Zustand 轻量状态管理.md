---
kind: external_dependency
name: Zustand 轻量状态管理
slug: zustand
category: external_dependency
category_hints:
    - framework_behavior
scope:
    - '**'
---

项目统一使用 Zustand create 模式管理各 feature 的状态：MissionStore 维护角色/目标/使命宣言等结构化数据，DailyReviewStore 管理每日复盘列表及复利统计。两个 store 均通过 hooks 订阅局部 state 并触发持久化或同步。