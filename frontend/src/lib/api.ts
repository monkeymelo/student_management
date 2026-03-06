import type { Attendance, DueStudent, Student, TimetableSession } from '../types';

type ApiResponse<T> = { code: string; data: T; message?: string };

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || json?.code || 'Request failed');
  }
  return json as T;
}

export const api = {
  me: async () => request<ApiResponse<{ authenticated: boolean; username?: string }>>('/api/auth/me'),
  login: async (username: string, password: string) =>
    request<ApiResponse<{ username: string }>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  logout: async () => request<ApiResponse<null>>('/api/auth/logout', { method: 'POST' }),

  getStudents: async () => request<ApiResponse<Student[]>>('/api/students'),
  getStudentById: async (id: string) => request<ApiResponse<Student>>(`/api/students/${id}`),
  getAttendance: async (studentId?: number) => {
    const query = studentId ? `?student_id=${studentId}` : '';
    return request<ApiResponse<Attendance[]>>(`/api/attendance${query}`);
  },
  checkIn: async (payload: { student_id: number; date: string; time: string; content: string }) =>
    request<ApiResponse<{ student: Student; attendance: Attendance }>>('/api/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getMasterTimetable: async (weekStart?: string) => {
    const query = weekStart ? `?week_start=${weekStart}` : '';
    return request<ApiResponse<TimetableSession[]>>(`/api/timetable/master${query}`);
  },
  getDueStudents: async (payload: { weekday: number; start_time: string; end_time: string }) =>
    request<ApiResponse<DueStudent[]>>(
      `/api/timetable/due-students?weekday=${payload.weekday}&start_time=${payload.start_time}&end_time=${payload.end_time}`
    )
};
