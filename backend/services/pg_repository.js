const { query, withTransaction } = require('../src/db');

function normalizeStudent(row) {
  if (!row) return row;
  return {
    ...row,
    age: Number(row.age),
    enroll_count: Number(row.enroll_count),
    total_amount: Number(row.total_amount),
    attended_count: Number(row.attended_count),
    remaining_lessons: Number(row.remaining_lessons)
  };
}

class PgRepository {
  async transaction(work) {
    return withTransaction(async (client) => {
      const txRepo = new PgRepository(client);
      return work(txRepo);
    });
  }

  constructor(client = null) {
    this.client = client;
  }

  async _query(text, params = []) {
    if (this.client) {
      return this.client.query(text, params);
    }
    return query(text, params);
  }

  async listStudents() {
    const result = await this._query('SELECT * FROM students ORDER BY id ASC');
    return result.rows.map(normalizeStudent);
  }

  async getStudentById(studentId) {
    const result = await this._query('SELECT * FROM students WHERE id = $1', [Number(studentId)]);
    return normalizeStudent(result.rows[0]) || null;
  }

  async createStudent(student) {
    const result = await this._query(
      `INSERT INTO students (name, gender, age, course_type, enroll_count, total_amount, attended_count, remaining_lessons, remark)
       VALUES ($1, $2, $3, $4, $5, $6, 0, $5, $7)
       RETURNING *`,
      [
        student.name,
        student.gender,
        Number(student.age),
        student.course_type,
        Number(student.enroll_count),
        Number(student.total_amount),
        student.remark || ''
      ]
    );
    return normalizeStudent(result.rows[0]);
  }

  async updateStudent(studentId, student) {
    const result = await this._query(
      `UPDATE students
       SET name = $2, gender = $3, age = $4, course_type = $5, enroll_count = $6, total_amount = $7, remark = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        Number(studentId),
        student.name,
        student.gender,
        Number(student.age),
        student.course_type,
        Number(student.enroll_count),
        Number(student.total_amount),
        student.remark || ''
      ]
    );
    return normalizeStudent(result.rows[0]) || null;
  }

  async deleteStudent(studentId) {
    const result = await this._query('DELETE FROM students WHERE id = $1 RETURNING *', [Number(studentId)]);
    return normalizeStudent(result.rows[0]) || null;
  }

  async listSchedulesByStudentId(studentId) {
    const result = await this._query(
      'SELECT * FROM student_schedules WHERE student_id = $1 ORDER BY weekday ASC, start_time ASC',
      [Number(studentId)]
    );
    return result.rows;
  }

  async replaceStudentSchedules(studentId, schedules = []) {
    return this.transaction(async (tx) => {
      await tx._query('DELETE FROM student_schedules WHERE student_id = $1', [Number(studentId)]);

      for (const schedule of schedules) {
        await tx._query(
          `INSERT INTO student_schedules (student_id, weekday, start_time, end_time)
           VALUES ($1, $2, $3, $4)`,
          [Number(studentId), Number(schedule.weekday), schedule.start_time, schedule.end_time]
        );
      }

      return tx.listSchedulesByStudentId(studentId);
    });
  }

  async listAttendances(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.student_id) {
      params.push(Number(filters.student_id));
      conditions.push(`student_id = $${params.length}`);
    }
    if (filters.start_date) {
      params.push(filters.start_date);
      conditions.push(`class_date >= $${params.length}`);
    }
    if (filters.end_date) {
      params.push(filters.end_date);
      conditions.push(`class_date <= $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this._query(
      `SELECT * FROM attendances ${where} ORDER BY class_date ASC, class_time ASC`,
      params
    );
    return result.rows;
  }

  async lockAndGetStudent(studentId) {
    const result = await this._query('SELECT * FROM students WHERE id = $1 FOR UPDATE', [Number(studentId)]);
    return normalizeStudent(result.rows[0]) || null;
  }

  async createAttendance(attendance) {
    const result = await this._query(
      `INSERT INTO attendances (student_id, class_date, class_time, class_content, session_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        Number(attendance.student_id),
        attendance.class_date,
        attendance.class_time,
        attendance.class_content || '',
        attendance.session_id ? Number(attendance.session_id) : null,
        attendance.status || 'present'
      ]
    );
    return result.rows[0];
  }

  async getAttendanceById(id) {
    const result = await this._query('SELECT * FROM attendances WHERE id = $1', [Number(id)]);
    return result.rows[0] || null;
  }

  async deleteAttendance(id) {
    const result = await this._query('DELETE FROM attendances WHERE id = $1 RETURNING *', [Number(id)]);
    return result.rows[0] || null;
  }

  async updateStudentLessonStats(studentId, nextValues) {
    const fields = [];
    const params = [Number(studentId)];

    for (const [key, value] of Object.entries(nextValues || {})) {
      params.push(value);
      fields.push(`${key} = $${params.length}`);
    }

    params.push(new Date().toISOString());
    fields.push(`updated_at = $${params.length}`);

    const result = await this._query(
      `UPDATE students SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return normalizeStudent(result.rows[0]) || null;
  }

  async getDueStudentsForSlot(weekday, startTime, endTime) {
    const result = await this._query(
      `SELECT s.*
       FROM students s
       INNER JOIN student_schedules ss ON ss.student_id = s.id
       WHERE ss.weekday = $1
         AND ss.start_time::text = $2
         AND ss.end_time::text = $3
       ORDER BY s.name ASC`,
      [Number(weekday), String(startTime).slice(0, 8), String(endTime).slice(0, 8)]
    );
    return result.rows.map(normalizeStudent);
  }

  async findClassSessionBySlot(sessionDate, weekday, startTime, endTime) {
    const result = await this._query(
      `SELECT *
       FROM class_sessions
       WHERE session_date = $1
         AND weekday = $2
         AND start_time::text = $3
         AND end_time::text = $4
       LIMIT 1`,
      [sessionDate, Number(weekday), String(startTime).slice(0, 8), String(endTime).slice(0, 8)]
    );
    return result.rows[0] || null;
  }

  async createClassSession(session) {
    try {
      const result = await this._query(
        `INSERT INTO class_sessions (session_date, weekday, start_time, end_time, class_content)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [session.session_date, Number(session.weekday), session.start_time, session.end_time, session.class_content || '']
      );
      return result.rows[0];
    } catch (error) {
      if (error && error.code === '23505') {
        const normalized = new Error('Session already exists');
        normalized.code = 'SESSION_ALREADY_EXISTS';
        throw normalized;
      }
      throw error;
    }
  }

  async getMasterTimetable(weekStartParam) {
    const result = await this._query(
      `SELECT
          ss.weekday,
          to_char(ss.start_time, 'HH24:MI') || '-' || to_char(ss.end_time, 'HH24:MI') AS time_slot,
          to_char(ss.start_time, 'HH24:MI:SS') AS start_time,
          to_char(ss.end_time, 'HH24:MI:SS') AS end_time,
          COUNT(DISTINCT s.id)::int AS student_count,
          json_agg(json_build_object('id', s.id, 'name', s.name) ORDER BY s.name) AS students
       FROM student_schedules ss
       INNER JOIN students s ON s.id = ss.student_id
       GROUP BY ss.weekday, ss.start_time, ss.end_time
       ORDER BY ss.weekday ASC, ss.start_time ASC`
    );

    const baseDate = weekStartParam ? new Date(weekStartParam) : new Date();
    const currentWeekStart = this.getWeekStartMonday(baseDate);

    const values = [];
    for (const item of result.rows) {
      const sessionDate = this.getDateByWeekday(currentWeekStart, item.weekday);
      const checkedInCount = await this.countPresentBySlotAndDate(sessionDate, item.weekday, item.start_time, item.end_time);
      const hasSession = Boolean(await this.findClassSessionBySlot(sessionDate, item.weekday, item.start_time, item.end_time));
      values.push({
        ...item,
        session_date: sessionDate,
        checked_in_count: checkedInCount,
        has_session: hasSession
      });
    }

    return values;
  }

  async countPresentBySlotAndDate(sessionDate, weekday, startTime, endTime) {
    const result = await this._query(
      `SELECT COUNT(a.id)::int AS count
       FROM attendances a
       INNER JOIN class_sessions cs ON cs.id = a.session_id
       WHERE cs.session_date = $1
         AND cs.weekday = $2
         AND cs.start_time::text = $3
         AND cs.end_time::text = $4
         AND a.status = 'present'`,
      [sessionDate, Number(weekday), String(startTime).slice(0, 8), String(endTime).slice(0, 8)]
    );

    return result.rows[0]?.count || 0;
  }

  toDateIso(dateInput) {
    const date = new Date(dateInput);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getWeekStartMonday(dateInput) {
    const date = new Date(dateInput);
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return date;
  }

  getDateByWeekday(weekStartInput, weekday) {
    const weekStart = new Date(weekStartInput);
    weekStart.setHours(0, 0, 0, 0);
    const target = new Date(weekStart);
    target.setDate(weekStart.getDate() + (Number(weekday) - 1));
    return this.toDateIso(target);
  }
}

module.exports = {
  PgRepository
};
