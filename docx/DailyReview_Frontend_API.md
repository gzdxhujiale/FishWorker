# 每日复盘与复利计划 - 前端接口与数据文档

## 1. 概述
本项目采用 Tauri 架构，由于复盘数据属于极度隐私的个人数据，目前版本采用完全本地化的存储方案（基于 `localStorage`，未来可无缝迁移至 Tauri 本地文件存储）。
本接口文档定义了前端交互所依赖的数据结构与 Store 方法，并在 v1.2 迭代中引入了第三方日历库 `react-day-picker` 以支持精准的月视图打卡高亮渲染。

## 2. 数据字典

### 2.1 每日复盘 (DailyReview)
| 字段名     | 类型   | 描述                                     |
|------------|--------|------------------------------------------|
| `id`       | string | 唯一标识 (UUID)                          |
| `date`     | string | 格式 `YYYY-MM-DD`，代表该记录归属的日期 |
| `content`  | string | 用户填写的复盘正文                       |
| `rating`   | number | 当日状态打分 (1~5，可选)                 |
| `createdAt`| number | 创建时间戳                               |
| `updatedAt`| number | 最后更新时间戳                           |

### 2.2 用户统计 (UserStats)
用于描述用户的复利计算及打卡天数。
| 字段名          | 类型   | 描述                     |
|-----------------|--------|--------------------------|
| `currentStreak` | number | 当前连续打卡天数         |
| `longestStreak` | number | 历史最高连续打卡天数     |
| `totalReviews`  | number | 总复盘天数               |
| `compoundValue` | number | 当前复利值 (如：1.00)    |

## 3. Store API (dailyReviewStore)
通过封装 `localStorage` 对外提供服务。

### `load()`
- **描述**: 从本地读取所有数据。
- **返回**: `{ reviews: DailyReview[] }`

### `save(data)`
- **描述**: 持久化写入所有数据。
- **参数**: `{ reviews: DailyReview[] }`

### `getAllReviews()`
- **描述**: 获取所有复盘数据，自动以日期降序排序。
- **返回**: `DailyReview[]`
- **前端调用注意**: 日历视图通过遍历该返回结果，将 `YYYY-MM-DD` 安全映射回 `Date` 数组进行 `level1` - `level4` 的等级上色。

### `getReviewByDate(date)`
- **描述**: 获取指定日期的复盘数据。
- **参数**: `date` (string)
- **返回**: `DailyReview | undefined`

### `saveReview(date, content, rating)`
- **描述**: 保存（新增或更新）某日的复盘记录。
- **参数**: 
  - `date`: `string`
  - `content`: `string`
  - `rating`: `number` (optional)
- **返回**: `DailyReview`

### `deleteReview(id)`
- **描述**: 根据 ID 删除特定的记录。
- **参数**: `id`: `string`

### `getCompoundStats()`
- **描述**: 动态计算当前连续天数、最大天数与当前复利值。
- **返回**: `CompoundStats` 对象。
```json
{
  "currentStreak": 3,
  "longestStreak": 15,
  "totalReviews": 42,
  "compoundValue": 1.03
}
```
**说明**:
- `compoundValue` 计算公式为： `1.01 ^ currentStreak`，一旦中断（前一天没有复盘），则从 1.00 重新计算。

## 4. UI 视图数据联动说明
### 4.1 当月日历视图 (Monthly Calendar View)
在 v1.2 中重构热力图为月度日历 (`CompoundStats.tsx`)。
- **组件依赖**: `react-day-picker`, `date-fns`。
- **时区安全转换**:
  由 `dailyReviewStore` 提供的 `YYYY-MM-DD` 字符数据，在日历中必须通过本地提取的方式构造 `Date` 对象：
  ```tsx
  const [y, m, d] = dateString.split('-').map(Number);
  const safeLocalObj = new Date(y, m - 1, d);
  ```
- **业务限制 (Modifiers & Props)**:
  - 限制日期最早可见/可点范围为 **2026-01-01** (通过 `startMonth` / `hidden` / `disabled` props 限制)。
  - `modifiers={{ level4: [...], level3: [...], ... }}` 用于挂载打卡颜色样式。
