# API 接口说明

## POST /api/students

创建学生并可同时写入排课。

### 请求体示例

```json
{
  "name": "王小明",
  "gender": "male",
  "age": 11,
  "course_type": "钢琴",
  "enroll_count": 24,
  "total_amount": 7200,
  "remark": "周末优先",
  "schedules": [
    { "weekday": 2, "start_time": "18:00", "end_time": "19:00" },
    { "weekday": 6, "start_time": "10:00", "end_time": "11:30" }
  ]
}
```

### 成功响应（201）

```json
{
  "code": "OK",
  "data": {
    "id": 3,
    "name": "王小明",
    "gender": "male",
    "age": 11,
    "course_type": "钢琴",
    "enroll_count": 24,
    "total_amount": 7200,
    "attended_count": 0,
    "remaining_lessons": 24,
    "remark": "周末优先",
    "schedules": [
      {
        "id": 1,
        "student_id": 3,
        "weekday": 2,
        "start_time": "18:00:00",
        "end_time": "19:00:00",
        "created_at": "2026-01-03T03:00:00.000Z",
        "updated_at": "2026-01-03T03:00:00.000Z"
      }
    ]
  }
}
```

### 失败响应示例（400）

```json
{
  "code": "VALIDATION_ERROR",
  "errors": {
    "schedules[0].weekday": "weekday 需在 1-7",
    "schedules[1]": "start_time 必须早于 end_time",
    "schedules[2]": "存在重复排课"
  }
}
```

## PUT /api/students/:id

更新学生信息。传入 `schedules` 时会按“覆盖更新”处理（先删除该学生原排课，再写入新排课）。

### 请求体示例

```json
{
  "name": "王小明",
  "gender": "male",
  "age": 12,
  "course_type": "钢琴",
  "enroll_count": 30,
  "total_amount": 9000,
  "remark": "已调整为周中",
  "schedules": [
    { "weekday": 3, "start_time": "18:30", "end_time": "19:30" }
  ]
}
```

## GET /api/students

返回学生列表，每个学生都包含 `schedules` 字段。

## GET /api/students/:id

返回单个学生详情，包含该学生 `schedules`，可直接用于前端详情页展示。

## PUT /api/students/:id/remark

仅更新学生备注，避免与基础资料更新耦合。

## POST /api/attendance/check-in

学生签到，并返回前端可直接刷新展示的课时统计。

## DELETE /api/attendance/:id

删除一条签到记录，并回滚学生课时统计。
