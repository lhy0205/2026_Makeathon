import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../api/client';
import type { ActivityType, AdminUserVisit } from '../api/types';
import { Badge, Bar, Card, ErrorState, Loading, PageHeader, Stat } from '../components/ui';
import { date, dateTime, relativeTime, treatmentStatus } from '../format';
import { useAsync } from '../useAsync';
import './UserDetailPage.css';

/** 활동 종류마다 아이콘과 색을 달리해 타임라인이 훑어지도록 */
const ACTIVITY_STYLE: Record<ActivityType, { icon: string; tone: string; label: string }> = {
  DOSE: { icon: '💊', tone: 'dose', label: '복약' },
  HEALTH_LOG: { icon: '📝', tone: 'log', label: '상태 기록' },
  CHAT: { icon: '💬', tone: 'chat', label: '챗봇' },
  REPORT: { icon: '📋', tone: 'report', label: '리포트' },
  INTERACTION: { icon: '⚠️', tone: 'warn', label: '상호작용' },
};

function statusTone(status: string) {
  if (status === 'COMPLETED') return 'good' as const;
  if (status === 'IN_PROGRESS') return 'info' as const;
  return 'neutral' as const;
}

function VisitCard({ visit }: { visit: AdminUserVisit }) {
  const recorded = visit.doseTaken + visit.doseSkipped + visit.doseMissed;
  const adherence = recorded > 0 ? Math.round((visit.doseTaken / recorded) * 1000) / 10 : 0;

  return (
    <article className="visit">
      <header className="visit-head">
        <div>
          <h3 className="visit-title">
            {visit.hospitalName}
            {visit.departmentName && <span className="visit-dept"> · {visit.departmentName}</span>}
          </h3>
          <p className="visit-meta">
            {date(visit.visitedAt)}
            {visit.visitReason && ` · ${visit.visitReason}`}
          </p>
        </div>
        <Badge tone={statusTone(visit.treatmentStatus)}>
          {treatmentStatus(visit.treatmentStatus)}
        </Badge>
      </header>

      {visit.medicationNames.length > 0 && (
        <div className="med-chips">
          {visit.medicationNames.map((name, i) => (
            <span key={`${name}-${i}`} className="med-chip">{name}</span>
          ))}
          {visit.unmatchedMedicationCount > 0 && (
            <Badge tone="warn">미매칭 {visit.unmatchedMedicationCount}</Badge>
          )}
        </div>
      )}

      {visit.medicationStartDate && visit.medicationEndDate && (
        <p className="visit-period">
          복약 {date(visit.medicationStartDate)} ~ {date(visit.medicationEndDate)}
        </p>
      )}

      {visit.doseTotal > 0 && (
        <div className="visit-dose">
          <div className="visit-dose-head">
            <span className="visit-dose-label">복약</span>
            <span className="num visit-dose-value">
              {adherence}%
              <span className="muted"> · 복용 {visit.doseTaken} / 건너뜀 {visit.doseSkipped} / 누락 {visit.doseMissed} / 전체 {visit.doseTotal}</span>
            </span>
          </div>
          <Bar percent={adherence} tone={adherence < 50 ? 'warn' : 'default'} />
        </div>
      )}

      <footer className="visit-foot">
        <span>상태 기록 <b className="num">{visit.healthLogCount}</b></span>
        <span>챗봇 <b className="num">{visit.chatMessageCount}</b></span>
        <span>리포트 <b className="num">{visit.reportCount}</b></span>
      </footer>
    </article>
  );
}

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const id = Number(userId);

  const { data, loading, error, refresh } = useAsync(
    () => adminApi.user(id),
    [id],
  );

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return null;

  const { summary, visits, recentActivity } = data;

  return (
    <>
      <Link to="/users" className="back-link">← 사용자 목록</Link>

      <PageHeader
        title={summary.nickname}
        description={`${summary.email} · ${date(summary.joinedAt.slice(0, 10))} 가입 · 마지막 활동 ${relativeTime(summary.lastActiveAt)}`}
        action={
          summary.interactionWarningCount > 0 ? (
            <Badge tone="bad">상호작용 경고 {summary.interactionWarningCount}건</Badge>
          ) : undefined
        }
      />

      <div className="stat-row">
        <Stat label="치료" value={summary.visitCount} unit="건" hint={`약 ${summary.medicationCount}종`} />
        <Stat
          label="복약률"
          value={summary.adherenceRate}
          unit="%"
          hint={`${summary.doseTaken} / ${summary.doseTotal}회`}
          tone={summary.doseTotal === 0 ? 'default' : summary.adherenceRate >= 80 ? 'good' : summary.adherenceRate >= 50 ? 'warn' : 'bad'}
        />
        <Stat label="상태 기록" value={summary.healthLogCount} unit="건" />
        <Stat label="챗봇 대화" value={summary.chatMessageCount} unit="건" hint={`리포트 ${summary.reportCount}건`} />
      </div>

      <div className="detail-grid section-gap">
        <div>
          <h2 className="section-title">치료 기록</h2>
          {visits.length === 0 ? (
            <Card><p className="state-text">등록한 처방전이 없습니다.</p></Card>
          ) : (
            <div className="visit-list">
              {visits.map((visit) => <VisitCard key={visit.visitId} visit={visit} />)}
            </div>
          )}
        </div>

        <div>
          <h2 className="section-title">최근 활동</h2>
          <Card>
            {recentActivity.length === 0 ? (
              <p className="state-text">아직 활동 기록이 없습니다.</p>
            ) : (
              <ol className="timeline">
                {recentActivity.map((item, index) => {
                  const style = ACTIVITY_STYLE[item.type];
                  return (
                    <li key={`${item.at}-${index}`} className="timeline-item">
                      <span className={`timeline-icon tone-${style.tone}`} aria-hidden>
                        {style.icon}
                      </span>
                      <div className="timeline-body">
                        <p className="timeline-summary">{item.summary}</p>
                        <p className="timeline-time">
                          {style.label} · {dateTime(item.at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
          <p className="privacy-note">
            증상·메모 같은 건강 기록의 내용은 관리자에게 보이지 않습니다.
            운영에 필요한 건 사용량이지 개인의 건강 상태가 아닙니다.
          </p>
        </div>
      </div>
    </>
  );
}
