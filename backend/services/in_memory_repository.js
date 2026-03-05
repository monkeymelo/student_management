class InMemoryRepository {
  constructor(initialData = {}) {
    this.students = new Map();
    this.attendances = [];
    this.studentId = 1;
    this.attendanceId = 1;
    this._tx = Promise.resolve();

    this._bootstrap(initialData);
  }

  _bootstrap(initialData) {
    const students = initialData.students || [];
    const attendances = initialData.attendances || [];

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

    this.students.set(id, updated);
    return { ...updated };
  }

  async deleteStudent(studentId) {
    const id = Number(studentId);
    const existed = this.students.delete(id);
    if (existed) {
      this.attendances = this.attendances.filter((record) => Number(record.student_id) !== id);
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
}

module.exports = {
  InMemoryRepository
};
