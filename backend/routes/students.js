const express = require('express');
const { repository } = require('../services/data_store');

const router = express.Router();

const ALLOWED_GENDERS = new Set(['male', 'female', 'other']);
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function sanitizeRemark(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeTime(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = trimmed.match(TIME_PATTERN);
  if (!match) return null;
  const [_, hh, mm, ss] = match;
  return `${hh}:${mm}:${ss || '00'}`;
}

function toSeconds(time) {
  const [hh, mm, ss] = time.split(':').map(Number);
  return hh * 3600 + mm * 60 + ss;
}

function validateSchedules(rawSchedules) {
  if (rawSchedules === undefined) {
    return { valid: true, errors: {}, sanitized: undefined };
  }

  if (!Array.isArray(rawSchedules)) {
    return { valid: false, errors: { schedules: 'schedules 必须为数组' }, sanitized: [] };
  }

  const errors = {};
  const normalized = [];
  const dedup = new Set();

  rawSchedules.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors[`schedules[${index}]`] = '每个排课必须是对象';
      return;
    }

    const weekday = Number(item.weekday);
    const start = normalizeTime(item.start_time);
    const end = normalizeTime(item.end_time);

    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
      errors[`schedules[${index}].weekday`] = 'weekday 需在 1-7';
    }
    if (!start) {
      errors[`schedules[${index}].start_time`] = 'start_time 格式需为 HH:mm 或 HH:mm:ss';
    }
    if (!end) {
      errors[`schedules[${index}].end_time`] = 'end_time 格式需为 HH:mm 或 HH:mm:ss';
    }

    if (start && end && toSeconds(start) >= toSeconds(end)) {
      errors[`schedules[${index}]`] = 'start_time 必须早于 end_time';
      return;
    }

    if (Number.isInteger(weekday) && start && end) {
      const key = `${weekday}-${start}-${end}`;
      if (dedup.has(key)) {
        errors[`schedules[${index}]`] = '存在重复排课';
        return;
      }
      dedup.add(key);
      normalized.push({ weekday, start_time: start, end_time: end });
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: normalized
  };
}

function validateStudentPayload(payload) {
  const errors = {};

  if (!payload.name || !String(payload.name).trim()) {
    errors.name = '姓名为必填项';
  }

  if (!payload.course_type || !String(payload.course_type).trim()) {
    errors.course_type = '课程种类为必填项';
  }

  if (!ALLOWED_GENDERS.has(payload.gender)) {
    errors.gender = '性别仅支持 male/female/other';
  }

  const age = Number(payload.age);
  if (Number.isNaN(age) || age < 1 || age > 120) {
    errors.age = '年龄范围需在 1-120';
  }

  const enrollCount = Number(payload.enroll_count);
  if (Number.isNaN(enrollCount) || enrollCount < 0 || enrollCount > 1000) {
    errors.enroll_count = '报课次数需在 0-1000';
  }

  const totalAmount = Number(payload.total_amount);
  if (Number.isNaN(totalAmount) || totalAmount < 0 || totalAmount > 9999999) {
    errors.total_amount = '总金额需在 0-9999999';
  }

  const remark = sanitizeRemark(payload.remark);
  if (remark.length > 500) {
    errors.remark = '备注长度不能超过 500';
  }

  const schedulesValidation = validateSchedules(payload.schedules);
  Object.assign(errors, schedulesValidation.errors);

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      name: String(payload.name || '').trim(),
      gender: payload.gender,
      age,
      course_type: String(payload.course_type || '').trim(),
      enroll_count: enrollCount,
      total_amount: totalAmount,
      remark,
      schedules: schedulesValidation.sanitized
    }
  };
}

function validateRenewPayload(payload) {
  const errors = {};

  const amount = Number(payload.amount);
  if (Number.isNaN(amount) || amount <= 0 || amount > 9999999) {
    errors.amount = '续费金额需在 0-9999999 且大于 0';
  }

  const enrollCount = Number(payload.enroll_count);
  if (!Number.isInteger(enrollCount) || enrollCount <= 0 || enrollCount > 1000) {
    errors.enroll_count = '续课次数需在 1-1000';
  }


  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      amount,
      enroll_count: enrollCount
    }
  };
}

async function attachSchedules(student) {
  const schedules = await repository.listSchedulesByStudentId(student.id);
  return { ...student, schedules };
}

// 创建学生
router.post('/', async (req, res) => {
  const { valid, errors, sanitized } = validateStudentPayload(req.body || {});
  if (!valid) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', errors });
  }

  const student = await repository.createStudent(sanitized);
  if (Array.isArray(sanitized.schedules)) {
    await repository.replaceStudentSchedules(student.id, sanitized.schedules);
  }

  return res.status(201).json({ code: 'OK', data: await attachSchedules(student) });
});

// 查询学生列表
router.get('/', async (req, res) => {
  const students = await repository.listStudents();
  const data = await Promise.all(students.map((student) => attachSchedules(student)));
  return res.json({ code: 'OK', data });
});

// 查询单个学生
router.get('/:id', async (req, res) => {
  const student = await repository.getStudentById(req.params.id);
  if (!student) {
    return res.status(404).json({ code: 'STUDENT_NOT_FOUND', message: '学生不存在' });
  }

  return res.json({ code: 'OK', data: await attachSchedules(student) });
});

// 更新学生
router.put('/:id', async (req, res) => {
  const { valid, errors, sanitized } = validateStudentPayload(req.body || {});
  if (!valid) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', errors });
  }

  const student = await repository.updateStudent(req.params.id, sanitized);
  if (!student) {
    return res.status(404).json({ code: 'STUDENT_NOT_FOUND', message: '学生不存在' });
  }

  if (Array.isArray(sanitized.schedules)) {
    await repository.replaceStudentSchedules(student.id, sanitized.schedules);
  }

  return res.json({ code: 'OK', data: await attachSchedules(student) });
});


// 更新备注
router.put('/:id/remark', async (req, res) => {
  const remark = sanitizeRemark(req.body?.remark);
  if (remark.length > 500) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', errors: { remark: '备注长度不能超过 500' } });
  }

  const current = await repository.getStudentById(req.params.id);
  if (!current) {
    return res.status(404).json({ code: 'STUDENT_NOT_FOUND', message: '学生不存在' });
  }

  const student = await repository.updateStudent(req.params.id, {
    name: current.name,
    gender: current.gender,
    age: Number(current.age),
    course_type: current.course_type,
    enroll_count: Number(current.enroll_count),
    total_amount: Number(current.total_amount),
    remark
  });

  return res.json({ code: 'OK', data: student, message: '备注已更新' });
});

// 学生续费/续课
router.post('/:id/renew', async (req, res) => {
  const { valid, errors, sanitized } = validateRenewPayload(req.body || {});
  if (!valid) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', errors });
  }

  const student = await repository.getStudentById(req.params.id);
  if (!student) {
    return res.status(404).json({ code: 'STUDENT_NOT_FOUND', message: '学生不存在' });
  }

  const updated = await repository.updateStudentLessonStats(req.params.id, {
    enroll_count: Number(student.enroll_count) + sanitized.enroll_count,
    total_amount: Number(student.total_amount) + sanitized.amount,
    remaining_lessons: Number(student.remaining_lessons) + sanitized.enroll_count
  });

  return res.json({ code: 'OK', data: updated, message: '续费成功' });
});

// 删除学生
router.delete('/:id', async (req, res) => {
  const deleted = await repository.deleteStudent(req.params.id);
  if (!deleted) {
    return res.status(404).json({ code: 'STUDENT_NOT_FOUND', message: '学生不存在' });
  }

  return res.json({ code: 'OK', message: '删除成功' });
});

module.exports = router;
