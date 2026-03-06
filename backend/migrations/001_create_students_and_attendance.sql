-- 001_create_students_and_attendance.sql
-- 说明：创建学生与签到表，包含字段约束与一对多关系（PostgreSQL）

CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  age INTEGER NOT NULL CHECK (age >= 0),
  course_type VARCHAR(100) NOT NULL,
  enroll_count INTEGER NOT NULL DEFAULT 0 CHECK (enroll_count >= 0),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  attended_count INTEGER NOT NULL DEFAULT 0 CHECK (attended_count >= 0),
  remaining_lessons INTEGER NOT NULL DEFAULT 0 CHECK (remaining_lessons >= 0),
  remark TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendances (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  class_date DATE NOT NULL,
  class_time TIME NOT NULL,
  session_id BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'present',
  class_content TEXT,
  signed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_student
    FOREIGN KEY (student_id)
    REFERENCES students(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_class_date ON attendances(class_date);
