import type { AttendanceRecord, Student } from '../types';

const STUDENT_KEY = 'react_students';
const ATTENDANCE_KEY = 'react_attendance';

const seedStudents: Student[] = [
  {
    id: 'stu-1',
    name: '林小雨',
    gender: 'female',
    age: 9,
    courseType: '创想课',
    enrollCount: 30,
    attendedCount: 8,
    remainingLessons: 22,
    totalAmount: 6800,
    schedules: [
      { id: 's1', weekday: 2, startTime: '19:00', endTime: '20:00' },
      { id: 's2', weekday: 6, startTime: '10:00', endTime: '11:30' }
    ]
  },
  {
    id: 'stu-2',
    name: '陈一鸣',
    gender: 'male',
    age: 11,
    courseType: '大师课',
    enrollCount: 20,
    attendedCount: 19,
    remainingLessons: 1,
    totalAmount: 8800,
    schedules: [{ id: 's3', weekday: 7, startTime: '14:00', endTime: '15:30' }]
  }
];

const seedAttendance: AttendanceRecord[] = [
  { id: 'att-1', studentId: 'stu-1', date: '2026-03-01', time: '19:05', content: '线条练习' },
  { id: 'att-2', studentId: 'stu-1', date: '2026-03-03', time: '10:02', content: '色彩入门' },
  { id: 'att-3', studentId: 'stu-2', date: '2026-03-02', time: '14:01', content: '风景构图' }
];

function load<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function initStorage() {
  if (!localStorage.getItem(STUDENT_KEY)) save(STUDENT_KEY, seedStudents);
  if (!localStorage.getItem(ATTENDANCE_KEY)) save(ATTENDANCE_KEY, seedAttendance);
}

export const mockApi = {
  async getStudents() {
    initStorage();
    return load<Student[]>(STUDENT_KEY, seedStudents);
  },
  async getStudentById(studentId: string) {
    const students = await this.getStudents();
    return students.find((item) => item.id === studentId) ?? null;
  },
  async getAttendanceByStudent(studentId: string) {
    initStorage();
    const attendance = load<AttendanceRecord[]>(ATTENDANCE_KEY, seedAttendance);
    return attendance.filter((item) => item.studentId === studentId);
  },
  async checkIn(studentId: string, payload: Pick<AttendanceRecord, 'date' | 'time' | 'content'>) {
    const students = await this.getStudents();
    const target = students.find((item) => item.id === studentId);
    if (!target) throw new Error('学生不存在');
    if (target.remainingLessons <= 0) throw new Error('剩余课时不足，无法签到');

    const nextStudents = students.map((item) =>
      item.id === studentId
        ? { ...item, attendedCount: item.attendedCount + 1, remainingLessons: item.remainingLessons - 1 }
        : item
    );
    save(STUDENT_KEY, nextStudents);

    const attendance = load<AttendanceRecord[]>(ATTENDANCE_KEY, seedAttendance);
    const nextAttendance = [
      ...attendance,
      { id: `att-${Date.now()}`, studentId, date: payload.date, time: payload.time, content: payload.content }
    ];
    save(ATTENDANCE_KEY, nextAttendance);
  },
  async renewLessons(studentId: string, lessons: number, amount: number) {
    if (lessons <= 0) throw new Error('续费课时必须大于 0');

    const students = await this.getStudents();
    const nextStudents = students.map((item) =>
      item.id === studentId
        ? {
            ...item,
            enrollCount: item.enrollCount + lessons,
            remainingLessons: item.remainingLessons + lessons,
            totalAmount: item.totalAmount + amount
          }
        : item
    );
    save(STUDENT_KEY, nextStudents);
  }
};
