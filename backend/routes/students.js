const express = require('express');
const { repository } = require('../services/data_store');

const router = express.Router();

const ALLOWED_GENDERS = new Set(['male', 'female', 'other']);

function sanitizeRemark(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
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
      remark
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

// 创建学生
router.post('/', async (req, res) => {
  const { valid, errors, sanitized } = validateStudentPayload(req.body || {});
  if (!valid) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', errors });
  }

  const student = await repository.createStudent(sanitized);
  return res.status(201).json({ code: 'OK', data: student });
});

// 查询学生列表
router.get('/', async (req, res) => {
  const students = await repository.listStudents();
  return res.json({ code: 'OK', data: students });
});

// 查询单个学生
router.get('/:id', async (req, res) => {
  const student = await repository.getStudentById(req.params.id);
  if (!student) {
    return res.status(404).json({ code: 'STUDENT_NOT_FOUND', message: '学生不存在' });
  }

  return res.json({ code: 'OK', data: student });
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

  return res.json({ code: 'OK', data: student });
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
