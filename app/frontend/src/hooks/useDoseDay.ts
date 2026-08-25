// ─────────────────────────────────────────────
//  useDoseDay — 하루치 복약 일정과 체크 동작
//
//  연결이 끊긴 상태에서 누른 체크는 기기에 쌓아 두고(doseQueue)
//  앱이 다시 앞으로 나올 때 보낸다. 지하철에서 누른 게 사라지면 안 된다.
// ─────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { doseApi } from '../api/Client';
import { enqueue, flush, isOffline, pendingForDate } from '../state/doseQueue';
import type { DoseStatus, MedicationDoseResponse } from '../types/Api';
import { toLocalDateTime, toPeriodLabel } from '../utils/datetime';
import { useAsync } from './useAsync';

export type Period = '아침' | '점심' | '저녁' | '자기전';

const PERIOD_ORDER: Period[] = ['아침', '점심', '저녁', '자기전'];

export interface DosePeriodGroup {
  period: Period;
  doses: MedicationDoseResponse[];
}

export function useDoseDay(date: string) {
  const { data, loading, error, refresh, setData } = useAsync(
    () => doseApi.getByDate(date),
    [date],
  );

  /** 아직 서버에 못 보낸 체크 수 — 화면이 '동기화 대기'로 알려준다 */
  const [queued, setQueued] = useState(0);

  const syncQueued = useCallback(async () => {
    setQueued((await pendingForDate(date)).length);
  }, [date]);

  useEffect(() => { void syncQueued(); }, [syncQueued]);

  // 앱이 다시 앞으로 나오면 쌓인 걸 보낸다. 그때가 보통 연결이 돌아온 시점이다
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void (async () => {
        const result = await flush();
        if (result.sent > 0) await refresh();
        await syncQueued();
      })();
    });
    return () => sub.remove();
  }, [refresh, syncQueued]);

  const doses = useMemo(() => data ?? [], [data]);

  /** 복용 시간대별로 묶는다 — 화면이 아침/점심/저녁/자기전으로 나눠 보여준다 */
  const groups = useMemo<DosePeriodGroup[]>(() => {
    const byPeriod = new Map<Period, MedicationDoseResponse[]>();
    for (const dose of doses) {
      const period = toPeriodLabel(dose.scheduledAt);
      if (!byPeriod.has(period)) byPeriod.set(period, []);
      byPeriod.get(period)!.push(dose);
    }
    return PERIOD_ORDER
      .filter((p) => byPeriod.has(p))
      .map((period) => ({
        period,
        doses: byPeriod.get(period)!.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
      }));
  }, [doses]);

  /** 화면을 먼저 바꾸고 서버에 보낸다. 실패하면 되돌린다 */
  const applyLocal = useCallback((doseIds: number[], status: DoseStatus, takenAt: string) => {
    setData((prev) =>
      (prev ?? []).map((d) =>
        doseIds.includes(d.id)
          ? { ...d, doseStatus: status, takenAt: status === 'TAKEN' ? takenAt : null }
          : d,
      ),
    );
  }, [setData]);

  const mark = useCallback(async (doseIds: number[], status: Exclude<DoseStatus, 'PENDING'>) => {
    if (doseIds.length === 0) return;

    const snapshot = data;
    const takenAt = toLocalDateTime();
    applyLocal(doseIds, status, takenAt);

    try {
      await Promise.all(doseIds.map((id) => (
        status === 'TAKEN'
          ? doseApi.markTaken(id, takenAt)
          : doseApi.markSkipped(id)
      )));
      // 서버가 계산한 값을 다시 받아온다
      await refresh();
    } catch (e) {
      if (isOffline(e)) {
        // 연결이 없을 뿐이다. 누른 건 남겨 두고 나중에 보낸다
        await Promise.all(
          doseIds.map((doseId) => enqueue({ doseId, status, takenAt, date })),
        );
        await syncQueued();
        return;
      }

      if (snapshot) setData(snapshot);
      throw e;
    }
  }, [data, applyLocal, refresh, setData, date, syncQueued]);

  const total = doses.length;
  const taken = doses.filter((d) => d.doseStatus === 'TAKEN').length;
  const decided = doses.filter((d) => d.doseStatus !== 'PENDING').length;
  const percent = total > 0 ? Math.round((taken / total) * 100) : 0;

  return {
    doses, groups, loading, error, refresh, mark,
    total, taken, decided, percent,
    /** 서버에 아직 못 보낸 체크 수 */
    queued,
  };
}
