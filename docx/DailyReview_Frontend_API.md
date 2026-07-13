# 每日复盘与复利计划 - 前端接口与数据文档

## 1. 概述
本项目采用 Tauri 架构，由于复盘数据属于极度隐私的个人数据，目前版本采用完全本地化的存储方案（基于 `localStorage`，未来可无缝迁移至 Tauri 本地文件存储）。
本接口文档定义了前端交互所依赖的数据结构与 Store 方法。

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
| `baseValue`     | number | 当前复利值 (如：1.00)    |

## 3. Store API (dailyReviewStore)
通过封装 `localStorage` 对外提供服务。

### `load()`
- **描述**: 从本地读取所有数据。
- **返回**: `{ reviews: DailyReview[] }`

### `save(data)`
- **描述**: 持久化写入所有数据。
- **参数**: `{ reviews: DailyReview[] }`

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
- **返回**: 
```json
{
  "currentStreak": 3,
  "longestStreak": 15,
  "totalReviews": 42,
  "compoundValue": 1.03
}
```
**说明**:
- `compoundValue` 计算公式为： `1.01 ^ currentStreak`，一旦中断（前一天没有复盘），则从 1.00 重新计算。或者根据具体设计采用累计值。
