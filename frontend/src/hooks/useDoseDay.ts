// ─────────────────────────────────────────────
//  useDoseDay — 하루치 복약 일정과 체크 동작
// ─────────────────────────────────────────────
import { useCallback, useMemo } from 'react';
import { doseApi } from '../api/Client';
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
  const applyLocal = useCallback((doseIds: number[], status: DoseStatus) => {
    setData((prev) =>
      (prev ?? []).map((d) =>
        doseIds.includes(d.id)
          ? { ...d, doseStatus: status, takenAt: status === 'TAKEN' ? toLocalDateTime() : null }
          : d,
      ),
    );
  }, [setData]);

  const mark = useCallback(async (doseIds: number[], status: Exclude<DoseStatus, 'PENDING'>) => {
    if (doseIds.length === 0) return;

    const snapshot = data;
    applyLocal(doseIds, status);

    try {
      const takenAt = toLocalDateTime();
      await Promise.all(doseIds.map((id) => (
        status === 'TAKEN'
          ? doseApi.markTaken(id, takenAt)
          : doseApi.markSkipped(id)
      )));
      // 서버가 계산한 값(MISSED 전환 등)을 다시 받아온다
      await refresh();
    } catch (e) {
      if (snapshot) setData(snapshot);
      throw e;
    }
  }, [data, applyLocal, refresh, setData]);

  const total = doses.length;
  const taken = doses.filter((d) => d.doseStatus === 'TAKEN').length;
  const decided = doses.filter((d) => d.doseStatus !== 'PENDING').length;
  const percent = total > 0 ? Math.round((taken / total) * 100) : 0;

  return { doses, groups, loading, error, refresh, mark, total, taken, decided, percent };
}
