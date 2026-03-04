const { InMemoryRepository } = require('./in_memory_repository');

const repository = new InMemoryRepository({
  students: [
    {
      id: 1,
      name: '张三',
      gender: 'male',
      age: 12,
      course_type: '钢琴',
      enroll_count: 20,
      total_amount: 6000,
      attended_count: 6,
      remaining_lessons: 14
    },
    {
      id: 2,
      name: '李四',
      gender: 'female',
      age: 10,
      course_type: '小提琴',
      enroll_count: 10,
      total_amount: 3800,
      attended_count: 10,
      remaining_lessons: 0
    }
  ]
});

module.exports = {
  repository
};
