class AttendanceServiceError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'AttendanceServiceError';
    this.code = code;
    this.status = status;
  }
}

class AttendanceService {
  constructor(repository) {
    this.repository = repository;
  }

  async checkIn(studentId, date, time, content) {
    if (!studentId || !date || !time) {
      throw new AttendanceServiceError('INVALID_ARGUMENT', 'student_id/date/time 均为必填项', 400);
    }

    return this.repository.transaction(async (tx) => {
      const student = await tx.lockAndGetStudent(studentId);

      if (!student) {
        throw new AttendanceServiceError('STUDENT_NOT_FOUND', '学生不存在', 404);
      }

      if (student.remaining_lessons <= 0) {
        throw new AttendanceServiceError('LESSONS_EXHAUSTED', '课时已用完，无法签到', 409);
      }

      const attendance = await tx.createAttendance({
        student_id: studentId,
        class_date: date,
        class_time: time,
        class_content: content || ''
      });

      const updatedStudent = await tx.updateStudentLessonStats(studentId, {
        attended_count: student.attended_count + 1,
        remaining_lessons: student.remaining_lessons - 1
      });

      return {
        attendance,
        student: {
          id: updatedStudent.id,
          completed_lessons: updatedStudent.attended_count,
          remaining_lessons: updatedStudent.remaining_lessons
        }
      };
    });
  }

  async deleteAttendance(attendanceId) {
    if (!attendanceId) {
      throw new AttendanceServiceError('INVALID_ARGUMENT', 'attendance_id 为必填项', 400);
    }

    return this.repository.transaction(async (tx) => {
      const attendance = await tx.getAttendanceById(attendanceId);
      if (!attendance) {
        throw new AttendanceServiceError('ATTENDANCE_NOT_FOUND', '签到记录不存在', 404);
      }

      const student = await tx.lockAndGetStudent(attendance.student_id);
      if (!student || Number(student.id) !== Number(attendance.student_id)) {
        throw new AttendanceServiceError('STUDENT_NOT_FOUND', '学生不存在', 404);
      }

      const deletedAttendance = await tx.deleteAttendance(attendanceId);
      if (!deletedAttendance) {
        throw new AttendanceServiceError('ATTENDANCE_NOT_FOUND', '签到记录不存在', 404);
      }

      const nextAttendedCount = Math.max(0, Number(student.attended_count) - 1);
      const rawRemainingLessons = Number(student.remaining_lessons) + 1;
      const maxRemainingLessons = Number(student.enroll_count);
      const nextRemainingLessons = Number.isFinite(maxRemainingLessons)
        ? Math.min(rawRemainingLessons, Math.max(0, maxRemainingLessons))
        : rawRemainingLessons;

      const updatedStudent = await tx.updateStudentLessonStats(student.id, {
        attended_count: nextAttendedCount,
        remaining_lessons: nextRemainingLessons
      });

      return {
        attendance: deletedAttendance,
        student: {
          id: updatedStudent.id,
          completed_lessons: updatedStudent.attended_count,
          remaining_lessons: updatedStudent.remaining_lessons
        }
      };
    });
  }
}

module.exports = {
  AttendanceService,
  AttendanceServiceError
};
