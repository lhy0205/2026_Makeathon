// ─────────────────────────────────────────────
//  날짜·시간 포맷
//  서버는 Jackson 기본 설정이라 LocalDate는 'YYYY-MM-DD',
//  LocalDateTime은 'YYYY-MM-DDTHH:mm:ss' 문자열을 받는다.
//  toISOString()은 UTC로 밀어버리므로 쓰지 않는다 — 한국 시간 기준으로 그대로 만든다.
// ─────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

/** Date → 'YYYY-MM-DD' */
export function toLocalDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date → 'YYYY-MM-DDTHH:mm:ss' */
export function toLocalDateTime(d: Date = new Date()): string {
  return `${toLocalDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Date → 'HH:mm:ss' */
export function toLocalTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 'YYYY-MM-DD' 에 일수를 더한다 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toLocalDate(date);
}

/** 자정으로 맞춘 오늘 */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** '2024-11-11T08:00:00' → '오전 8:00' */
export function toClockLabel(isoLike: string): string {
  const time = isoLike.includes('T') ? isoLike.split('T')[1] : isoLike;
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const suffix = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${suffix} ${h12}:${mStr}`;
}

/** '2024-11-11' → '11월 11일' */
export function toDayLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

/**
 * 하루 복용 횟수 → 복약 시간대.
 * 서버 CreateDosesRequest.times 에 그대로 넣는다.
 */
export function defaultDoseTimes(frequencyPerDay: number): string[] {
  switch (frequencyPerDay) {
    case 1: return ['08:00:00'];
    case 2: return ['08:00:00', '20:00:00'];
    case 3: return ['08:00:00', '13:00:00', '19:00:00'];
    case 4: return ['08:00:00', '12:00:00', '18:00:00', '22:00:00'];
    default: {
      // 그 외에는 아침 8시부터 밤 10시 사이를 균등하게 나눈다
      const span = 14;
      const gap = span / Math.max(1, frequencyPerDay - 1);
      return Array.from({ length: frequencyPerDay }, (_, i) => {
        const hour = Math.round(8 + gap * i);
        return `${pad(Math.min(23, hour))}:00:00`;
      });
    }
  }
}

/** 복약 시간(HH:mm:ss) → '아침' / '점심' / '저녁' / '자기전' */
export function toPeriodLabel(isoLike: string): '아침' | '점심' | '저녁' | '자기전' {
  const time = isoLike.includes('T') ? isoLike.split('T')[1] : isoLike;
  const hour = Number(time.split(':')[0]);
  if (hour < 11) return '아침';
  if (hour < 16) return '점심';
  if (hour < 21) return '저녁';
  return '자기전';
}
