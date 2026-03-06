import { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { AttendanceRecord, Student } from '../types';

interface StudentDetailProps {
  student: Student;
  attendance: AttendanceRecord[];
  onBack: () => void;
  onCheckIn: (date: string, time: string, content: string) => Promise<void>;
  onRenew: (lessons: number, amount: number) => Promise<void>;
}

export function StudentDetail({ student, attendance, onBack, onCheckIn, onRenew }: StudentDetailProps) {
  const [checkInForm, setCheckInForm] = useState({ date: '', time: '', content: '' });
  const [renewForm, setRenewForm] = useState({ lessons: 10, amount: 0 });

  const scheduleText = useMemo(
    () => student.schedules.map((item) => `周${item.weekday} ${item.startTime}-${item.endTime}`).join('，'),
    [student.schedules]
  );

  return (
    <div className="space-y-4">
      <Button variant="secondary" onClick={onBack}>
        ← 返回列表
      </Button>
      <Card>
        <h2 className="mb-3 text-xl font-semibold text-slate-800">{student.name}</h2>
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <p>年龄：{student.age}</p>
          <p>课程：{student.courseType}</p>
          <p>总课时：{student.enrollCount}</p>
          <p>剩余课时：{student.remainingLessons}</p>
          <p className="md:col-span-2">固定课表：{scheduleText}</p>
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold">签到</h3>
        <form
          className="grid gap-2 md:grid-cols-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await onCheckIn(checkInForm.date, checkInForm.time, checkInForm.content);
            setCheckInForm({ date: '', time: '', content: '' });
          }}
        >
          <input className="rounded border border-slate-300 px-3 py-2" type="date" required value={checkInForm.date} onChange={(e) => setCheckInForm({ ...checkInForm, date: e.target.value })} />
          <input className="rounded border border-slate-300 px-3 py-2" type="time" required value={checkInForm.time} onChange={(e) => setCheckInForm({ ...checkInForm, time: e.target.value })} />
          <input className="rounded border border-slate-300 px-3 py-2" placeholder="课程内容" value={checkInForm.content} onChange={(e) => setCheckInForm({ ...checkInForm, content: e.target.value })} />
          <Button type="submit" disabled={student.remainingLessons <= 0}>提交签到</Button>
        </form>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold">续费</h3>
        <form
          className="grid gap-2 md:grid-cols-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await onRenew(renewForm.lessons, renewForm.amount);
          }}
        >
          <input className="rounded border border-slate-300 px-3 py-2" type="number" min={1} value={renewForm.lessons} onChange={(e) => setRenewForm({ ...renewForm, lessons: Number(e.target.value) })} />
          <input className="rounded border border-slate-300 px-3 py-2" type="number" min={0} value={renewForm.amount} onChange={(e) => setRenewForm({ ...renewForm, amount: Number(e.target.value) })} />
          <Button type="submit">提交续费</Button>
        </form>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold">签到记录</h3>
        <ul className="space-y-1 text-sm text-slate-700">
          {attendance.map((item) => (
            <li key={item.id} className="rounded bg-slate-50 px-2 py-1">
              {item.date} {item.time} · {item.content || '无内容'}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
