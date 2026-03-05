/**
 * ClassSession 数据模型定义（字段约定）
 * 可映射到数据库表 `class_sessions`
 */
const ClassSessionFields = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  sessionDate: 'DATE NOT NULL',
  weekday: 'INTEGER NOT NULL CHECK (weekday >= 1 AND weekday <= 7)',
  startTime: 'TIME NOT NULL',
  endTime: 'TIME NOT NULL',
  classContent: "TEXT NOT NULL DEFAULT ''",
  createdAt: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
};

module.exports = { ClassSessionFields };
