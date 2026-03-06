export type Gender = 'male' | 'female' | 'other';

export interface StudentSchedule {
  id: number;
  student_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: number;
  name: string;
  gender: Gender;
  age: number;
  course_type: string;
  enroll_count: number;
  total_amount: number;
  attended_count: number;
  remaining_lessons: number;
  remark: string;
  schedules: StudentSchedule[];
}

export interface Attendance {
  id: number;
  student_id: number;
  class_date: string;
  class_time: string;
  status: 'present' | 'absent';
  session_id: number | null;
  class_content: string;
  signed_at: string;
}

export interface TimetableStudent {
  id: number;
  name: string;
}

export interface TimetableSession {
  weekday: number;
  time_slot: string;
  start_time: string;
  end_time: string;
  student_count: number;
  today_checked_in: number;
  today_has_session: boolean;
  students: TimetableStudent[];
}

export interface DueStudent {
  id: number;
  name: string;
  remaining_lessons: number;
}
