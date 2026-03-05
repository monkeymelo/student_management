const express = require('express');
const { repository } = require('../services/data_store');

const router = express.Router();

router.get('/master', async (req, res) => {
  const data = await repository.getMasterTimetable();
  return res.json({ code: 'OK', data });
});

module.exports = router;
