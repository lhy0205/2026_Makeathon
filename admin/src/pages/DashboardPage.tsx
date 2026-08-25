import { Link } from 'react-router-dom';
import {
  Bar as RBar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { adminApi } from '../api/client';
import { Bar, Card, ErrorState, Loading, PageHeader, Stat } from '../components/ui';
import { useAsync } from '../useAsync';

/** 낮을수록 좋은 지표(OCR 실패율)의 색을 정한다 */
function failureTone(rate: number) {
  if (rate <= 10) return 'good' as const;
  if (rate <= 30) return 'warn' as const;
  return 'bad' as const;
}

function adherenceTone(rate: number) {
  if (rate >= 80) return 'good' as const;
  if (rate >= 50) return 'warn' as const;
  return 'bad' as const;
}

export default function DashboardPage() {
  const dashboard = useAsync(() => adminApi.dashboard(), []);
  const users = useAsync(() => adminApi.users(), []);
  const failures = useAsync(() => adminApi.ocrFailures(), []);

  const loading = dashboard.loading || users.loading || failures.loading;
  const error = dashboard.error ?? users.error ?? failures.error;

  if (loading) return <Loading />;
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          void dashboard.refresh();
          void users.refresh();
          void failures.refresh();
        }}
      />
    );
  }

  const stats = dashboard.data;
  const userList = users.data ?? [];
  const failureList = failures.data ?? [];

  // 매칭에 실패한 약품명을 잦은 순으로 — 지식베이스에 무엇을 채워야 하는지 알려준다
  const failureCounts = new Map<string, number>();
  for (const item of failureList) {
    failureCounts.set(item.medicationName, (failureCounts.get(item.medicationName) ?? 0) + 1);
  }
  const topFailures = [...failureCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // 복약률 분포 — 평균 하나만 보면 잘 쓰는 사람과 안 쓰는 사람이 섞여 보인다
  const buckets = [
    { label: '0–20%', min: 0, max: 20, count: 0 },
    { label: '21–40%', min: 21, max: 40, count: 0 },
    { label: '41–60%', min: 41, max: 60, count: 0 },
    { label: '61–80%', min: 61, max: 80, count: 0 },
    { label: '81–100%', min: 81, max: 100, count: 0 },
  ];
  for (const user of userList) {
    if (user.doseTotal === 0) continue;
    const bucket = buckets.find((b) => user.adherenceRate >= b.min && user.adherenceRate <= b.max);
    if (bucket) bucket.count += 1;
  }

  const activeUsers = userList.filter((u) => u.lastActiveAt).length;
  const warningUsers = userList.filter((u) => u.interactionWarningCount > 0).length;

  return (
    <>
      <PageHeader
        title="대시보드"
        description="서비스가 실제로 어떻게 쓰이고 있는지 한눈에 봅니다."
      />

      <div className="stat-row">
        <Stat
          label="가입자"
          value={stats?.userCount ?? 0}
          unit="명"
          hint={`활동 기록이 있는 사용자 ${activeUsers}명`}
        />
        <Stat
          label="등록된 처방전"
          value={stats?.prescriptionCount ?? 0}
          unit="건"
        />
        <Stat
          label="평균 복약률"
          value={stats?.averageAdherenceRate ?? 0}
          unit="%"
          hint="기록한 일정 중 복용 비율"
          tone={adherenceTone(stats?.averageAdherenceRate ?? 0)}
        />
        <Stat
          label="OCR 매칭 실패율"
          value={stats?.ocrUnmatchedRate ?? 0}
          unit="%"
          hint={`실패한 약 ${failureList.length}건`}
          tone={failureTone(stats?.ocrUnmatchedRate ?? 0)}
        />
      </div>

      <div className="grid-2 section-gap">
        <Card
          title="복약률 분포"
          action={<Link className="btn btn-ghost btn-sm" to="/users">사용자 보기</Link>}
        >
          {userList.every((u) => u.doseTotal === 0) ? (
            <p className="state-text">아직 복약 일정을 만든 사용자가 없습니다.</p>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--primary-tint)' }}
                    contentStyle={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`${value}명`, '사용자']}
                  />
                  <RBar dataKey="count" radius={[6, 6, 0, 0]}>
                    {buckets.map((bucket) => (
                      <Cell
                        key={bucket.label}
                        // 낮은 복약률 구간은 주의해서 봐야 한다
                        fill={bucket.max <= 40 ? 'var(--warning)' : 'var(--primary)'}
                      />
                    ))}
                  </RBar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card
          title="지식베이스에 없는 약"
          action={<Link className="btn btn-ghost btn-sm" to="/ocr-failures">전체 보기</Link>}
        >
          {topFailures.length === 0 ? (
            <p className="state-text">매칭에 실패한 약이 없습니다.</p>
          ) : (
            <ul className="failure-list">
              {topFailures.map((item) => (
                <li key={item.name} className="failure-item">
                  <span className="failure-name">{item.name}</span>
                  <Bar
                    percent={(item.count / topFailures[0].count) * 100}
                    tone="warn"
                  />
                  <span className="failure-count num">{item.count}건</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {warningUsers > 0 && (
        <Card className="section-gap" title="확인이 필요한 사용자">
          <p className="state-text" style={{ padding: 0, textAlign: 'left' }}>
            약물 상호작용 경고가 있는 사용자가 <strong>{warningUsers}명</strong> 있습니다.
            사용자 목록에서 경고 표시를 확인하세요.
          </p>
        </Card>
      )}
    </>
  );
}
