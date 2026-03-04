const express = require('express');
const studentsRouter = require('../routes/students');
const attendanceRouter = require('../routes/attendance');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/students', studentsRouter);
app.use('/api/attendance', attendanceRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
