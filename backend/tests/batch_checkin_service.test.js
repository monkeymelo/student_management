const test = require('node:test');
const assert = require('node:assert/strict');

const { BatchCheckInService } = require('../services/batch_checkin_service');

class FakeRepository {
  constructor() {
    this.students = new Map([
      [1, { id: 1, name: '张三', attended_count: 0, remaining_lessons: 2 }],
      [2, { id: 2, name: '李四', attended_count: 1, remaining_lessons: 0 }],
      [3, { id: 3, name: '王五', attended_count: 2, remaining_lessons: 3 }]
    ]);
    this.schedules = [
      { student_id: 1, weekday: 1, start_time: '18:00:00', end_time: '19:00:00' },
      { student_id: 2, weekday: 1, start_time: '18:00:00', end_time: '19:00:00' },
      { student_id: 3, weekday: 1, start_time: '18:00:00', end_time: '19:00:00' }
    ];
    this.attendances = [];
    this.classSessions = [];
    this.nextAttendanceId = 1;
    this.nextSessionId = 1;
    this._tx = Promise.resolve();
  }

  async transaction(work) {
    const run = async () => work(this);
    const queued = this._tx.then(run, run);
    this._tx = queued.catch(() => {});
    return queued;
  }

  async getDueStudentsForSlot(weekday, startTime, endTime) {
    const ids = this.schedules
      .filter((item) => Number(item.weekday) === Number(weekday)
        && item.start_time === startTime
        && item.end_time === endTime)
      .map((item) => Number(item.student_id));
    return ids.map((id) => ({ ...this.students.get(id) }));
  }

  async createClassSession(payload) {
    const existed = await this.findClassSessionBySlot(payload.session_date, payload.weekday, payload.start_time, payload.end_time);
    if (existed) {
      const error = new Error('SESSION_ALREADY_EXISTS');
      error.code = 'SESSION_ALREADY_EXISTS';
      throw error;
    }

    const row = { id: this.nextSessionId++, ...payload };
    this.classSessions.push(row);
    return { ...row };
  }

  async findClassSessionBySlot(sessionDate, weekday, startTime, endTime) {
    const found = this.classSessions.find((row) => (
      row.session_date === sessionDate
      && Number(row.weekday) === Number(weekday)
      && row.start_time === startTime
      && row.end_time === endTime
    ));

    return found ? { ...found } : null;
  }

  async lockAndGetStudent(studentId) {
    const student = this.students.get(Number(studentId));
    return student ? { ...student } : null;
  }

  async createAttendance(payload) {
    const row = { id: this.nextAttendanceId++, ...payload };
    this.attendances.push(row);
    return { ...row };
  }

  async updateStudentLessonStats(studentId, nextValues) {
    const id = Number(studentId);
    const updated = { ...this.students.get(id), ...nextValues };
    this.students.set(id, updated);
    return { ...updated };
  }
}

test('批量签到：创建 session，出勤扣课时，未勾选记缺席，课时不足进入失败列表', async () => {
  const repository = new FakeRepository();
  const service = new BatchCheckInService(repository);

  const result = await service.batchCheckIn({
    session_date: '2026-03-01',
    weekday: 1,
    start_time: '18:00',
    end_time: '19:00',
    present_student_ids: [1, 2],
    class_content: '静物素描'
  });

  assert.equal(result.success_count, 1);
  assert.equal(result.success[0].student_id, 1);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].student_id, 2);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].student_id, 3);

  const student1 = repository.students.get(1);
  assert.equal(student1.attended_count, 1);
  assert.equal(student1.remaining_lessons, 1);

  assert.equal(repository.classSessions.length, 1);
  assert.equal(repository.attendances.length, 2);
  assert.equal(repository.attendances.some((row) => row.student_id === 3 && row.status === 'absent'), true);
});


test('批量签到：同一日期时段重复提交，返回 SESSION_ALREADY_CHECKED_IN', async () => {
  const repository = new FakeRepository();
  const service = new BatchCheckInService(repository);

  await service.batchCheckIn({
    session_date: '2026-03-01',
    weekday: 1,
    start_time: '18:00',
    end_time: '19:00',
    present_student_ids: [1],
    class_content: '速写'
  });

  await assert.rejects(
    () => service.batchCheckIn({
      session_date: '2026-03-01',
      weekday: 1,
      start_time: '18:00',
      end_time: '19:00',
      present_student_ids: [1],
      class_content: '速写'
    }),
    (error) => error.code === 'SESSION_ALREADY_CHECKED_IN' && error.status === 409
  );
});
