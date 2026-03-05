class BatchCheckInServiceError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'BatchCheckInServiceError';
    this.code = code;
    this.status = status;
  }
}

class BatchCheckInService {
  constructor(repository) {
    this.repository = repository;
  }

  _normalizeTime(input) {
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!match) return null;
    return `${match[1]}:${match[2]}:${match[3] || '00'}`;
  }

  async getDueStudents({ weekday, start_time, end_time }) {
    const day = Number(weekday);
    const start = this._normalizeTime(start_time);
    const end = this._normalizeTime(end_time);

    if (!Number.isInteger(day) || day < 1 || day > 7 || !start || !end) {
      throw new BatchCheckInServiceError('INVALID_ARGUMENT', 'weekday/start_time/end_time 参数不合法', 400);
    }

    return this.repository.getDueStudentsForSlot(day, start, end);
  }

  async batchCheckIn(payload) {
    const sessionDate = typeof payload.session_date === 'string' ? payload.session_date.trim() : '';
    const weekday = Number(payload.weekday);
    const startTime = this._normalizeTime(payload.start_time);
    const endTime = this._normalizeTime(payload.end_time);
    const classContent = typeof payload.class_content === 'string' ? payload.class_content.trim() : '';
    const presentStudentIds = Array.isArray(payload.present_student_ids)
      ? Array.from(new Set(payload.present_student_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
      : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      throw new BatchCheckInServiceError('INVALID_ARGUMENT', 'session_date 格式需为 YYYY-MM-DD', 400);
    }
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
      throw new BatchCheckInServiceError('INVALID_ARGUMENT', 'weekday 需在 1-7', 400);
    }
    if (!startTime || !endTime || startTime >= endTime) {
      throw new BatchCheckInServiceError('INVALID_ARGUMENT', 'start_time/end_time 不合法', 400);
    }
    if (!presentStudentIds) {
      throw new BatchCheckInServiceError('INVALID_ARGUMENT', 'present_student_ids 必须为数组', 400);
    }

    return this.repository.transaction(async (tx) => {
      const dueStudents = await tx.getDueStudentsForSlot(weekday, startTime, endTime);
      const dueStudentMap = new Map(dueStudents.map((student) => [Number(student.id), student]));

      const session = await tx.createClassSession({
        session_date: sessionDate,
        weekday,
        start_time: startTime,
        end_time: endTime,
        class_content: classContent
      });

      const success = [];
      const skipped = [];
      const failed = [];
      const summaries = [];

      for (const student of dueStudents) {
        const studentId = Number(student.id);
        const lockedStudent = await tx.lockAndGetStudent(studentId);

        if (!lockedStudent) {
          failed.push({ student_id: studentId, reason: '学生不存在' });
          continue;
        }

        const isPresent = presentStudentIds.includes(studentId);
        if (!isPresent) {
          await tx.createAttendance({
            student_id: studentId,
            session_id: session.id,
            class_date: sessionDate,
            class_time: startTime,
            class_content: classContent,
            status: 'absent'
          });
          skipped.push({ student_id: studentId, reason: '未勾选，记为缺席' });
          summaries.push({
            student_id: studentId,
            name: lockedStudent.name,
            attended_count: lockedStudent.attended_count,
            remaining_lessons: lockedStudent.remaining_lessons
          });
          continue;
        }

        if (Number(lockedStudent.remaining_lessons) <= 0) {
          failed.push({ student_id: studentId, reason: '课时已用完' });
          continue;
        }

        await tx.createAttendance({
          student_id: studentId,
          session_id: session.id,
          class_date: sessionDate,
          class_time: startTime,
          class_content: classContent,
          status: 'present'
        });

        const updatedStudent = await tx.updateStudentLessonStats(studentId, {
          attended_count: Number(lockedStudent.attended_count) + 1,
          remaining_lessons: Number(lockedStudent.remaining_lessons) - 1
        });

        success.push({ student_id: studentId, name: updatedStudent.name });
        summaries.push({
          student_id: studentId,
          name: updatedStudent.name,
          attended_count: updatedStudent.attended_count,
          remaining_lessons: updatedStudent.remaining_lessons
        });
      }

      for (const presentId of presentStudentIds) {
        if (!dueStudentMap.has(presentId)) {
          skipped.push({ student_id: presentId, reason: '不在该时段应到名单中，已跳过' });
        }
      }

      return {
        session,
        due_students: dueStudents.map((student) => ({ id: student.id, name: student.name })),
        success_count: success.length,
        success,
        skipped,
        failed,
        lesson_summaries: summaries
      };
    });
  }
}

module.exports = {
  BatchCheckInService,
  BatchCheckInServiceError
};
