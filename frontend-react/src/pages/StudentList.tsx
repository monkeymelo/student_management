import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { Student } from '../types';

interface StudentListProps {
  students: Student[];
  search: string;
  setSearch: (value: string) => void;
  onOpenDetail: (studentId: string) => void;
}

export function StudentList({ students, search, setSearch, onOpenDetail }: StudentListProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-slate-800">学生列表</h2>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-300 focus:ring sm:w-80"
          value={search}
          placeholder="搜索姓名或课程种类"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {students.map((student) => (
          <Card key={student.id}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">{student.name}</h3>
                <Badge>{student.courseType}</Badge>
              </div>
              <p className="text-sm text-slate-600">
                已上 {student.attendedCount} / 共 {student.enrollCount} 节，剩余 {student.remainingLessons} 节
              </p>
              <Button className="w-full" onClick={() => onOpenDetail(student.id)}>
                查看详情
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
