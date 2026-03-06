import { useEffect, useMemo, useState } from 'react';
import { Button } from './components/ui/Button';
import { mockApi } from './lib/mockApi';
import { MasterTimetable } from './pages/MasterTimetable';
import { StudentDetail } from './pages/StudentDetail';
import { StudentList } from './pages/StudentList';
import type { AttendanceRecord, Student } from './types';

type View = 'list' | 'detail' | 'timetable';

function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const selectedStudent = useMemo(() => students.find((item) => item.id === selectedId) ?? null, [students, selectedId]);

  const filteredStudents = useMemo(
    () => students.filter((item) => `${item.name}${item.courseType}`.toLowerCase().includes(search.toLowerCase())),
    [students, search]
  );

  const reloadStudents = async () => {
    const result = await mockApi.getStudents();
    setStudents(result);
  };

  useEffect(() => {
    void reloadStudents();
  }, []);

  const openDetail = async (studentId: string) => {
    setSelectedId(studentId);
    setView('detail');
    const list = await mockApi.getAttendanceByStudent(studentId);
    setAttendance(list);
  };

  return (
    <div className="mx-auto min-h-screen max-w-6xl space-y-4 p-4">
      <header className="rounded-xl bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">学生管理系统（React 迁移版）</h1>
        <p className="text-sm text-slate-500">覆盖能力：学生列表、详情、签到、续费、全局课表。</p>
        <div className="mt-3 flex gap-2">
          <Button variant={view === 'list' ? 'primary' : 'secondary'} onClick={() => setView('list')}>学生列表</Button>
          <Button variant={view === 'timetable' ? 'primary' : 'secondary'} onClick={() => setView('timetable')}>全局课表</Button>
        </div>
      </header>

      {error && <p className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-600">{error}</p>}

      {view === 'list' && (
        <StudentList students={filteredStudents} search={search} setSearch={setSearch} onOpenDetail={(id) => void openDetail(id)} />
      )}

      {view === 'detail' && selectedStudent && (
        <StudentDetail
          student={selectedStudent}
          attendance={attendance}
          onBack={() => setView('list')}
          onCheckIn={async (date, time, content) => {
            try {
              setError('');
              await mockApi.checkIn(selectedStudent.id, { date, time, content });
              await reloadStudents();
              const records = await mockApi.getAttendanceByStudent(selectedStudent.id);
              setAttendance(records);
            } catch (err) {
              setError(err instanceof Error ? err.message : '签到失败');
            }
          }}
          onRenew={async (lessons, amount) => {
            try {
              setError('');
              await mockApi.renewLessons(selectedStudent.id, lessons, amount);
              await reloadStudents();
            } catch (err) {
              setError(err instanceof Error ? err.message : '续费失败');
            }
          }}
        />
      )}

      {view === 'timetable' && <MasterTimetable students={students} />}
    </div>
  );
}

export default App;
