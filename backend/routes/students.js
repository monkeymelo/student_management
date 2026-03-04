const express = require('express');
const router = express.Router();

// 创建学生
router.post('/', async (req, res) => {
  // TODO: create student
  return res.status(501).json({ message: 'TODO: create student' });
});

// 查询学生列表
router.get('/', async (req, res) => {
  // TODO: list students
  return res.status(501).json({ message: 'TODO: list students' });
});

// 查询单个学生
router.get('/:id', async (req, res) => {
  // TODO: get student by id
  return res.status(501).json({ message: 'TODO: get student by id' });
});

// 更新学生
router.put('/:id', async (req, res) => {
  // TODO: update student
  return res.status(501).json({ message: 'TODO: update student' });
});

// 删除学生
router.delete('/:id', async (req, res) => {
  // TODO: delete student
  return res.status(501).json({ message: 'TODO: delete student' });
});

module.exports = router;
