// ─────────────────────────────────────────────
//  화면들이 함께 쓰는 조각들
//  앱과 같은 토큰(theme.css)만 써서 두 화면이 한 제품으로 보이게 한다.
// ─────────────────────────────────────────────
import type { ReactNode } from 'react';
import './ui.css';

// ── 상태 ─────────────────────────────────────

export function Loading({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div className="state">
      <div className="spinner" aria-hidden />
      <p className="state-text">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state">
      <p className="state-text state-error">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="state">
      <p className="state-title">{title}</p>
      {hint && <p className="state-text">{hint}</p>}
    </div>
  );
}

// ── 레이아웃 ─────────────────────────────────

export function PageHeader({
  title, description, action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-desc">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({
  title, action, children, className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          {title && <h2 className="card-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// ── 수치 ─────────────────────────────────────

export function Stat({
  label, value, unit, hint, tone = 'default',
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className={`stat-value num tone-${tone}`}>
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </p>
      {hint && <p className="stat-hint">{hint}</p>}
    </div>
  );
}

/** 값의 상태를 형태로도 읽히게 한다 — 색만으로 구분하지 않는다 */
export function Badge({
  children, tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'info' | 'good' | 'warn' | 'bad';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Bar({ percent, tone = 'default' }: { percent: number; tone?: 'default' | 'warn' }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="bar" role="img" aria-label={`${clamped}%`}>
      <div className={`bar-fill bar-${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

// ── 표 ───────────────────────────────────────

export function TableWrap({ children }: { children: ReactNode }) {
  // 넓은 표는 제 안에서만 가로로 스크롤한다. 페이지가 흔들리지 않게
  return <div className="table-wrap">{children}</div>;
}
