const express = require('express');
const path = require('path');
const studentsRouter = require('../routes/students');
const attendanceRouter = require('../routes/attendance');
const timetableRouter = require('../routes/timetable');
const authRouter = require('../routes/auth');
const { requireAuth } = require('../middleware/auth');
const { createSessionMiddleware } = require('../middleware/session');

function createApp() {
  const app = express();
  app.use(express.json());

  app.use(createSessionMiddleware());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api', requireAuth);
  app.use('/api/students', studentsRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/timetable', timetableRouter);

  const frontendPath = path.resolve(__dirname, '../../frontend');
  app.use(express.static(frontendPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(path.join(frontendPath, 'index.html'));
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = {
  createApp
};
