# Student Management

一个学生管理系统的初始化骨架，包含后端 API 目录、前端目录、文档目录，以及学生/签到核心模型与建表脚本。

## 项目结构

- `backend/`: API 服务（Express）
- `frontend/`: 原生 HTML/CSS/JavaScript 管理端（存量版本，继续可用）
- `docs/`: 接口与字段说明
- `docs/api.md`: 接口请求/响应示例（含签到成功与课时用尽错误码）

## 环境变量

后端服务支持以下环境变量：

- `PORT`: 服务端口（默认 `3000`）
- `ADMIN_USERNAME`: 管理员登录用户名（必填）
- `ADMIN_PASSWORD_HASH`: 管理员密码的 bcrypt 哈希（必填，不可存明文）
- `SESSION_SECRET`: 会话签名密钥（必填）
- `MAX_LOGIN_ATTEMPTS`: 登录失败阈值，超过后短时锁定（可选，默认 `5`）
- `LOGIN_LOCKOUT_MS`: 触发锁定后的持续毫秒数（可选，默认 `300000`）

### 生成 `ADMIN_PASSWORD_HASH`

在 `backend` 目录执行以下命令生成 bcrypt 哈希：

```bash
python3 -c "import crypt,sys; print(crypt.crypt(sys.argv[1], crypt.mksalt(crypt.METHOD_BLOWFISH)))" '你的明文密码'
```

将输出值填入 `ADMIN_PASSWORD_HASH`。

> 数据库连接变量（如 `DATABASE_URL`）可在接入 ORM 或 DB 客户端后补充。

## 本地启动（后端）

推荐方式：使用 `backend/.env`（可由 `backend/.env.example` 复制）。

```bash
cd backend
cp .env.example .env
# 修改 .env 中的 ADMIN_PASSWORD_HASH 和 SESSION_SECRET
npm install
npm start
```

也可以用 shell 环境变量方式启动：

```bash
cd backend
npm install
export ADMIN_USERNAME='admin'
export ADMIN_PASSWORD_HASH='替换为bcrypt哈希'
export SESSION_SECRET='请设置为随机长字符串'
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


## 常见启动报错

如果看到：`Missing required environment variable: ADMIN_USERNAME`，说明后端没有读到鉴权配置。

请检查：

1. 是否在 `backend/.env` 中配置了 `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH`、`SESSION_SECRET`；
2. 或者是否在当前 shell 中 `export` 了上述变量；
3. 若你把 env 文件放在其他位置，可设置 `AUTH_ENV_FILE=/path/to/.env` 后再启动。
