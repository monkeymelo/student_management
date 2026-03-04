class InMemoryRepository {
  constructor() {
    this.students = new Map();
    this.attendances = [];
    this.attendanceId = 1;
    this._tx = Promise.resolve();
  }

  async transaction(work) {
    const run = async () => work(this);
    const next = this._tx.then(run, run);
    this._tx = next.catch(() => {});
    return next;
  }

  async lockAndGetStudent(studentId) {
    const student = this.students.get(Number(studentId));
    return student ? { ...student } : null;
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
