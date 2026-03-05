# 数据结构说明

## Student
- `id`: 学生ID
- `name`: 姓名
- `gender`: 性别（male/female/other）
- `age`: 年龄
- `course_type`: 课程种类
- `enroll_count`: 报课次数
- `total_amount`: 总金额
- `attended_count`: 已上课次数
- `remaining_lessons`: 剩余课时（不可为负数）
- `remark`: 备注
- `schedules`: 学生固定排课数组，元素结构见 `Schedule`

## Schedule
- `id`: 排课ID
- `student_id`: 学生ID（关联 `students.id`）
- `weekday`: 周几（1-7，1=周一）
- `start_time`: 开始时间（`HH:mm:ss`）
- `end_time`: 结束时间（`HH:mm:ss`）
- `created_at`: 创建时间戳
- `updated_at`: 更新时间戳

## Attendance
- `id`: 签到记录ID
- `student_id`: 学生ID（关联 `students.id`）
- `class_date`: 上课日期
- `class_time`: 上课时间
- `class_content`: 上课内容
- `signed_at`: 签到时间戳

## ClassSession
- `id`: 会话ID
- `session_date`: 上课日期（`YYYY-MM-DD`）
- `weekday`: 周几（1-7）
- `start_time`: 开始时间（`HH:mm:ss`）
- `end_time`: 结束时间（`HH:mm:ss`）
- `class_content`: 课堂内容
- `created_at`: 创建时间戳
- 唯一约束：`(session_date, weekday, start_time, end_time)`，同一天同一时段只允许一个会话
