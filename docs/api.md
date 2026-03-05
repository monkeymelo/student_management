# API 接口说明

## POST /api/attendance/check-in

学生签到，并返回前端可直接刷新展示的课时统计。

### 请求体

```json
{
  "student_id": 1,
  "date": "2026-01-03",
  "time": "11:00:00",
  "content": "视唱练耳"
}
```

### 成功响应（201）

```json
{
  "code": "OK",
  "message": "签到成功",
  "data": {
    "attendance": {
      "id": 10,
      "student_id": 1,
      "class_date": "2026-01-03",
      "class_time": "11:00:00",
      "class_content": "视唱练耳",
      "signed_at": "2026-01-03T03:00:00.000Z"
    },
    "student": {
      "id": 1,
      "completed_lessons": 8,
      "remaining_lessons": 4
    }
  }
}
```

> 前端可直接使用 `data.student.completed_lessons` 与 `data.student.remaining_lessons` 刷新“已上课次数/剩余课时”。

### 失败响应：课时用尽（409）

```json
{
  "code": "LESSONS_EXHAUSTED",
  "message": "课时已用完，无法签到"
}
```


## PUT /api/students/:id/remark

仅更新学生备注，避免与基础资料更新耦合。

### 请求体

```json
{
  "remark": "家长反馈：本周希望增加节奏训练。"
}
```

### 成功响应（200）

```json
{
  "code": "OK",
  "message": "备注已更新",
  "data": {
    "id": 1,
    "name": "张三",
    "remark": "家长反馈：本周希望增加节奏训练。"
  }
}
```

### 失败响应：参数错误（400）

```json
{
  "code": "VALIDATION_ERROR",
  "errors": {
    "remark": "备注长度不能超过 500"
  }
}
```
