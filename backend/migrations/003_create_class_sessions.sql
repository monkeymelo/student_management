-- 003_create_class_sessions.sql
-- 说明：创建课堂时段会话表，同一天同一时段唯一，防止重复签到

CREATE TABLE IF NOT EXISTS class_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date DATE NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  class_content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_class_session_time CHECK (start_time < end_time),
  CONSTRAINT uq_class_session_slot UNIQUE (session_date, weekday, start_time, end_time)
);

CREATE INDEX IF NOT EXISTS idx_class_sessions_session_date ON class_sessions(session_date);
