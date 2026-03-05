const express = require('express');
const { AttendanceService, AttendanceServiceError } = require('../services/attendance_service');
const { repository } = require('../services/data_store');

const router = express.Router();
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


// 删除签到记录
router.delete('/:id', async (req, res) => {
  try {
    const result = await attendanceService.deleteAttendance(req.params.id);
    return res.json({
      code: 'OK',
      message: '删除成功',
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
  const { student_id, start_date, end_date } = req.query;
  const records = await repository.listAttendances({ student_id, start_date, end_date });
  return res.json({ code: 'OK', data: records });
});

module.exports = router;
