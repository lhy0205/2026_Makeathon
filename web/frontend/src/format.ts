// ─────────────────────────────────────────────
//  표시용 포맷
//  서버는 LocalDate를 'YYYY-MM-DD', LocalDateTime을 'YYYY-MM-DDTHH:mm:ss'로 준다.
//  둘 다 시간대 정보가 없으므로 Date로 넘길 때 UTC로 해석되지 않게 주의한다.
// ─────────────────────────────────────────────

/** 'YYYY-MM-DDTHH:mm:ss' → 로컬 Date (뒤에 Z가 없으니 로컬로 읽힌다) */
function parse(iso: string): Date {
  return new Date(iso);
}

/** '2026-08-26T14:03:00' → '8월 26일 오후 2:03' */
export function dateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = parse(iso);
  const hour = d.getHours();
  const suffix = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${suffix} ${h12}:${minute}`;
}

/** '2026-08-26' → '2026. 8. 26.' */
export function date(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${y}. ${Number(m)}. ${Number(d)}.`;
}

/** 방금 / N분 전 / N시간 전 / N일 전 / 날짜 */
export function relativeTime(iso: string | null): string {
  if (!iso) return '활동 없음';

  const diffMs = Date.now() - parse(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  return date(iso.slice(0, 10));
}

const STATUS_LABEL: Record<string, string> = {
  REGISTERED: '예약',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
};

export function treatmentStatus(status: string): string {
  return STATUS_LABEL[status] ?? status;
}
