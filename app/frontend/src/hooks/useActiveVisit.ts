// ─────────────────────────────────────────────
//  useActiveVisit — 지금 진행 중인 치료 하나를 고른다
//  채팅·복약 체크·상태 기록은 모두 방문 기록 단위로 서버에 저장된다.
// ─────────────────────────────────────────────
import { useMemo } from 'react';
import { visitApi } from '../api/Client';
import type { VisitResponse } from '../types/Api';
import { useAsync } from './useAsync';

export interface ActiveVisitState {
  /** 진행 중인 치료. 없으면 가장 최근 방문, 그것도 없으면 null */
  visit: VisitResponse | null;
  /** 방문 전체 — 방문일 내림차순 (서버 정렬 그대로) */
  visits: VisitResponse[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useActiveVisit(): ActiveVisitState {
  const { data, loading, error, refresh } = useAsync(() => visitApi.getAll(), []);

  const visits = useMemo(() => data ?? [], [data]);

  const visit = useMemo(() => {
    if (visits.length === 0) return null;
    // 아직 끝나지 않은 치료가 우선. 목록은 방문일 내림차순이라 첫 번째가 가장 최근이다
    return visits.find((v) => v.treatmentStatus !== 'COMPLETED') ?? visits[0];
  }, [visits]);

  return { visit, visits, loading, error, refresh };
}
