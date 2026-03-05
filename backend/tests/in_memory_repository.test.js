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
  assert.deepEqual(result[0], {
    weekday: 1,
    time_slot: '18:00-19:00',
    start_time: '18:00:00',
    end_time: '19:00:00',
    student_count: 2,
    students: [
      { id: 2, name: '李四' },
      { id: 1, name: '张三' }
    ]
  });
  assert.equal(result[1].weekday, 2);
  assert.equal(result[1].student_count, 1);
  assert.equal(result[1].students[0].name, '王五');
});
