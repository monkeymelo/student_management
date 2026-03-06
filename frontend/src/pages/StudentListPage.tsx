import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import type { Student } from '../types';
import { Input } from '../components/ui/Input';

export function StudentListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    api.getStudents().then((res) => setStudents(res.data));
  }, []);

  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    if (!lower) return students;
    return students.filter((s) => s.name.toLowerCase().includes(lower) || s.course_type.toLowerCase().includes(lower));
  }, [keyword, students]);

  return (
    <section>
      <h2>学生列表</h2>
      <div className="search-row">
        <Search size={16} />
        <Input placeholder="搜索姓名或课程" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </div>
      <div className="card-list">
        {filtered.map((student) => {
          const progress = student.enroll_count > 0 ? (student.attended_count / student.enroll_count) * 100 : 0;
          return (
            <Link to={`/student/${student.id}`} key={student.id} className="card student-card">
              <div>
                <h3>{student.name}</h3>
                <p>{student.course_type}</p>
              </div>
              <div className="progress-wrap">
                <strong>
                  {student.attended_count}/{student.enroll_count}
                </strong>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
                <small>剩余 {student.remaining_lessons} 节</small>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
