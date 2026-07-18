---
kind: external_dependency
name: '@dnd-kit 拖拽排序'
slug: dnd-kit
category: external_dependency
category_hints:
    - framework_behavior
scope:
    - '**'
---

角色侧栏使用 @dnd-kit 实现可拖拽排序：DndContext 包裹 SortableContext，配合 verticalListSortingStrategy 和 arrayMove 完成顺序变更，并在 onDragEnd 回调中调用 store.reorderRoles 持久化新顺序。