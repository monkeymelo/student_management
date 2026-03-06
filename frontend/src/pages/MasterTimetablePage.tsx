import { addWeeks, format, startOfWeek } from 'date-fns';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { TimetableSession } from '../types';
import { Button } from '../components/ui/Button';

export function MasterTimetablePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [sessions, setSessions] = useState<TimetableSession[]>([]);

  useEffect(() => {
    api.getMasterTimetable(format(weekStart, 'yyyy-MM-dd')).then((res) => setSessions(res.data));
  }, [weekStart]);

  return (
    <section>
      <h2>全局课表</h2>
      <div className="row">
        <Button variant="secondary" onClick={() => setWeekStart((d) => addWeeks(d, -1))}>上一周</Button>
        <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>本周</Button>
        <Button variant="secondary" onClick={() => setWeekStart((d) => addWeeks(d, 1))}>下一周</Button>
        <span>{format(weekStart, 'yyyy-MM-dd')}</span>
      </div>
      <div className="card-list">
        {sessions.map((session) => (
          <article className="card" key={`${session.weekday}-${session.time_slot}`}>
            <h3>
              周{session.weekday} {session.time_slot}
            </h3>
            <p>
              到课 {session.today_checked_in}/{session.student_count}
            </p>
            <Button disabled={session.today_has_session}>
              {session.today_has_session ? '今日已签到' : '去签到'}
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
