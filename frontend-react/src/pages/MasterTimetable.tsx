import { Card } from '../components/ui/Card';
import type { Student } from '../types';

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

interface MasterTimetableProps {
  students: Student[];
}

export function MasterTimetable({ students }: MasterTimetableProps) {
  const flattened = students.flatMap((student) =>
    student.schedules.map((schedule) => ({
      id: `${student.id}-${schedule.id}`,
      studentName: student.name,
      weekday: schedule.weekday,
      timeRange: `${schedule.startTime}-${schedule.endTime}`,
      courseType: student.courseType
    }))
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">全局课表</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {weekdays.map((weekday, index) => (
          <Card key={weekday}>
            <h3 className="mb-2 font-semibold text-slate-800">{weekday}</h3>
            <div className="space-y-2 text-sm text-slate-700">
              {flattened
                .filter((item) => item.weekday === index + 1)
                .map((item) => (
                  <p key={item.id} className="rounded bg-slate-50 px-2 py-1">
                    {item.timeRange} · {item.studentName} ({item.courseType})
                  </p>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
