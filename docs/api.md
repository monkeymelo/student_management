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

## POST /api/attendance/batch-check-in

批量签到接口（按 `session_date + weekday + start_time + end_time` 唯一确定一个课堂会话）。

- 后端会拒绝同一时段重复签到。
- 若重复提交，返回 `409 SESSION_ALREADY_CHECKED_IN`，前端应提示“该时段今日已签到”，避免再次提交。

### 请求体示例

```json
{
  "session_date": "2026-03-01",
  "weekday": 1,
  "start_time": "18:00:00",
  "end_time": "19:00:00",
  "present_student_ids": [1, 3, 5],
  "class_content": "静物素描"
}
```

### 成功响应（201）

```json
{
  "code": "OK",
  "message": "批量签到成功",
  "data": {
    "session": {
      "id": 10,
      "session_date": "2026-03-01",
      "weekday": 1,
      "start_time": "18:00:00",
      "end_time": "19:00:00",
      "class_content": "静物素描"
    },
    "success_count": 2,
    "success": [{ "student_id": 1, "name": "张三" }],
    "skipped": [{ "student_id": 7, "reason": "不在该时段应到名单中，已跳过" }],
    "failed": [{ "student_id": 2, "reason": "课时已用完" }]
  }
}
```

### 重复提交响应（409）

```json
{
  "code": "SESSION_ALREADY_CHECKED_IN",
  "message": "该时段今日已完成签到，请勿重复提交"
}
```

## GET /api/timetable/master

返回全局课表。每个时段包含“今日签到状态”字段：

- `today_checked_in`: 今日该时段已签到人数（`present` 计数）。
- `today_has_session`: 今日该时段是否已发起过批量签到（true/false）。

### 响应示例

```json
{
  "code": "OK",
  "data": [
    {
      "weekday": 1,
      "time_slot": "18:00-19:00",
      "start_time": "18:00:00",
      "end_time": "19:00:00",
      "student_count": 3,
      "today_checked_in": 2,
      "today_has_session": true,
      "students": [
        { "id": 2, "name": "李四" },
        { "id": 1, "name": "张三" }
      ]
    }
  ]
}
```
