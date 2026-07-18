# 个人使命宣言（人生罗盘）功能设计

## 概述

基于《高效能人士的七个习惯》中"撰写个人使命宣言，定义角色与目标"的理念，在 FishWorker 桌面应用中新增一个独立功能模块"人生罗盘"。用户可以书写个人使命宣言，定义人生角色，并为每个角色设定带状态和时间维度的长期目标。

## 模块定位

- **独立模块**：在左侧 Toolbar 中拥有专属 tab，与清单、习惯、周计划等功能同级
- **一期范围**：仅实现书写和回顾功能，不与其他模块（每日复盘、周计划等）联动
- **命名**：人生罗盘，图标使用 `Navigation`（lucide-react）

## 布局设计

采用经典三栏布局（方案 A）：

```
┌─────────────────────────────────────────────┐
│  📜 个人使命宣言                    ▼ 折叠   │
│  ┌─────────────────────────────────────────┐ │
│  │  Tiptap 富文本编辑器                     │ │
│  │  (加粗/斜体/列表/引用等格式支持)          │ │
│  └─────────────────────────────────────────┘ │
├──────────────┬──────────────────────────────┤
│  角色         │  👨‍👩‍👧 家庭成员        + 添加目标 │
│  + 添加      │                              │
│ ─────────── │ ┌──────────────────────────┐ │
│ ▶ 家庭成员(3) │ │ 每周至少一次家庭活动      │ │
│   职业发展(2) │ │ 状态: 进行中  2026年度   │ │
│   个人成长(4) │ └──────────────────────────┘ │
│   社会贡献(1) │ ┌──────────────────────────┐ │
│              │ │ 每天陪伴孩子阅读 30 分钟   │ │
│              │ │ 状态: 未开始  2026 Q3      │ │
│              │ └──────────────────────────┘ │
│              │ ┌──────────────────────────┐ │
│              │ │ 每年一次全家旅行          │ │
│              │ │ 状态: 已完成  长期·持续    │ │
│              │ └──────────────────────────┘ │
└──────────────┴──────────────────────────────┘
```

### 布局规则

- **顶部区域**：使命宣言 Tiptap 编辑器，支持折叠/展开。折叠后仅显示标题栏，编辑器区域隐藏
- **左下侧边栏**：角色列表，宽度 220px，支持增删、拖拽排序，选中项高亮（左侧蓝色边框）
- **右下详情区**：当前选中角色的目标列表，每个目标以卡片形式展示，包含状态标签和时间范围

## 数据模型

### MissionStatement（使命宣言）

```typescript
interface MissionStatement {
  id: string;
  content: string;        // Tiptap JSON 或 HTML
  updated_at: string;
}
```

- 全局仅一条记录（一个人只有一份使命宣言）
- upsert 语义：id 固定为 `"default"`，首次保存时 INSERT，后续 UPDATE

### Role（角色）

```typescript
interface Role {
  id: string;
  name: string;           // 如 "家庭成员"、"职业发展"
  icon: string;           // emoji 字符串
  sort_order: number;     // 拖拽排序权重
  created_at: string;
  updated_at: string;
}
```

### Goal（目标）

```typescript
interface Goal {
  id: string;
  role_id: string;        // 所属角色 FK
  title: string;          // 目标标题
  status: "not_started" | "in_progress" | "completed" | "abandoned";
  time_scope: "short" | "medium" | "long" | "ongoing";
  start_date: string | null;   // 可选，ISO 日期
  end_date: string | null;     // 可选，ISO 日期
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

### 状态枚举

| 值 | 显示文本 | 颜色 |
|----|---------|------|
| `not_started` | 未开始 | 红色系 `#d93025` |
| `in_progress` | 进行中 | 绿色系 `#1e8e3e` |
| `completed` | 已完成 | 灰色系 `#5f6368` |
| `abandoned` | 已放弃 | 灰色系 `#9aa0a6` |

### 时间范围枚举

| 值 | 显示文本 |
|----|---------|
| `short` | 短期目标 |
| `medium` | 中期目标 |
| `long` | 长期目标 |
| `ongoing` | 持续 |

## 后端设计

### 新增文件

`src-tauri/src/mission.rs`

### MySQL 表

```sql
CREATE TABLE mission_statement (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  content TEXT NOT NULL DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mission_roles (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(20) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mission_goals (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  role_id VARCHAR(36) NOT NULL,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',
  time_scope VARCHAR(20) NOT NULL DEFAULT 'long',
  start_date DATE NULL,
  end_date DATE NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES mission_roles(id) ON DELETE CASCADE
);
```

### Tauri 命令

| 命令 | 签名 | 说明 |
|------|------|------|
| `get_mission_statement` | `() -> Option<MissionStatement>` | 获取使命宣言 |
| `save_mission_statement` | `(content: String) -> MissionStatement` | 保存使命宣言（upsert） |
| `list_roles` | `() -> Vec<Role>` | 获取所有角色（按 sort_order） |
| `create_role` | `(name: String, icon: String) -> Role` | 新增角色 |
| `update_role` | `(id: String, name: String, icon: String) -> Role` | 更新角色 |
| `delete_role` | `(id: String) -> ()` | 删除角色（事务级联删除目标） |
| `reorder_roles` | `(actions: Vec<ReorderAction>) -> ()` | 角色排序 |
| `list_goals` | `(role_id: String) -> Vec<Goal>` | 获取角色下目标 |
| `create_goal` | `(role_id: String, title: String) -> Goal` | 新增目标 |
| `update_goal` | `(id: String, title: Option<String>, status: Option<String>, time_scope: Option<String>, start_date: Option<String>, end_date: Option<String>) -> Goal` | 更新目标字段（传 None 的字段不更新） |
| `delete_goal` | `(id: String) -> ()` | 删除目标 |
| `reorder_goals` | `(role_id: String, actions: Vec<ReorderAction>) -> ()` | 目标排序 |

### 事务化规范

`delete_role` 需级联删除该角色下所有目标，使用 `pool.begin()` 开启事务：

```rust
let mut tx = pool.begin().await?;
sqlx::query("DELETE FROM mission_goals WHERE role_id = ?")
  .bind(&id).execute(&mut *tx).await?;
sqlx::query("DELETE FROM mission_roles WHERE id = ?")
  .bind(&id).execute(&mut *tx).await?;
tx.commit().await?;
```

## 前端设计

### 文件结构

```
src/features/mission/
├── MissionTypes.ts             # 类型定义（MissionStatement, Role, Goal）
├── MissionStore.ts             # Zustand store（state + actions + init）
├── MissionService.ts           # Tauri command 封装 + createSyncEngine
├── MissionPanel.tsx            # 主面板容器（三栏布局）
├── MissionStatementEditor.tsx  # 顶部 Tiptap 编辑器（可折叠）
├── RoleSidebar.tsx             # 左下角色列表
├── GoalDetailPanel.tsx         # 右下目标详情
├── GoalCard.tsx                # 单个目标卡片
└── MissionPanel.css            # 样式
```

### 数据流

1. `MissionPanel` 挂载时调用 `MissionStore.init()` 从 MySQL 加载数据
2. 编辑操作（新增/修改/删除）先乐观更新 store 状态
3. 通过 `createSyncEngine` 对同一 key 的写操作 debounce 500ms 后持久化到 MySQL
4. 拖拽排序复用现有 `ReorderAction` 纯函数模式

### 组件职责

- **MissionPanel**：三栏布局容器，管理折叠状态（`isStatementCollapsed`）和角色选中（`selectedRoleId`）
- **MissionStatementEditor**：封装 Tiptap 编辑器，接收 `content` 和 `onChange` props
- **RoleSidebar**：渲染角色列表，支持 `@dnd-kit` 拖拽排序，提供增删操作
- **GoalDetailPanel**：根据 `selectedRoleId` 渲染目标列表，提供添加目标入口
- **GoalCard**：单个目标卡片，展示标题、状态标签、时间范围，支持内联编辑状态

### 导航接入

`main.tsx` 修改：

```typescript
// AppSection 类型新增
type AppSection = "weekly-planning" | "four-quadrants" | "daily-review" | "lists" | "habits" | "mission";

// Toolbar tools 数组新增
{ id: "mission", name: "人生罗盘", icon: Navigation, component: () => <></> }

// 条件渲染新增
activeSection === "mission" ? <MissionPanel /> : ...
```

## 错误处理

- Rust 命令返回 `Result<T, String>`，错误信息为人类可读中文
- 前端 `try/catch` 包裹所有 service 调用，失败时 `console.error` 记录
- store 保持乐观更新，网络恢复后下次写入自动重试

## 测试策略

- 使用 vitest + jsdom（已有基础设施）
- 重点测试 `MissionStore` 的 action 逻辑：
  - 角色增删改、排序
  - 目标增删改、状态切换、排序
- 拖拽排序复用 `ReorderAction` 纯函数测试模式

## 一期边界（明确不做的事）

- ❌ 不与其他模块联动（每日复盘、周计划等）
- ❌ 不做目标到期提醒/通知
- ❌ 不做导出/导入功能
- ❌ 不做多使命宣言（仅支持一份）
- ❌ 不做角色模板/预设
