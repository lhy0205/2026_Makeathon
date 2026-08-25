// ─────────────────────────────────────────────
//  useMedicationIndex — 약 id로 어느 병원 처방인지 찾는다
//  서버의 MedicationDoseResponse에는 병원 정보가 없어서,
//  방문 → 처방전 → 약을 훑어 약 id 기준 색인을 만들어 둔다.
// ─────────────────────────────────────────────
import { useMemo } from 'react';
import { prescriptionApi, visitApi } from '../api/Client';
import { useAsync } from './useAsync';

export interface MedicationOrigin {
  visitId: number;
  hospitalName: string;
  visitReason: string | null;
  medicationName: string;
  dosage: number | null;
  doseUnit: string | null;
}

export type MedicationIndex = Record<number, MedicationOrigin>;

async function buildIndex(): Promise<MedicationIndex> {
  const visits = await visitApi.getAll();

  const perVisit = await Promise.all(
    visits.map(async (visit) => {
      try {
        const prescription = await prescriptionApi.getByVisit(visit.id);
        return { visit, medications: prescription.medications };
      } catch {
        // 처방전을 아직 등록하지 않은 방문은 건너뛴다
        return { visit, medications: [] };
      }
    }),
  );

  const index: MedicationIndex = {};
  for (const { visit, medications } of perVisit) {
    for (const med of medications) {
      index[med.id] = {
        visitId: visit.id,
        hospitalName: visit.hospitalName,
        visitReason: visit.visitReason,
        medicationName: med.medicationName,
        dosage: med.dosage,
        doseUnit: med.doseUnit,
      };
    }
  }
  return index;
}

export function useMedicationIndex() {
  const { data, loading, error, refresh } = useAsync(buildIndex, []);
  const index = useMemo(() => data ?? {}, [data]);
  return { index, loading, error, refresh };
}
