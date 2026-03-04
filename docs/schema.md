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

## Attendance
- `id`: 签到记录ID
- `student_id`: 学生ID（关联 `students.id`）
- `class_date`: 上课日期
- `class_time`: 上课时间
- `class_content`: 上课内容
- `signed_at`: 签到时间戳
