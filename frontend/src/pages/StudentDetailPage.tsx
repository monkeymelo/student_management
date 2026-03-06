import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Attendance, Student } from '../types';
import { Button } from '../components/ui/Button';

export function StudentDetailPage() {
  const { id = '' } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const refresh = async () => {
    const [studentRes, attendanceRes] = await Promise.all([api.getStudentById(id), api.getAttendance(Number(id))]);
    setStudent(studentRes.data);
    setAttendance(attendanceRes.data);
  };

  useEffect(() => {
    void refresh();
  }, [id]);

  const canCheckin = useMemo(() => (student ? student.remaining_lessons > 0 : false), [student]);

  async function handleCheckIn() {
    if (!student) return;
    await api.checkIn({
      student_id: student.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm:ss'),
      content: '常规签到'
    });
    await refresh();
  }

  if (!student) return <p>加载中...</p>;

  return (
    <section>
      <h2>{student.name}</h2>
      <p>
        {student.course_type} / 已上 {student.attended_count} / 剩余 {student.remaining_lessons}
      </p>
      <div className="row">
        <Button onClick={handleCheckIn} disabled={!canCheckin}>
          {canCheckin ? '签到' : '课时已用尽'}
        </Button>
      </div>
      <h3>排课</h3>
      <ul>
        {student.schedules.map((s) => (
          <li key={s.id}>
            周{s.weekday} {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}
          </li>
        ))}
      </ul>
      <h3>签到记录</h3>
      <ul>
        {attendance.map((a) => (
          <li key={a.id}>
            {a.class_date} {a.class_time} {a.status}
          </li>
        ))}
      </ul>
    </section>
  );
}
