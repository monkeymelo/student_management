const express = require('express');
const { repository } = require('../services/data_store');
const { BatchCheckInService, BatchCheckInServiceError } = require('../services/batch_checkin_service');

const router = express.Router();
const batchCheckInService = new BatchCheckInService(repository);

router.get('/master', async (req, res) => {
  const data = await repository.getMasterTimetable(req.query.week_start);
  return res.json({ code: 'OK', data });
});

router.get('/due-students', async (req, res) => {
  try {
    const data = await batchCheckInService.getDueStudents({
      weekday: req.query.weekday,
      start_time: req.query.start_time,
      end_time: req.query.end_time
    });

    return res.json({ code: 'OK', data });
  } catch (error) {
    if (error instanceof BatchCheckInServiceError) {
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

module.exports = router;
