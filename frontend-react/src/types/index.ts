export type Gender = 'male' | 'female' | 'other';

export interface StudentSchedule {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  time: string;
  content: string;
}

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  courseType: string;
  enrollCount: number;
  attendedCount: number;
  remainingLessons: number;
  totalAmount: number;
  schedules: StudentSchedule[];
}
