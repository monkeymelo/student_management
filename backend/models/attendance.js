/**
 * Attendance 数据模型定义（字段约定）
 * 可映射到 ORM Model 或数据库表 `attendances`
 */
const AttendanceFields = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  studentId: 'INTEGER NOT NULL',
  classDate: 'DATE NOT NULL',
  classTime: 'TIME NOT NULL',
  sessionId: 'INTEGER',
  status: "VARCHAR(20) NOT NULL DEFAULT 'present'",
  classContent: 'TEXT',
  signedAt: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
  createdAt: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
};

module.exports = { AttendanceFields };
