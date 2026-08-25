// ─────────────────────────────────────────────
//  useHealthLogDay — 하루치 건강 기록 읽기/저장
//  서버에 '날짜로 조회'가 없어서 방문 단위 목록을 받아 해당 날짜를 골라낸다.
//  같은 날 기록이 이미 있으면 새로 만들지 않고 고친다.
// ─────────────────────────────────────────────
import { useCallback, useMemo } from 'react';
import { healthLogApi } from '../api/Client';
import type { HealthLogRequest, HealthLogResponse } from '../types/Api';
import { toLocalDateTime } from '../utils/datetime';
import { useAsync } from './useAsync';

/** 화면이 다루는 하루치 값 — recordedAt은 저장할 때 채운다 */
export type DayLogInput = Omit<HealthLogRequest, 'recordedAt'>;

export function useHealthLogDay(visitId: number | null, date: string) {
  const { data, loading, error, refresh } = useAsync(
    async () => (visitId == null ? null : healthLogApi.getByVisit(visitId)),
    [visitId],
    { enabled: visitId != null },
  );

  const logs = useMemo(() => data ?? [], [data]);

  /** 그 날짜에 이미 남긴 기록 */
  const log = useMemo<HealthLogResponse | null>(
    () => logs.find((l) => l.recordedAt.slice(0, 10) === date) ?? null,
    [logs, date],
  );

  const save = useCallback(async (input: DayLogInput): Promise<HealthLogResponse> => {
    if (visitId == null) throw new Error('저장할 치료 기록이 없습니다.');

    // 그 날 기록은 하루에 한 건으로 본다. 시각은 저장 시점을 쓴다
    const body: HealthLogRequest = { ...input, recordedAt: toLocalDateTime() };

    const saved = log
      ? await healthLogApi.update(log.id, body)
      : await healthLogApi.create(visitId, body);

    await refresh();
    return saved;
  }, [visitId, log, refresh]);

  return { log, logs, loading, error, refresh, save };
}
