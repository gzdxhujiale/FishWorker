# Daily Review API Document

本文档描述了“每日复盘”功能前后端（Tauri 与前端 React）以及 TiDB 数据库同步的接口规范。

## 一、后端接口 (Tauri Commands)

这些接口由 Rust 后端实现，负责与 TiDB 的 `daily_reviews` 表进行交互。

### 1. `daily_review_load_all`
从数据库全量加载复盘数据，主要用于在应用启动或重新打开时合并云端数据。

- **调用方式**: `invoke('daily_review_load_all')`
- **请求参数**: 无
- **返回值**: `Array<DailyReviewRow>`
- **数据结构**:
  ```typescript
  interface DailyReviewRow {
    id: string;
    date: string; // 格式: YYYY-MM-DD
    content: string;
    rating?: number; // 评分 (可选)
    createdAt?: number; // 创建时间的时间戳 (毫秒)
    updatedAt?: number; // 更新时间的时间戳 (毫秒)
  }
  ```

### 2. `daily_review_save`
保存（新增或更新）某一条复盘数据到数据库中。支持根据主键及唯一键（`date`）进行 `ON DUPLICATE KEY UPDATE` 冲突覆盖。

- **调用方式**: `invoke('daily_review_save', { review })`
- **请求参数**:
  - `review`: `DailyReviewRow` 对象
- **返回值**: `void`（执行成功无报错即可）

### 3. `daily_review_delete`
删除指定的复盘记录。

- **调用方式**: `invoke('daily_review_delete', { id })`
- **请求参数**:
  - `id`: `string`
- **返回值**: `void`

## 二、前端接口层 (dailyReviewService.ts)

前端在 `src/features/daily-review/dailyReviewService.ts` 封装了 `dailyReviewApi` 对象，对组件屏蔽底层的 `invoke` 细节，提供强类型 Promise。

### 提供的方法
- **`loadAll()`**
  `(): Promise<DailyReview[]>`
- **`save(review: DailyReview)`**
  `(review: DailyReview): Promise<void>`
- **`delete(id: string)`**
  `(id: string): Promise<void>`

## 三、数据库设计 (TiDB Schema)
表名：`daily_reviews`
- `id`: VARCHAR(64) PK
- `date`: DATE NOT NULL (UNIQUE KEY)
- `content`: LONGTEXT NOT NULL
- `rating`: INT
- `created_at`: DATETIME(3)
- `updated_at`: DATETIME(3)
