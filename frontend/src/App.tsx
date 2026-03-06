import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './lib/api';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { StudentListPage } from './pages/StudentListPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { MasterTimetablePage } from './pages/MasterTimetablePage';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    api.me().then((res) => {
      setAuthed(Boolean(res.data.authenticated));
      setChecked(true);
    });
  }, []);

  if (!checked) return <p>Loading...</p>;

  if (!authed) {
    return (
      <main className="auth">
        <h1>登录</h1>
        <Input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input placeholder="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button
          onClick={async () => {
            await api.login(username, password);
            setAuthed(true);
          }}
        >
          登录
        </Button>
      </main>
    );
  }

  return (
    <main>
      <header className="topbar">
        <h1>Student Management</h1>
        <nav className="row">
          <Link to="/">学生列表</Link>
          <Link to="/master-timetable">全局课表</Link>
          <Button variant="secondary" onClick={async () => { await api.logout(); setAuthed(false); }}>退出</Button>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<StudentListPage />} />
        <Route path="/student/:id" element={<StudentDetailPage />} />
        <Route path="/master-timetable" element={<MasterTimetablePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
