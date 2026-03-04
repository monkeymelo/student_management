# Student Management

一个学生管理系统的初始化骨架，包含后端 API 目录、前端目录、文档目录，以及学生/签到核心模型与建表脚本。

## 项目结构

- `backend/`: API 服务（Express）
- `frontend/`: 管理端页面（预留）
- `docs/`: 接口与字段说明
- `docs/api.md`: 接口请求/响应示例（含签到成功与课时用尽错误码）

## 环境变量

后端服务支持以下环境变量：

- `PORT`: 服务端口（默认 `3000`）

> 数据库连接变量（如 `DATABASE_URL`）可在接入 ORM 或 DB 客户端后补充。

## 本地启动（后端）

```bash
cd backend
npm install
npm start
```

启动后可访问：

- `GET /health`
- `GET /api/students`
- `GET /api/attendance`

## 数据库表说明

建表脚本位于：`backend/migrations/001_create_students_and_attendance.sql`

### students
- 学生基础信息与课程统计字段
- 约束：
  - `age >= 0`
  - `enroll_count >= 0`
  - `total_amount >= 0`
  - `attended_count >= 0`
  - `remaining_lessons >= 0`（保证剩余课时不可为负数）

### attendances
- 学生签到与上课记录
- 约束：
  - `student_id` 外键关联 `students.id`
  - 与学生为一对多关系（一个学生可对应多条签到记录）
  - 删除学生时，关联签到记录级联删除（`ON DELETE CASCADE`）

## 路由预留

- `backend/routes/students.js`：学生 CRUD
- `backend/routes/attendance.js`：签到 CRUD 与签到接口（`POST /check-in`）
