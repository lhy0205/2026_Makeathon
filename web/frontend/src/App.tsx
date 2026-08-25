import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Loading } from './components/ui';
import './App.css';
import DashboardPage from './pages/DashboardPage';
import KnowledgePage from './pages/KnowledgePage';
import LoginPage from './pages/LoginPage';
import OcrFailuresPage from './pages/OcrFailuresPage';
import UserDetailPage from './pages/UserDetailPage';
import UsersPage from './pages/UsersPage';

const NAV = [
  { to: '/', label: '대시보드', icon: '▤', end: true },
  { to: '/users', label: '사용자', icon: '◍', end: false },
  { to: '/knowledge', label: '지식베이스', icon: '❖', end: false },
  { to: '/ocr-failures', label: 'OCR 실패', icon: '⚠', end: false },
];

function Shell() {
  const { admin, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">💊</span>
          <div>
            <p className="brand-name">Medi-Self</p>
            <p className="brand-sub">관리자</p>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                // 사용자 상세에서도 '사용자' 항목이 켜져 있어야 길을 잃지 않는다
                `nav-item${isActive || (item.to !== '/' && location.pathname.startsWith(item.to)) ? ' active' : ''}`
              }
            >
              <span className="nav-icon" aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <p className="admin-name">{admin?.nickname}</p>
          <p className="admin-email">{admin?.email}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            로그아웃
          </button>
        </div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:userId" element={<UserDetailPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/ocr-failures" element={<OcrFailuresPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { admin, restoring } = useAuth();

  if (restoring) return <Loading label="세션을 확인하는 중…" />;
  if (!admin) return <LoginPage />;

  return <Shell />;
}
