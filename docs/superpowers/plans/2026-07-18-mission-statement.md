# 人生罗盘（个人使命宣言）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 FishWorker 桌面应用中新增"人生罗盘"模块，支持书写个人使命宣言、定义角色与带状态/时间维度的目标。

**Architecture:** 遵循现有三层模式——Rust 后端 `mission.rs` 提供 Tauri 命令操作 MySQL，前端 `features/mission/` 包含 Types/Service/Store/UI 四层，数据通过 `createSyncEngine` 乐观同步。

**Tech Stack:** Rust/sqlx, Tauri v2, React 19, Zustand, Tiptap, @dnd-kit, vitest

---

## 文件结构

### 后端新增/修改

| 文件 | 职责 |
|------|------|
| `src-tauri/src/mission.rs` (新建) | 使命宣言/角色/目标的全部 Tauri 命令 |
| `src-tauri/src/schema.rs` (修改) | 新增 3 张表的建表语句 |
| `src-tauri/src/lib.rs` (修改) | 注册 mission 模块命令 |

### 前端新增/修改

| 文件 | 职责 |
|------|------|
| `src/features/mission/MissionTypes.ts` (新建) | 类型定义 |
| `src/features/mission/MissionService.ts` (新建) | Tauri invoke 封装 |
| `src/features/mission/MissionStore.ts` (新建) | Zustand store + SyncEngine |
| `src/features/mission/MissionStore.test.ts` (新建) | Store 单元测试 |
| `src/features/mission/MissionPanel.tsx` (新建) | 主面板容器 |
| `src/features/mission/MissionStatementEditor.tsx` (新建) | Tiptap 编辑器 |
| `src/features/mission/RoleSidebar.tsx` (新建) | 角色列表 |
| `src/features/mission/GoalDetailPanel.tsx` (新建) | 目标详情 |
| `src/features/mission/GoalCard.tsx` (新建) | 目标卡片 |
| `src/features/mission/MissionPanel.css` (新建) | 样式 |
| `src/main.tsx` (修改) | 注册导航入口 |

---

### Task 1: 后端 — Schema 建表 + mission.rs 骨架

**Files:**
- Modify: `src-tauri/src/schema.rs`
- Create: `src-tauri/src/mission.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 在 schema.rs 中添加 3 张表的建表语句**

在 `src-tauri/src/schema.rs` 的 `ensure_tables` 函数末尾（`Ok(())` 之前）追加：

```rust
    // ── Mission module tables ──

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS mission_statement (
            id VARCHAR(36) NOT NULL,
            content LONGTEXT NOT NULL DEFAULT '',
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS mission_roles (
            id VARCHAR(36) NOT NULL,
            name VARCHAR(100) NOT NULL,
            icon VARCHAR(20) NOT NULL DEFAULT '',
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS mission_goals (
            id VARCHAR(36) NOT NULL,
            role_id VARCHAR(36) NOT NULL,
            title VARCHAR(500) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'not_started',
            time_scope VARCHAR(20) NOT NULL DEFAULT 'long',
            start_date DATE NULL,
            end_date DATE NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            KEY idx_role_order (role_id, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;
```

- [ ] **Step 2: 创建 mission.rs 骨架文件**

创建 `src-tauri/src/mission.rs`，包含 struct 定义和所有命令的签名（暂用 `todo!()` 占位）：

```rust
use serde::{Deserialize, Serialize};
use sqlx::{MySqlPool, Row};
use tauri::State;

fn now_dt() -> chrono::DateTime<chrono::Utc> {
    chrono::Utc::now()
}

// ── DTOs ──

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MissionStatement {
    pub id: String,
    pub content: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Role {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: String,
    pub role_id: String,
    pub title: String,
    pub status: String,
    pub time_scope: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MissionAllData {
    pub statement: Option<MissionStatement>,
    pub roles: Vec<Role>,
    pub goals: Vec<Goal>,
}

// ── Load all ──

#[tauri::command]
pub async fn mission_load_all(pool: State<'_, MySqlPool>) -> Result<MissionAllData, String> {
    // statement
    let stmt_row = sqlx::query(
        "SELECT id, content, updated_at FROM mission_statement WHERE id = 'default' LIMIT 1"
    )
    .fetch_optional(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let statement = stmt_row.map(|r| MissionStatement {
        id: r.try_get("id").unwrap_or_default(),
        content: r.try_get("content").unwrap_or_default(),
        updated_at: r.try_get::<String, _>("updated_at").unwrap_or_default(),
    });

    // roles
    let role_rows = sqlx::query(
        "SELECT id, name, icon, sort_order, created_at, updated_at FROM mission_roles ORDER BY sort_order"
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let roles: Vec<Role> = role_rows
        .into_iter()
        .map(|r| Role {
            id: r.try_get("id").unwrap_or_default(),
            name: r.try_get("name").unwrap_or_default(),
            icon: r.try_get("icon").unwrap_or_default(),
            sort_order: r.try_get("sort_order").unwrap_or_default(),
            created_at: r.try_get::<String, _>("created_at").unwrap_or_default(),
            updated_at: r.try_get::<String, _>("updated_at").unwrap_or_default(),
        })
        .collect();

    // goals
    let goal_rows = sqlx::query(
        "SELECT id, role_id, title, status, time_scope, start_date, end_date, sort_order, created_at, updated_at FROM mission_goals ORDER BY sort_order"
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let goals: Vec<Goal> = goal_rows
        .into_iter()
        .map(|r| Goal {
            id: r.try_get("id").unwrap_or_default(),
            role_id: r.try_get("role_id").unwrap_or_default(),
            title: r.try_get("title").unwrap_or_default(),
            status: r.try_get("status").unwrap_or_default(),
            time_scope: r.try_get("time_scope").unwrap_or_default(),
            start_date: r.try_get::<String, _>("start_date").ok(),
            end_date: r.try_get::<String, _>("end_date").ok(),
            sort_order: r.try_get("sort_order").unwrap_or_default(),
            created_at: r.try_get::<String, _>("created_at").unwrap_or_default(),
            updated_at: r.try_get::<String, _>("updated_at").unwrap_or_default(),
        })
        .collect();

    Ok(MissionAllData { statement, roles, goals })
}

// ── Mission Statement ──

#[tauri::command]
pub async fn mission_save_statement(content: String, pool: State<'_, MySqlPool>) -> Result<MissionStatement, String> {
    let now = now_dt();
    let now_str = now.to_rfc3339();
    sqlx::query(
        "INSERT INTO mission_statement (id, content, updated_at) VALUES ('default', ?, ?)
         ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = VALUES(updated_at)"
    )
    .bind(&content)
    .bind(now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(MissionStatement { id: "default".into(), content, updated_at: now_str })
}

// ── Role CRUD ──

#[tauri::command]
pub async fn mission_create_role(name: String, icon: String, sort_order: i32, pool: State<'_, MySqlPool>) -> Result<Role, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_dt();
    let now_str = now.to_rfc3339();
    sqlx::query(
        "INSERT INTO mission_roles (id, name, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&id).bind(&name).bind(&icon).bind(sort_order).bind(now).bind(now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Role { id, name, icon, sort_order, created_at: now_str.clone(), updated_at: now_str })
}

#[tauri::command]
pub async fn mission_update_role(id: String, name: String, icon: String, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    sqlx::query("UPDATE mission_roles SET name = ?, icon = ?, updated_at = ? WHERE id = ?")
        .bind(&name).bind(&icon).bind(now).bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn mission_delete_role(id: String, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM mission_goals WHERE role_id = ?")
        .bind(&id)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM mission_roles WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn mission_reorder_roles(items: Vec<(String, i32)>, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    for (id, order) in &items {
        sqlx::query("UPDATE mission_roles SET sort_order = ?, updated_at = ? WHERE id = ?")
            .bind(order).bind(now).bind(id)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ── Goal CRUD ──

#[tauri::command]
pub async fn mission_create_goal(role_id: String, title: String, sort_order: i32, pool: State<'_, MySqlPool>) -> Result<Goal, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_dt();
    let now_str = now.to_rfc3339();
    sqlx::query(
        "INSERT INTO mission_goals (id, role_id, title, status, time_scope, sort_order, created_at, updated_at) VALUES (?, ?, ?, 'not_started', 'long', ?, ?, ?)"
    )
    .bind(&id).bind(&role_id).bind(&title).bind(sort_order).bind(now).bind(now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Goal {
        id, role_id, title,
        status: "not_started".into(),
        time_scope: "long".into(),
        start_date: None, end_date: None,
        sort_order,
        created_at: now_str.clone(), updated_at: now_str,
    })
}

#[tauri::command]
pub async fn mission_update_goal(
    id: String,
    title: Option<String>,
    status: Option<String>,
    time_scope: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    pool: State<'_, MySqlPool>,
) -> Result<(), String> {
    let now = now_dt();
    let mut sets = Vec::new();
    let mut binds: Vec<Box<dyn sqlx::Encode<'_, sqlx::MySql> + Send>> = Vec::new();

    if let Some(ref v) = title { sets.push("title = ?"); binds.push(Box::new(v.clone())); }
    if let Some(ref v) = status { sets.push("status = ?"); binds.push(Box::new(v.clone())); }
    if let Some(ref v) = time_scope { sets.push("time_scope = ?"); binds.push(Box::new(v.clone())); }
    // start_date / end_date: always set (to value or NULL)
    sets.push("start_date = ?");
    binds.push(Box::new(start_date.clone()));
    sets.push("end_date = ?");
    binds.push(Box::new(end_date.clone()));

    sets.push("updated_at = ?");
    binds.push(Box::new(now));

    let sql = format!("UPDATE mission_goals SET {} WHERE id = ?", sets.join(", "));
    binds.push(Box::new(id));

    let mut q = sqlx::query(&sql);
    for b in binds {
        q = q.bind(b);
    }
    q.execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn mission_delete_goal(id: String, pool: State<'_, MySqlPool>) -> Result<(), String> {
    sqlx::query("DELETE FROM mission_goals WHERE id = ?")
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn mission_reorder_goals(role_id: String, items: Vec<(String, i32)>, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    for (id, order) in &items {
        sqlx::query("UPDATE mission_goals SET sort_order = ?, updated_at = ? WHERE id = ? AND role_id = ?")
            .bind(order).bind(now).bind(id).bind(&role_id)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Step 3: 在 lib.rs 中注册 mission 模块**

在 `src-tauri/src/lib.rs` 顶部添加 `mod mission;`，然后在 `invoke_handler` 中注册所有命令：

```rust
// 顶部 mod 声明区
mod mission;

// invoke_handler 中追加
mission::mission_load_all,
mission::mission_save_statement,
mission::mission_create_role,
mission::mission_update_role,
mission::mission_delete_role,
mission::mission_reorder_roles,
mission::mission_create_goal,
mission::mission_update_goal,
mission::mission_delete_goal,
mission::mission_reorder_goals,
```

- [ ] **Step 4: 编译验证**

```bash
cd src-tauri; cargo check
```

预期：编译通过，无错误。

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/mission.rs src-tauri/src/schema.rs src-tauri/src/lib.rs
git commit -m "feat(mission): add Rust backend - schema, commands, registration"
```

---

### Task 2: 前端 — 类型定义 + Service 层

**Files:**
- Create: `src/features/mission/MissionTypes.ts`
- Create: `src/features/mission/MissionService.ts`

- [ ] **Step 1: 创建 MissionTypes.ts**

```typescript
export type GoalStatus = "not_started" | "in_progress" | "completed" | "abandoned";
export type TimeScope = "short" | "medium" | "long" | "ongoing";

export interface MissionStatement {
  id: string;
  content: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  roleId: string;
  title: string;
  status: GoalStatus;
  timeScope: TimeScope;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MissionAllData {
  statement: MissionStatement | null;
  roles: Role[];
  goals: Goal[];
}

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  not_started: "未开始",
  in_progress: "进行中",
  completed: "已完成",
  abandoned: "已放弃",
};

export const TIME_SCOPE_LABELS: Record<TimeScope, string> = {
  short: "短期目标",
  medium: "中期目标",
  long: "长期目标",
  ongoing: "持续",
};
```

- [ ] **Step 2: 创建 MissionService.ts**

```typescript
import { invoke } from "@tauri-apps/api/core";
import type { MissionAllData, MissionStatement, Role, Goal } from "./MissionTypes";

export const missionService = {
  loadAll: async (): Promise<MissionAllData> => {
    try {
      return await invoke<MissionAllData>("mission_load_all");
    } catch (e) {
      console.error("Failed to load mission data:", e);
      throw e;
    }
  },

  saveStatement: async (content: string): Promise<MissionStatement> => {
    try {
      return await invoke<MissionStatement>("mission_save_statement", { content });
    } catch (e) {
      console.error("Failed to save mission statement:", e);
      throw e;
    }
  },

  createRole: async (name: string, icon: string, sortOrder: number): Promise<Role> => {
    try {
      return await invoke<Role>("mission_create_role", { name, icon, sortOrder });
    } catch (e) {
      console.error("Failed to create role:", e);
      throw e;
    }
  },

  updateRole: async (id: string, name: string, icon: string): Promise<void> => {
    try {
      await invoke("mission_update_role", { id, name, icon });
    } catch (e) {
      console.error("Failed to update role:", e);
      throw e;
    }
  },

  deleteRole: async (id: string): Promise<void> => {
    try {
      await invoke("mission_delete_role", { id });
    } catch (e) {
      console.error("Failed to delete role:", e);
      throw e;
    }
  },

  reorderRoles: async (items: [string, number][]): Promise<void> => {
    try {
      await invoke("mission_reorder_roles", { items });
    } catch (e) {
      console.error("Failed to reorder roles:", e);
      throw e;
    }
  },

  createGoal: async (roleId: string, title: string, sortOrder: number): Promise<Goal> => {
    try {
      return await invoke<Goal>("mission_create_goal", { roleId, title, sortOrder });
    } catch (e) {
      console.error("Failed to create goal:", e);
      throw e;
    }
  },

  updateGoal: async (
    id: string,
    updates: { title?: string; status?: string; timeScope?: string; startDate?: string | null; endDate?: string | null }
  ): Promise<void> => {
    try {
      await invoke("mission_update_goal", {
        id,
        title: updates.title ?? null,
        status: updates.status ?? null,
        timeScope: updates.timeScope ?? null,
        startDate: updates.startDate !== undefined ? updates.startDate : null,
        endDate: updates.endDate !== undefined ? updates.endDate : null,
      });
    } catch (e) {
      console.error("Failed to update goal:", e);
      throw e;
    }
  },

  deleteGoal: async (id: string): Promise<void> => {
    try {
      await invoke("mission_delete_goal", { id });
    } catch (e) {
      console.error("Failed to delete goal:", e);
      throw e;
    }
  },

  reorderGoals: async (roleId: string, items: [string, number][]): Promise<void> => {
    try {
      await invoke("mission_reorder_goals", { roleId, items });
    } catch (e) {
      console.error("Failed to reorder goals:", e);
      throw e;
    }
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add src/features/mission/MissionTypes.ts src/features/mission/MissionService.ts
git commit -m "feat(mission): add frontend types and service layer"
```

---

### Task 3: 前端 — Store + 测试

**Files:**
- Create: `src/features/mission/MissionStore.ts`
- Create: `src/features/mission/MissionStore.test.ts`

- [ ] **Step 1: 编写 MissionStore.test.ts（先写测试）**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useMissionStore } from "./MissionStore";

// Mock service
vi.mock("./MissionService", () => ({
  missionService: {
    loadAll: vi.fn().mockResolvedValue({ statement: null, roles: [], goals: [] }),
    saveStatement: vi.fn().mockResolvedValue({ id: "default", content: "test", updatedAt: "" }),
    createRole: vi.fn().mockImplementation((name: string, icon: string, sortOrder: number) =>
      Promise.resolve({ id: "r-new", name, icon, sortOrder, createdAt: "", updatedAt: "" })
    ),
    updateRole: vi.fn().mockResolvedValue(undefined),
    deleteRole: vi.fn().mockResolvedValue(undefined),
    reorderRoles: vi.fn().mockResolvedValue(undefined),
    createGoal: vi.fn().mockImplementation((roleId: string, title: string, sortOrder: number) =>
      Promise.resolve({ id: "g-new", roleId, title, status: "not_started", timeScope: "long", startDate: null, endDate: null, sortOrder, createdAt: "", updatedAt: "" })
    ),
    updateGoal: vi.fn().mockResolvedValue(undefined),
    deleteGoal: vi.fn().mockResolvedValue(undefined),
    reorderGoals: vi.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(() => {
  useMissionStore.setState({
    statement: null,
    roles: [],
    goals: [],
    selectedRoleId: null,
    isStatementCollapsed: false,
  });
});

describe("MissionStore", () => {
  describe("init", () => {
    it("loads data from service", async () => {
      await useMissionStore.getState().init();
      // No crash = pass (service is mocked)
    });
  });

  describe("roles", () => {
    it("addRole appends a role to state", () => {
      useMissionStore.getState().addRole("家庭成员", "👨‍👩‍👧");
      const { roles } = useMissionStore.getState();
      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe("家庭成员");
      expect(roles[0].icon).toBe("👨‍👩‍👧");
    });

    it("deleteRole removes a role and its goals", () => {
      useMissionStore.getState().addRole("角色A", "🅰️");
      useMissionStore.getState().addRole("角色B", "🅱️");
      const roleId = useMissionStore.getState().roles[0].id;
      useMissionStore.getState().deleteRole(roleId);
      expect(useMissionStore.getState().roles).toHaveLength(1);
      expect(useMissionStore.getState().roles[0].name).toBe("角色B");
    });

    it("updateRole modifies role fields", () => {
      useMissionStore.getState().addRole("旧名称", "📌");
      const roleId = useMissionStore.getState().roles[0].id;
      useMissionStore.getState().updateRole(roleId, { name: "新名称" });
      expect(useMissionStore.getState().roles[0].name).toBe("新名称");
    });
  });

  describe("goals", () => {
    it("addGoal appends a goal to the selected role", () => {
      useMissionStore.getState().addRole("角色", "🎯");
      const roleId = useMissionStore.getState().roles[0].id;
      useMissionStore.setState({ selectedRoleId: roleId });
      useMissionStore.getState().addGoal("目标1");
      const { goals } = useMissionStore.getState();
      expect(goals).toHaveLength(1);
      expect(goals[0].title).toBe("目标1");
      expect(goals[0].roleId).toBe(roleId);
    });

    it("updateGoal modifies goal fields", () => {
      useMissionStore.getState().addRole("角色", "🎯");
      const roleId = useMissionStore.getState().roles[0].id;
      useMissionStore.setState({ selectedRoleId: roleId });
      useMissionStore.getState().addGoal("目标");
      const goalId = useMissionStore.getState().goals[0].id;
      useMissionStore.getState().updateGoal(goalId, { status: "in_progress" });
      expect(useMissionStore.getState().goals[0].status).toBe("in_progress");
    });

    it("deleteGoal removes a goal", () => {
      useMissionStore.getState().addRole("角色", "🎯");
      const roleId = useMissionStore.getState().roles[0].id;
      useMissionStore.setState({ selectedRoleId: roleId });
      useMissionStore.getState().addGoal("目标");
      const goalId = useMissionStore.getState().goals[0].id;
      useMissionStore.getState().deleteGoal(goalId);
      expect(useMissionStore.getState().goals).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test src/features/mission/MissionStore.test.ts
```

预期：FAIL（MissionStore 尚未创建）

- [ ] **Step 3: 创建 MissionStore.ts**

```typescript
import { create } from "zustand";
import type { MissionStatement, Role, Goal } from "./MissionTypes";
import { missionService } from "./MissionService";
import { createSyncEngine } from "../../lib/createSyncEngine";

const STORAGE_KEY = "aistudy_mission_data";

interface MissionStoreState {
  statement: MissionStatement | null;
  roles: Role[];
  goals: Goal[];
  selectedRoleId: string | null;
  isStatementCollapsed: boolean;

  // UI actions
  init: () => Promise<void>;
  setSelectedRole: (id: string | null) => void;
  toggleStatementCollapsed: () => void;

  // Statement
  saveStatement: (content: string) => void;

  // Roles
  addRole: (name: string, icon: string) => void;
  updateRole: (id: string, updates: Partial<Pick<Role, "name" | "icon">>) => void;
  deleteRole: (id: string) => void;
  reorderRoles: (newOrder: string[]) => void;

  // Goals
  addGoal: (title: string) => void;
  updateGoal: (id: string, updates: Partial<Pick<Goal, "title" | "status" | "timeScope" | "startDate" | "endDate">>) => void;
  deleteGoal: (id: string) => void;
  reorderGoals: (newOrder: string[]) => void;
}

const syncEngine = createSyncEngine();

function saveLocal(state: { statement: MissionStatement | null; roles: Role[]; goals: Goal[] }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save mission data locally:", e);
  }
}

function loadLocal(): { statement: MissionStatement | null; roles: Role[]; goals: Goal[] } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export const useMissionStore = create<MissionStoreState>((set, get) => ({
  statement: null,
  roles: [],
  goals: [],
  selectedRoleId: null,
  isStatementCollapsed: false,

  init: async () => {
    // Load local first for instant UI
    const local = loadLocal();
    if (local) {
      set({ statement: local.statement, roles: local.roles, goals: local.goals });
    }
    // Then sync from DB
    try {
      const data = await missionService.loadAll();
      set({ statement: data.statement, roles: data.roles, goals: data.goals });
      saveLocal(data);
    } catch (e) {
      console.error("Mission init failed:", e);
    }
  },

  setSelectedRole: (id) => set({ selectedRoleId: id }),
  toggleStatementCollapsed: () => set({ isStatementCollapsed: !get().isStatementCollapsed }),

  saveStatement: (content) => {
    const stmt: MissionStatement = { id: "default", content, updatedAt: new Date().toISOString() };
    set({ statement: stmt });
    saveLocal({ statement: stmt, roles: get().roles, goals: get().goals });
    syncEngine.schedule("mission:statement", () => missionService.saveStatement(content), 500);
  },

  addRole: (name, icon) => {
    const roles = get().roles;
    const newRole: Role = {
      id: crypto.randomUUID(),
      name,
      icon,
      sortOrder: roles.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newRoles = [...roles, newRole];
    set({ roles: newRoles, selectedRoleId: newRole.id });
    saveLocal({ statement: get().statement, roles: newRoles, goals: get().goals });
    syncEngine.schedule(`role:${newRole.id}`, () => missionService.createRole(name, icon, newRole.sortOrder), 300);
  },

  updateRole: (id, updates) => {
    const roles = get().roles.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r);
    set({ roles });
    saveLocal({ statement: get().statement, roles, goals: get().goals });
    const updated = roles.find(r => r.id === id);
    if (updated) {
      syncEngine.schedule(`role:${id}`, () => missionService.updateRole(id, updated.name, updated.icon), 500);
    }
  },

  deleteRole: (id) => {
    const roles = get().roles.filter(r => r.id !== id);
    const goals = get().goals.filter(g => g.roleId !== id);
    const selectedRoleId = get().selectedRoleId === id ? (roles[0]?.id ?? null) : get().selectedRoleId;
    set({ roles, goals, selectedRoleId });
    saveLocal({ statement: get().statement, roles, goals });
    syncEngine.cancel(`role:${id}`);
    missionService.deleteRole(id).catch(e => console.error("Failed to delete role:", e));
  },

  reorderRoles: (newOrder) => {
    const roles = [...get().roles].sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    set({ roles });
    saveLocal({ statement: get().statement, roles, goals: get().goals });
    const items: [string, number][] = roles.map((r, i) => [r.id, i]);
    syncEngine.schedule("reorder:roles", () => missionService.reorderRoles(items), 300);
  },

  addGoal: (title) => {
    const roleId = get().selectedRoleId;
    if (!roleId) return;
    const roleGoals = get().goals.filter(g => g.roleId === roleId);
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      roleId,
      title,
      status: "not_started",
      timeScope: "long",
      startDate: null,
      endDate: null,
      sortOrder: roleGoals.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const goals = [...get().goals, newGoal];
    set({ goals });
    saveLocal({ statement: get().statement, roles: get().roles, goals });
    syncEngine.schedule(`goal:${newGoal.id}`, () => missionService.createGoal(roleId, title, newGoal.sortOrder), 300);
  },

  updateGoal: (id, updates) => {
    const goals = get().goals.map(g => g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g);
    set({ goals });
    saveLocal({ statement: get().statement, roles: get().roles, goals });
    const updated = goals.find(g => g.id === id);
    if (updated) {
      syncEngine.schedule(`goal:${id}`, () =>
        missionService.updateGoal(id, {
          title: updated.title,
          status: updated.status,
          timeScope: updated.timeScope,
          startDate: updated.startDate,
          endDate: updated.endDate,
        }), 500);
    }
  },

  deleteGoal: (id) => {
    const goals = get().goals.filter(g => g.id !== id);
    set({ goals });
    saveLocal({ statement: get().statement, roles: get().roles, goals });
    syncEngine.cancel(`goal:${id}`);
    missionService.deleteGoal(id).catch(e => console.error("Failed to delete goal:", e));
  },

  reorderGoals: (newOrder) => {
    const roleId = get().selectedRoleId;
    if (!roleId) return;
    const roleGoals = get().goals.filter(g => g.roleId === roleId);
    const otherGoals = get().goals.filter(g => g.roleId !== roleId);
    const sorted = [...roleGoals].sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    const goals = [...otherGoals, ...sorted];
    set({ goals });
    saveLocal({ statement: get().statement, roles: get().roles, goals });
    const items: [string, number][] = sorted.map((g, i) => [g.id, i]);
    syncEngine.schedule("reorder:goals", () => missionService.reorderGoals(roleId, items), 300);
  },
}));
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test src/features/mission/MissionStore.test.ts
```

预期：全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/mission/MissionStore.ts src/features/mission/MissionStore.test.ts
git commit -m "feat(mission): add Zustand store with sync engine and tests"
```

---

### Task 4: 前端 — MissionPanel + 子组件

**Files:**
- Create: `src/features/mission/MissionPanel.tsx`
- Create: `src/features/mission/MissionStatementEditor.tsx`
- Create: `src/features/mission/RoleSidebar.tsx`
- Create: `src/features/mission/GoalDetailPanel.tsx`
- Create: `src/features/mission/GoalCard.tsx`
- Create: `src/features/mission/MissionPanel.css`

- [ ] **Step 1: 创建 MissionStatementEditor.tsx**

```tsx
import React, { useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMissionStore } from "./MissionStore";

export const MissionStatementEditor: React.FC = () => {
  const statement = useMissionStore(s => s.statement);
  const isCollapsed = useMissionStore(s => s.isStatementCollapsed);
  const toggle = useMissionStore(s => s.toggleStatementCollapsed);
  const saveStatement = useMissionStore(s => s.saveStatement);

  const editor = useEditor({
    extensions: [StarterKit],
    content: statement?.content || "",
    onUpdate: ({ editor }) => {
      saveStatement(editor.getHTML());
    },
  });

  return (
    <div className="mission-statement-section">
      <div className="mission-statement-header" onClick={toggle}>
        <span className="mission-statement-title">📜 个人使命宣言</span>
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
      </div>
      {!isCollapsed && (
        <div className="mission-statement-editor">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: 创建 RoleSidebar.tsx**

```tsx
import React, { useState } from "react";
import { useMissionStore } from "./MissionStore";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableRoleItem: React.FC<{ role: { id: string; name: string; icon: string }; goalCount: number }> = ({ role, goalCount }) => {
  const selectedRoleId = useMissionStore(s => s.selectedRoleId);
  const setSelectedRole = useMissionStore(s => s.setSelectedRole);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: role.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`role-item ${selectedRoleId === role.id ? "active" : ""}`}
      onClick={() => setSelectedRole(role.id)}
      {...attributes}
      {...listeners}
    >
      <span className="role-icon">{role.icon}</span>
      <span className="role-name">{role.name}</span>
      <span className="role-count">{goalCount}</span>
    </div>
  );
};

export const RoleSidebar: React.FC = () => {
  const roles = useMissionStore(s => s.roles);
  const goals = useMissionStore(s => s.goals);
  const addRole = useMissionStore(s => s.addRole);
  const reorderRoles = useMissionStore(s => s.reorderRoles);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newName.trim()) {
      addRole(newName.trim(), "🎯");
      setNewName("");
      setIsAdding(false);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = roles.findIndex(r => r.id === active.id);
    const newIndex = roles.findIndex(r => r.id === over.id);
    const newOrder = arrayMove(roles, oldIndex, newIndex).map(r => r.id);
    reorderRoles(newOrder);
  };

  return (
    <div className="role-sidebar">
      <div className="role-sidebar-header">
        <span className="role-sidebar-title">角色</span>
        <button className="role-add-btn" onClick={() => setIsAdding(true)}>+</button>
      </div>
      {isAdding && (
        <div className="role-add-input">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            onBlur={() => { if (!newName.trim()) setIsAdding(false); }}
            placeholder="角色名称"
          />
        </div>
      )}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={roles.map(r => r.id)} strategy={verticalListSortingStrategy}>
          {roles.map(role => (
            <SortableRoleItem
              key={role.id}
              role={role}
              goalCount={goals.filter(g => g.roleId === role.id).length}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};
```

- [ ] **Step 3: 创建 GoalCard.tsx**

```tsx
import React, { useState } from "react";
import type { Goal, GoalStatus, TimeScope } from "./MissionTypes";
import { GOAL_STATUS_LABELS, TIME_SCOPE_LABELS } from "./MissionTypes";
import { useMissionStore } from "./MissionStore";

const STATUS_COLORS: Record<GoalStatus, string> = {
  not_started: "#d93025",
  in_progress: "#1e8e3e",
  completed: "#5f6368",
  abandoned: "#9aa0a6",
};

export const GoalCard: React.FC<{ goal: Goal }> = ({ goal }) => {
  const updateGoal = useMissionStore(s => s.updateGoal);
  const deleteGoal = useMissionStore(s => s.deleteGoal);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);

  const handleStatusCycle = () => {
    const cycle: GoalStatus[] = ["not_started", "in_progress", "completed"];
    const idx = cycle.indexOf(goal.status);
    const next = cycle[(idx + 1) % cycle.length];
    updateGoal(goal.id, { status: next });
  };

  const handleTimeScopeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateGoal(goal.id, { timeScope: e.target.value as TimeScope });
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== goal.title) {
      updateGoal(goal.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div className="goal-card">
      <div className="goal-card-main">
        {isEditing ? (
          <input
            className="goal-edit-input"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSaveTitle()}
            onBlur={handleSaveTitle}
            autoFocus
          />
        ) : (
          <span className="goal-title" onDoubleClick={() => setIsEditing(true)}>
            {goal.title}
          </span>
        )}
        <span
          className="goal-status-badge"
          style={{ background: `${STATUS_COLORS[goal.status]}20`, color: STATUS_COLORS[goal.status] }}
          onClick={handleStatusCycle}
          title="点击切换状态"
        >
          {GOAL_STATUS_LABELS[goal.status]}
        </span>
      </div>
      <div className="goal-card-footer">
        <select
          className="goal-time-scope"
          value={goal.timeScope}
          onChange={handleTimeScopeChange}
        >
          {Object.entries(TIME_SCOPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button className="goal-delete-btn" onClick={() => deleteGoal(goal.id)} title="删除目标">
          ×
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: 创建 GoalDetailPanel.tsx**

```tsx
import React, { useState } from "react";
import { useMissionStore } from "./MissionStore";
import { GoalCard } from "./GoalCard";

export const GoalDetailPanel: React.FC = () => {
  const selectedRoleId = useMissionStore(s => s.selectedRoleId);
  const roles = useMissionStore(s => s.roles);
  const goals = useMissionStore(s => s.goals);
  const addGoal = useMissionStore(s => s.addGoal);
  const [newTitle, setNewTitle] = useState("");

  const role = roles.find(r => r.id === selectedRoleId);
  const roleGoals = goals.filter(g => g.roleId === selectedRoleId);

  if (!role) {
    return (
      <div className="goal-detail-empty">
        <p>请选择一个角色，或添加新角色</p>
      </div>
    );
  }

  const handleAdd = () => {
    if (newTitle.trim()) {
      addGoal(newTitle.trim());
      setNewTitle("");
    }
  };

  return (
    <div className="goal-detail-panel">
      <div className="goal-detail-header">
        <span className="goal-detail-title">{role.icon} {role.name}</span>
        <div className="goal-add-row">
          <input
            className="goal-add-input"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="添加新目标..."
          />
          <button className="goal-add-btn" onClick={handleAdd}>+</button>
        </div>
      </div>
      <div className="goal-list">
        {roleGoals.map(goal => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
        {roleGoals.length === 0 && (
          <p className="goal-empty-hint">暂无目标，点击上方添加</p>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 5: 创建 MissionPanel.tsx**

```tsx
import React, { useEffect } from "react";
import { useMissionStore } from "./MissionStore";
import { MissionStatementEditor } from "./MissionStatementEditor";
import { RoleSidebar } from "./RoleSidebar";
import { GoalDetailPanel } from "./GoalDetailPanel";
import "./MissionPanel.css";

export const MissionPanel: React.FC = () => {
  const init = useMissionStore(s => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="mission-panel">
      <MissionStatementEditor />
      <div className="mission-bottom">
        <RoleSidebar />
        <GoalDetailPanel />
      </div>
    </div>
  );
};
```

- [ ] **Step 6: 创建 MissionPanel.css**

```css
.mission-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Statement Section ── */
.mission-statement-section {
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  background: var(--bg-secondary, #fafafa);
}

.mission-statement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  user-select: none;
}

.mission-statement-title {
  font-weight: 600;
  font-size: 13px;
}

.mission-statement-editor {
  padding: 12px 16px;
  min-height: 80px;
  max-height: 200px;
  overflow-y: auto;
}

.mission-statement-editor .tiptap {
  outline: none;
  font-style: italic;
  line-height: 1.6;
  color: #555;
}

/* ── Bottom Split ── */
.mission-bottom {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Role Sidebar ── */
.role-sidebar {
  width: 220px;
  border-right: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.role-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #eee);
}

.role-sidebar-title {
  font-weight: 600;
  font-size: 12px;
}

.role-add-btn {
  background: none;
  border: none;
  color: #1a73e8;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.role-add-input {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}

.role-add-input input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.15s;
}

.role-item:hover {
  background: #f5f5f5;
}

.role-item.active {
  background: #e8f0fe;
  border-left-color: #1a73e8;
}

.role-icon {
  font-size: 14px;
}

.role-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.role-count {
  font-size: 11px;
  color: #666;
}

/* ── Goal Detail ── */
.goal-detail-panel {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.goal-detail-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.goal-detail-header {
  margin-bottom: 12px;
}

.goal-detail-title {
  font-weight: 600;
  font-size: 14px;
  display: block;
  margin-bottom: 8px;
}

.goal-add-row {
  display: flex;
  gap: 8px;
}

.goal-add-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.goal-add-btn {
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 14px;
}

.goal-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.goal-empty-hint {
  color: #999;
  font-size: 13px;
  text-align: center;
  padding: 24px;
}

/* ── Goal Card ── */
.goal-card {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 10px 12px;
}

.goal-card-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.goal-title {
  font-size: 13px;
  cursor: text;
}

.goal-edit-input {
  flex: 1;
  padding: 2px 6px;
  border: 1px solid #1a73e8;
  border-radius: 3px;
  font-size: 13px;
}

.goal-status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
}

.goal-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goal-time-scope {
  font-size: 11px;
  color: #999;
  border: none;
  background: transparent;
  cursor: pointer;
}

.goal-delete-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}

.goal-delete-btn:hover {
  color: #d93025;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/features/mission/
git commit -m "feat(mission): add UI components - panel, editor, sidebar, goals"
```

---

### Task 5: 导航接入 main.tsx

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: 在 main.tsx 中添加导入和注册**

在文件顶部 import 区域追加：

```typescript
import { Navigation } from "lucide-react";
import { MissionPanel } from "./features/mission/MissionPanel";
```

修改 `AppSection` 类型：

```typescript
type AppSection = "weekly-planning" | "four-quadrants" | "daily-review" | "lists" | "habits" | "mission";
```

在 Toolbar tools 数组末尾追加：

```typescript
{ id: "mission", name: "人生罗盘", icon: Navigation, component: () => <></> },
```

在条件渲染中追加：

```typescript
activeSection === "mission" ? <MissionPanel />
```

完整修改后的渲染部分：

```tsx
mainContent={
  <MainContent>
    {activeSection === "weekly-planning" ? (
      <TimeManagementPanel mode="weekly" />
    ) : activeSection === "four-quadrants" ? (
      <TimeManagementPanel mode="daily" />
    ) : activeSection === "daily-review" ? (
      <DailyReviewPanel />
    ) : activeSection === "lists" ? (
      <ListsPanel />
    ) : activeSection === "habits" ? (
      <HabitPanel />
    ) : activeSection === "mission" ? (
      <MissionPanel />
    ) : null}
  </MainContent>
}
```

- [ ] **Step 2: 编译验证**

```bash
pnpm build
```

预期：编译通过。

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat(mission): register navigation entry in main.tsx"
```

---

### Task 6: 运行全部测试 + 最终验证

- [ ] **Step 1: 运行所有测试**

```bash
pnpm test
```

预期：全部通过，无回归。

- [ ] **Step 2: 启动应用手动验证**

```bash
pnpm tauri dev
```

手动验证清单：
1. 左侧工具栏出现"人生罗盘"图标
2. 点击进入模块，顶部可编辑使命宣言
3. 左下可添加角色，点击角色切换
4. 右下可添加目标，切换状态/时间范围
5. 关闭重启后数据仍在

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat(mission): 人生罗盘模块完成"
```
