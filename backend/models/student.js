/**
 * Student 数据模型定义（字段约定）
 * 可映射到 ORM Model 或数据库表 `students`
 */
const StudentFields = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  name: 'VARCHAR(100) NOT NULL',
  gender: "VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other'))",
  age: 'INTEGER NOT NULL CHECK (age >= 0)',
  courseType: 'VARCHAR(100) NOT NULL',
  enrollCount: 'INTEGER NOT NULL DEFAULT 0 CHECK (enroll_count >= 0)',
  totalAmount: 'DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0)',
  attendedCount: 'INTEGER NOT NULL DEFAULT 0 CHECK (attended_count >= 0)',
  remainingLessons: 'INTEGER NOT NULL DEFAULT 0 CHECK (remaining_lessons >= 0)',
  createdAt: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
  updatedAt: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
};

module.exports = { StudentFields };
