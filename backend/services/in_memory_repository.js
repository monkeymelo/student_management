class InMemoryRepository {
  constructor(initialData = {}) {
    this.students = new Map();
    this.attendances = [];
    this.schedules = [];
    this.studentId = 1;
    this.attendanceId = 1;
    this.scheduleId = 1;
    this._tx = Promise.resolve();

    this._bootstrap(initialData);
  }

  _bootstrap(initialData) {
    const students = initialData.students || [];
    const attendances = initialData.attendances || [];
    const schedules = initialData.schedules || [];

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
        class_content: attendance.class_content,
        signed_at: attendance.signed_at || new Date().toISOString()
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
      signed_at: new Date().toISOString()
    };
    this.attendances.push(attendance);
    return { ...attendance };
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
    const { student_id, start_date, end_date } = filters;
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

  async getMasterTimetable() {
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

    return Array.from(grouped.values())
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
