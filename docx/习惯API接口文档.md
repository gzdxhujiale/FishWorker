# 习惯管理模块 API 接口文档

**基础路径**: `/api/habits`
**数据格式**: `application/json`

---

## 1. 获取习惯列表

获取当前用户的所有习惯及其在指定日期的状态。

**请求 (Request)**
- **Method:** `GET`
- **URL:** `/api/habits`
- **Query Parameters:**
  - `date` (string, optional) - 指定查询的基准日期，格式 `YYYY-MM-DD`。默认查询当天。

**响应 (Response)**
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "habit_123",
      "name": "每日阅读",
      "icon": "📚",
      "category": "下午",
      "frequency": "每天",
      "target": "当天完成打卡",
      "reminderTime": "21:00",
      "createdAt": "2026-07-01T00:00:00Z",
      "stats": {
        "totalDays": 14,
        "currentStreak": 3
      },
      "todayStatus": {
        "date": "2026-07-15",
        "isChecked": false
      }
    }
  ]
}
```

---

## 2. 创建新习惯

**请求 (Request)**
- **Method:** `POST`
- **URL:** `/api/habits`
- **Body:**
```json
{
  "name": "喝水 2000ml",
  "icon": "💧",
  "category": "上午",
  "frequency": "每天",
  "target": "当天完成打卡",
  "startDate": "2026-07-15",
  "duration": "永远",
  "reminderTime": "09:00",
  "autoLog": false
}
```

**响应 (Response)**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "habit_124"
  }
}
```

---

## 3. 更新习惯设置

**请求 (Request)**
- **Method:** `PUT`
- **URL:** `/api/habits/:id`
- **Path Parameter:**
  - `id` - 习惯 ID
- **Body:** (支持部分更新)
```json
{
  "name": "喝水 2500ml",
  "reminderTime": "10:00"
}
```

**响应 (Response)**
```json
{
  "code": 200,
  "message": "success"
}
```

---

## 4. 删除/归档习惯

**请求 (Request)**
- **Method:** `DELETE`
- **URL:** `/api/habits/:id`
- **Query Parameter:**
  - `type` (string, optional) - `delete` 或 `archive`，默认为 `delete`。

**响应 (Response)**
```json
{
  "code": 200,
  "message": "success"
}
```

---

## 5. 执行打卡 / 取消打卡

用于切换某一天习惯的完成状态。如果传入状态为已完成，且原本未完成，则新建打卡记录；否则删除对应的打卡记录。

**请求 (Request)**
- **Method:** `POST`
- **URL:** `/api/habits/:id/checkin`
- **Body:**
```json
{
  "date": "2026-07-15",
  "isChecked": true,
  "logNote": "按时完成" 
}
```
*(注: `logNote` 为可选的打卡日记)*

**响应 (Response)**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "currentStreak": 4
  }
}
```

---

## 6. 获取习惯详细统计与历史数据

用于渲染详情页中的统计面板和月度日历。

**请求 (Request)**
- **Method:** `GET`
- **URL:** `/api/habits/:id/stats`
- **Query Parameter:**
  - `yearMonth` (string) - 查询月份，例如 `2026-07`。

**响应 (Response)**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "summary": {
      "monthCount": 10,
      "totalCount": 45,
      "completionRate": 65,
      "currentStreak": 3
    },
    "history": [
      { "date": "2026-07-01", "isChecked": true },
      { "date": "2026-07-02", "isChecked": true }
    ]
  }
}
```
