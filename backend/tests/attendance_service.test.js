const test = require('node:test');
const assert = require('node:assert/strict');

const { AttendanceService } = require('../services/attendance_service');

class FakeRepository {
  constructor(students = []) {
    this.students = new Map(students.map((student) => [student.id, { ...student }]));
    this.attendances = [];
    this.nextAttendanceId = 1;
    this._tx = Promise.resolve();
  }

  async transaction(work) {
    const run = async () => work(this);
    const queued = this._tx.then(run, run);
    this._tx = queued.catch(() => {});
    return queued;
  }

  async lockAndGetStudent(studentId) {
    const student = this.students.get(Number(studentId));
    return student ? { ...student } : null;
  }

  async createAttendance(payload) {
    const row = {
      id: this.nextAttendanceId++,
      ...payload,
      signed_at: new Date().toISOString()
    };
    this.attendances.push(row);
    return { ...row };
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

test('正常签到成功：新增签到并更新已上课/剩余课时', async () => {
  const repository = new FakeRepository([
    { id: 1, attended_count: 2, remaining_lessons: 3 }
  ]);
  const service = new AttendanceService(repository);

  const result = await service.checkIn(1, '2026-01-01', '09:00:00', '基础练习');

  assert.equal(result.student.completed_lessons, 3);
  assert.equal(result.student.remaining_lessons, 2);
  assert.equal(repository.attendances.length, 1);
  assert.equal(repository.students.get(1).attended_count, 3);
  assert.equal(repository.students.get(1).remaining_lessons, 2);
});

test('课时为 0 时拒绝签到，返回可识别错误码', async () => {
  const repository = new FakeRepository([
    { id: 2, attended_count: 5, remaining_lessons: 0 }
  ]);
  const service = new AttendanceService(repository);

  await assert.rejects(
    () => service.checkIn(2, '2026-01-02', '10:00:00', '曲目练习'),
    (error) => {
      assert.equal(error.code, 'LESSONS_EXHAUSTED');
      assert.equal(error.message, '课时已用完，无法签到');
      return true;
    }
  );

  assert.equal(repository.attendances.length, 0);
  assert.equal(repository.students.get(2).remaining_lessons, 0);
});

test('并发签到不会扣成负数：仅允许一次成功', async () => {
  const repository = new FakeRepository([
    { id: 3, attended_count: 0, remaining_lessons: 1 }
  ]);
  const service = new AttendanceService(repository);

  const [first, second] = await Promise.allSettled([
    service.checkIn(3, '2026-01-03', '11:00:00', '视唱练耳'),
    service.checkIn(3, '2026-01-03', '11:30:00', '乐理')
  ]);

  const fulfilled = [first, second].filter((item) => item.status === 'fulfilled');
  const rejected = [first, second].filter((item) => item.status === 'rejected');

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason.code, 'LESSONS_EXHAUSTED');
  assert.equal(repository.students.get(3).remaining_lessons, 0);
  assert.equal(repository.students.get(3).attended_count, 1);
  assert.equal(repository.attendances.length, 1);
});
