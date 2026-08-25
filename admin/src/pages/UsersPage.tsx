import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/client';
import { Badge, Bar, ErrorState, Loading, PageHeader, TableWrap } from '../components/ui';
import { useAsync } from '../useAsync';
import { relativeTime } from '../format';
import './UsersPage.css';

export default function UsersPage() {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAsync(() => adminApi.users(), []);
  const [query, setQuery] = useState('');

  const users = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) => u.nickname.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [data, query]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <>
      <PageHeader
        title="사용자"
        description="각 사용자가 앱에서 무엇을 했는지 봅니다. 마지막 활동이 최근인 순서입니다."
        action={
          <input
            className="input search"
            placeholder="닉네임 또는 이메일 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="사용자 검색"
          />
        }
      />

      {users.length === 0 ? (
        <p className="state-text">조건에 맞는 사용자가 없습니다.</p>
      ) : (
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th scope="col">사용자</th>
                <th scope="col">치료</th>
                <th scope="col">약</th>
                <th scope="col">복약</th>
                <th scope="col" className="right">상태 기록</th>
                <th scope="col" className="right">챗봇</th>
                <th scope="col" className="right">리포트</th>
                <th scope="col">마지막 활동</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="clickable"
                  onClick={() => navigate(`/users/${user.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/users/${user.id}`);
                  }}
                >
                  <td>
                    <div className="user-cell">
                      <span className="avatar" aria-hidden>{user.nickname.slice(0, 1)}</span>
                      <div>
                        <p className="user-name">
                          {user.nickname}
                          {user.role === 'ADMIN' && <Badge tone="info">관리자</Badge>}
                          {user.interactionWarningCount > 0 && (
                            <Badge tone="bad">경고 {user.interactionWarningCount}</Badge>
                          )}
                        </p>
                        <p className="user-email">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="num">{user.visitCount}건</td>
                  <td className="num">{user.medicationCount}종</td>

                  <td>
                    {user.doseTotal === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      <div className="dose-cell">
                        <Bar
                          percent={user.adherenceRate}
                          tone={user.adherenceRate < 50 ? 'warn' : 'default'}
                        />
                        <span className="dose-text num">
                          {user.adherenceRate}%
                          <span className="muted"> ({user.doseTaken}/{user.doseTotal})</span>
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="right num">{user.healthLogCount}</td>
                  <td className="right num">{user.chatMessageCount}</td>
                  <td className="right num">{user.reportCount}</td>

                  <td className="muted">{relativeTime(user.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
