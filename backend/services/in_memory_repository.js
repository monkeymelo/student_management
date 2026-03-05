class InMemoryRepository {
  constructor(initialData = {}) {
    this.students = new Map();
    this.attendances = [];
    this.schedules = [];
    this.classSessions = [];
    this.studentId = 1;
    this.attendanceId = 1;
    this.scheduleId = 1;
    this.classSessionId = 1;
    this._tx = Promise.resolve();

    this._bootstrap(initialData);
  }

  _bootstrap(initialData) {
    const students = initialData.students || [];
    const attendances = initialData.attendances || [];
    const schedules = initialData.schedules || [];
    const classSessions = initialData.class_sessions || [];

    students.forEach((student) => {
      const id = Number(student.id) || this.studentId++;
      this.studentId = Math.max(this.studentId, id + 1);
      this.students.set(id, {
        id,
        name: student.name,
        gender: student.gender,
        age: Number(student.age),
        course_type: student.course_type,
        enroll_count: Number(student.enroll_count),
        total_amount: Number(student.total_amount),
        attended_count: Number(student.attended_count || 0),
        remaining_lessons: Number(student.remaining_lessons ?? student.enroll_count),
        remark: typeof student.remark === 'string' ? student.remark : ''
      });
    });

    attendances.forEach((attendance) => {
      const id = Number(attendance.id) || this.attendanceId++;
      this.attendanceId = Math.max(this.attendanceId, id + 1);
      this.attendances.push({
        id,
        student_id: Number(attendance.student_id),
        class_date: attendance.class_date,
        class_time: attendance.class_time,
        status: attendance.status || 'present',
        session_id: attendance.session_id ? Number(attendance.session_id) : null,
        class_content: attendance.class_content,
        signed_at: attendance.signed_at || new Date().toISOString()
      });
    });

    classSessions.forEach((session) => {
      const id = Number(session.id) || this.classSessionId++;
      this.classSessionId = Math.max(this.classSessionId, id + 1);
      this.classSessions.push({
        id,
        session_date: session.session_date,
        weekday: Number(session.weekday),
        start_time: session.start_time,
        end_time: session.end_time,
        class_content: session.class_content || '',
        created_at: session.created_at || new Date().toISOString()
      });
    });

    schedules.forEach((schedule) => {
      const id = Number(schedule.id) || this.scheduleId++;
      this.scheduleId = Math.max(this.scheduleId, id + 1);
      this.schedules.push({
        id,
        student_id: Number(schedule.student_id),
        weekday: Number(schedule.weekday),
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        created_at: schedule.created_at || new Date().toISOString(),
        updated_at: schedule.updated_at || new Date().toISOString()
      });
    });
  }

  async transaction(work) {
    const run = async () => work(this);
    const next = this._tx.then(run, run);
    this._tx = next.catch(() => {});
    return next;
  }

  async listStudents() {
    return Array.from(this.students.values()).map((student) => ({ ...student }));
  }

  async getStudentById(studentId) {
    const student = this.students.get(Number(studentId));
    return student ? { ...student } : null;
  }

  async createStudent(payload) {
    const id = this.studentId++;
    const student = {
      id,
      attended_count: 0,
      ...payload,
      remaining_lessons: Number(payload.enroll_count),
      remark: typeof payload.remark === 'string' ? payload.remark : ''
    };
    delete student.schedules;
    this.students.set(id, student);
    return { ...student };
  }

  async updateStudent(studentId, payload) {
    const id = Number(studentId);
    const current = this.students.get(id);
    if (!current) {
      return null;
    }

    const nextEnrollCount = Number(payload.enroll_count);
    const updated = {
      ...current,
      ...payload,
      enroll_count: nextEnrollCount,
      remaining_lessons: Math.max(0, nextEnrollCount - Number(current.attended_count)),
      remark: typeof payload.remark === 'string' ? payload.remark : current.remark
    };

    delete updated.schedules;
    this.students.set(id, updated);
    return { ...updated };
  }

  async deleteStudent(studentId) {
    const id = Number(studentId);
    const existed = this.students.delete(id);
    if (existed) {
      this.attendances = this.attendances.filter((record) => Number(record.student_id) !== id);
      this.schedules = this.schedules.filter((record) => Number(record.student_id) !== id);
    }
    return existed;
  }

  async lockAndGetStudent(studentId) {
    return this.getStudentById(studentId);
  }

  async createAttendance(payload) {
    const attendance = {
      id: this.attendanceId++,
      ...payload,
      status: payload.status || 'present',
      session_id: payload.session_id ? Number(payload.session_id) : null,
      signed_at: new Date().toISOString()
    };
    this.attendances.push(attendance);
    return { ...attendance };
  }

  async createClassSession(payload) {
    const existed = await this.findClassSessionBySlot(
      payload.session_date,
      payload.weekday,
      payload.start_time,
      payload.end_time
    );

    if (existed) {
      const error = new Error('SESSION_ALREADY_EXISTS');
      error.code = 'SESSION_ALREADY_EXISTS';
      throw error;
    }

    const row = {
      id: this.classSessionId++,
      ...payload,
      class_content: payload.class_content || '',
      created_at: new Date().toISOString()
    };
    this.classSessions.push(row);
    return { ...row };
  }

  async findClassSessionBySlot(sessionDate, weekday, startTime, endTime) {
    const found = this.classSessions.find((session) => (
      String(session.session_date) === String(sessionDate)
      && Number(session.weekday) === Number(weekday)
      && String(session.start_time).slice(0, 8) === String(startTime).slice(0, 8)
      && String(session.end_time).slice(0, 8) === String(endTime).slice(0, 8)
    ));

    return found ? { ...found } : null;
  }

  async getDueStudentsForSlot(weekday, startTime, endTime) {
    const dueStudentIds = this.schedules
      .filter((record) => (
        Number(record.weekday) === Number(weekday)
          && String(record.start_time).slice(0, 8) === String(startTime).slice(0, 8)
          && String(record.end_time).slice(0, 8) === String(endTime).slice(0, 8)
      ))
      .map((record) => Number(record.student_id));

    const uniqueIds = Array.from(new Set(dueStudentIds));
    return uniqueIds
      .map((id) => this.students.get(id))
      .filter(Boolean)
      .map((student) => ({ ...student }));
  }

  async countPresentBySlotAndDate(sessionDate, weekday, startTime, endTime) {
    const sessionIds = this.classSessions
      .filter((session) => (
        String(session.session_date) === String(sessionDate)
        && Number(session.weekday) === Number(weekday)
        && String(session.start_time).slice(0, 8) === String(startTime).slice(0, 8)
        && String(session.end_time).slice(0, 8) === String(endTime).slice(0, 8)
      ))
      .map((session) => Number(session.id));

    if (!sessionIds.length) {
      return 0;
    }

    return this.attendances.filter((attendance) => (
      sessionIds.includes(Number(attendance.session_id)) && attendance.status === 'present'
    )).length;
  }


  async getAttendanceById(id) {
    const attendance = this.attendances.find((record) => Number(record.id) === Number(id));
    return attendance ? { ...attendance } : null;
  }

  async deleteAttendance(id) {
    const index = this.attendances.findIndex((record) => Number(record.id) === Number(id));
    if (index === -1) {
      return null;
    }

    const [deleted] = this.attendances.splice(index, 1);
    return { ...deleted };
  }

  async listAttendances(filters = {}) {
    const { student_id, start_date, end_date, status } = filters;
    return this.attendances
      .filter((record) => {
        if (student_id && Number(record.student_id) !== Number(student_id)) {
          return false;
        }
        if (start_date && record.class_date < start_date) {
          return false;
        }
        if (end_date && record.class_date > end_date) {
          return false;
        }
        if (status && String(record.status) !== String(status)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
      if (a.class_date === b.class_date) {
        return a.class_time.localeCompare(b.class_time);
        }
        return a.class_date.localeCompare(b.class_date);
      })
      .map((record) => ({ ...record }));
  }

  async listSchedulesByStudentId(studentId) {
    return this.schedules
      .filter((record) => Number(record.student_id) === Number(studentId))
      .sort((a, b) => {
        if (a.weekday === b.weekday) {
          return a.start_time.localeCompare(b.start_time);
        }
        return a.weekday - b.weekday;
      })
      .map((record) => ({ ...record }));
  }

  async replaceStudentSchedules(studentId, schedules = []) {
    const id = Number(studentId);
    this.schedules = this.schedules.filter((record) => Number(record.student_id) !== id);

    const now = new Date().toISOString();
    schedules.forEach((schedule) => {
      this.schedules.push({
        id: this.scheduleId++,
        student_id: id,
        weekday: Number(schedule.weekday),
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        created_at: now,
        updated_at: now
      });
    });

    return this.listSchedulesByStudentId(id);
  }

  async updateStudentLessonStats(studentId, nextValues) {
    const id = Number(studentId);
    const student = this.students.get(id);
    const updated = {
      ...student,
      ...nextValues
    };
    this.students.set(id, updated);
    return { ...updated };
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

  async getMasterTimetable(weekStartParam) {
    const grouped = new Map();

    this.schedules.forEach((schedule) => {
      const student = this.students.get(Number(schedule.student_id));
      if (!student) return;

      const timeSlot = `${String(schedule.start_time).slice(0, 5)}-${String(schedule.end_time).slice(0, 5)}`;
      const key = `${schedule.weekday}-${timeSlot}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          weekday: Number(schedule.weekday),
          time_slot: timeSlot,
          start_time: String(schedule.start_time).slice(0, 8),
          end_time: String(schedule.end_time).slice(0, 8),
          student_count: 0,
          students: []
        });
      }

      const bucket = grouped.get(key);
      if (!bucket.students.some((item) => Number(item.id) === Number(student.id))) {
        bucket.students.push({ id: student.id, name: student.name });
        bucket.student_count += 1;
      }
    });

    const baseDate = weekStartParam ? new Date(weekStartParam) : new Date();
    const currentWeekStart = this.getWeekStartMonday(baseDate);

    const values = await Promise.all(Array.from(grouped.values()).map(async (item) => {
      const sessionDate = this.getDateByWeekday(currentWeekStart, item.weekday);
      return {
        ...item,
        session_date: sessionDate,
        checked_in_count: await this.countPresentBySlotAndDate(sessionDate, item.weekday, item.start_time, item.end_time),
        has_session: Boolean(await this.findClassSessionBySlot(sessionDate, item.weekday, item.start_time, item.end_time))
      };
    }));

    return values
      .map((item) => ({
        ...item,
        students: item.students.sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-Hans-CN'))
      }))
      .sort((a, b) => {
        if (a.weekday === b.weekday) {
          return a.start_time.localeCompare(b.start_time);
        }
        return a.weekday - b.weekday;
      });
  }
}

module.exports = {
  InMemoryRepository
};
