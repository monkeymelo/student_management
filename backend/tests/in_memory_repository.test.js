const test = require('node:test');
const assert = require('node:assert/strict');

const { InMemoryRepository } = require('../services/in_memory_repository');

test('聚合全局课表：按 weekday + time_slot 分组并统计人数', async () => {
  const repository = new InMemoryRepository({
    students: [
      { id: 1, name: '张三', gender: 'male', age: 12, course_type: '创想课', enroll_count: 10, total_amount: 2000, attended_count: 1, remaining_lessons: 9 },
      { id: 2, name: '李四', gender: 'female', age: 11, course_type: '大师课', enroll_count: 8, total_amount: 1800, attended_count: 0, remaining_lessons: 8 },
      { id: 3, name: '王五', gender: 'male', age: 10, course_type: '创想课', enroll_count: 6, total_amount: 1200, attended_count: 0, remaining_lessons: 6 }
    ],
    schedules: [
      { student_id: 1, weekday: 1, start_time: '18:00:00', end_time: '19:00:00' },
      { student_id: 2, weekday: 1, start_time: '18:00:00', end_time: '19:00:00' },
      { student_id: 3, weekday: 2, start_time: '09:00:00', end_time: '10:00:00' }
    ]
  });

  const result = await repository.getMasterTimetable();

  assert.equal(result.length, 2);
  assert.equal(result[0].weekday, 1);
  assert.equal(result[0].time_slot, '18:00-19:00');
  assert.equal(result[0].start_time, '18:00:00');
  assert.equal(result[0].end_time, '19:00:00');
  assert.equal(result[0].student_count, 2);
  assert.equal(result[0].checked_in_count, 0);
  assert.equal(result[0].has_session, false);
  assert.match(result[0].session_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(result[0].students, [
    { id: 2, name: '李四' },
    { id: 1, name: '张三' }
  ]);
  assert.equal(result[1].weekday, 2);
  assert.equal(result[1].student_count, 1);
  assert.equal(result[1].checked_in_count, 0);
  assert.equal(result[1].has_session, false);
  assert.equal(result[1].students[0].name, '王五');
});

test('聚合全局课表：返回 has_session=true 以标记今日时段已签到', async () => {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const weekday = today.getDay() === 0 ? 7 : today.getDay();

  const repository = new InMemoryRepository({
    students: [
      { id: 1, name: '张三', gender: 'male', age: 12, course_type: '创想课', enroll_count: 10, total_amount: 2000, attended_count: 1, remaining_lessons: 9 }
    ],
    schedules: [
      { student_id: 1, weekday, start_time: '18:00:00', end_time: '19:00:00' }
    ],
    class_sessions: [
      { id: 1, session_date: todayIso, weekday, start_time: '18:00:00', end_time: '19:00:00', class_content: '' }
    ]
  });

  const result = await repository.getMasterTimetable();
  assert.equal(result[0].has_session, true);
});


test('聚合全局课表：不同 week_start 下同一 weekday 映射不同 session_date', async () => {
  const repository = new InMemoryRepository({
    students: [
      { id: 1, name: '张三', gender: 'male', age: 12, course_type: '创想课', enroll_count: 10, total_amount: 2000, attended_count: 0, remaining_lessons: 10 }
    ],
    schedules: [
      { student_id: 1, weekday: 3, start_time: '18:00:00', end_time: '19:00:00' }
    ],
    class_sessions: [
      { id: 1, session_date: '2026-03-04', weekday: 3, start_time: '18:00:00', end_time: '19:00:00', class_content: '' },
      { id: 2, session_date: '2026-03-11', weekday: 3, start_time: '18:00:00', end_time: '19:00:00', class_content: '' }
    ],
    attendances: [
      { id: 1, student_id: 1, class_date: '2026-03-04', class_time: '18:00:00', status: 'present', session_id: 1, class_content: '' },
      { id: 2, student_id: 1, class_date: '2026-03-11', class_time: '18:00:00', status: 'present', session_id: 2, class_content: '' }
    ]
  });

  const firstWeek = await repository.getMasterTimetable('2026-03-02');
  const secondWeek = await repository.getMasterTimetable('2026-03-09');

  assert.equal(firstWeek[0].session_date, '2026-03-04');
  assert.equal(firstWeek[0].checked_in_count, 1);
  assert.equal(secondWeek[0].session_date, '2026-03-11');
  assert.equal(secondWeek[0].checked_in_count, 1);
});
