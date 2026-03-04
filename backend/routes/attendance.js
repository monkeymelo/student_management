const express = require('express');
const router = express.Router();

// 签到（新增一条上课记录）
router.post('/check-in', async (req, res) => {
  // TODO: check-in student attendance
  return res.status(501).json({ message: 'TODO: check-in student attendance' });
});

// 查询签到列表
router.get('/', async (req, res) => {
  // TODO: list attendance records
  return res.status(501).json({ message: 'TODO: list attendance records' });
});

// 查询单条签到记录
router.get('/:id', async (req, res) => {
  // TODO: get attendance by id
  return res.status(501).json({ message: 'TODO: get attendance by id' });
});

// 更新签到记录
router.put('/:id', async (req, res) => {
  // TODO: update attendance
  return res.status(501).json({ message: 'TODO: update attendance' });
});

// 删除签到记录
router.delete('/:id', async (req, res) => {
  // TODO: delete attendance
  return res.status(501).json({ message: 'TODO: delete attendance' });
});

module.exports = router;
