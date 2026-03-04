const express = require('express');
const { AttendanceService, AttendanceServiceError } = require('../services/attendance_service');
const { InMemoryRepository } = require('../services/in_memory_repository');

const router = express.Router();
const repository = new InMemoryRepository();
const attendanceService = new AttendanceService(repository);

// 签到（新增一条上课记录）
router.post('/check-in', async (req, res) => {
  const { student_id, date, time, content } = req.body;

  try {
    const result = await attendanceService.checkIn(student_id, date, time, content);
    return res.status(201).json({
      code: 'OK',
      message: '签到成功',
      data: result
    });
  } catch (error) {
    if (error instanceof AttendanceServiceError) {
      return res.status(error.status).json({
        code: error.code,
        message: error.message
      });
    }

    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    });
  }
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
