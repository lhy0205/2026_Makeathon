// ─────────────────────────────────────────────
//  useCalendar — 월별 방문 데이터 fetch
// ─────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { visitApi } from '../api/Client';
import type { VisitResponse } from '../types/Api';

export interface CalendarState {
  visits: VisitResponse[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCalendar(year: number, month: number): CalendarState {
  const [visits, setVisits] = useState<VisitResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await visitApi.getCalendar(year, month);
      setVisits(data);
    } catch (e: any) {
      setError(e.message ?? '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetch(); }, [fetch]);

  return { visits, loading, error, refresh: fetch };
}

// VisitResponse[] → 날짜별 맵으로 변환
// key: 'YYYY-MM-DD', value: VisitResponse
export function groupVisitsByDate(visits: VisitResponse[]): Record<string, VisitResponse[]> {
  return visits.reduce<Record<string, VisitResponse[]>>((acc, visit) => {
    const date = visit.visitedAt.slice(0, 10); // 'YYYY-MM-DD'
    if (!acc[date]) acc[date] = [];
    acc[date].push(visit);
    return acc;
  }, {});
}

// 치료 상태 → 형광펜 색상
export function getHighlightColor(status: VisitResponse['treatmentStatus']): string {
  switch (status) {
    case 'IN_PROGRESS': return '#FFE066'; // 노랑 — 진행 중
    case 'COMPLETED':   return '#B8F5B0'; // 연초록 — 완료
    case 'REGISTERED':  return '#C8E6FF'; // 연파랑 — 예약
    default:            return '#FFE066';
  }
}
