// ─────────────────────────────────────────────
//  doseQueue — 오프라인에서 누른 복약 체크를 모아 뒀다 나중에 보낸다
//
//  복약 체크는 지하철이나 엘리베이터에서 누르게 된다.
//  그때 실패했다고 없던 일이 되면 그날 기록이 통째로 비고, 복약률도 틀어진다.
//  그래서 서버에 못 보낸 건 기기에 적어 두고 연결이 돌아오면 다시 보낸다.
//
//  BE-6(배치 엔드포인트)이 생기면 flush를 한 번의 요청으로 바꾸면 된다.
//  지금은 건별로 보낸다.
// ─────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, doseApi } from '../api/Client';
import type { DoseStatus } from '../types/Api';

const STORAGE_KEY = 'pending_dose_marks';

export interface PendingMark {
  doseId: number;
  status: Exclude<DoseStatus, 'PENDING'>;
  /** 'YYYY-MM-DDTHH:mm:ss' — 실제로 누른 시각. 나중에 보내도 이 시각으로 기록된다 */
  takenAt: string;
  /** 화면이 어떤 날짜 목록을 새로 고쳐야 하는지 알기 위해 */
  date: string;
}

/** 서버에 닿지 못한 경우인지 (연결 실패는 status 0) */
export function isOffline(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

async function read(): Promise<PendingMark[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingMark[]) : [];
  } catch {
    return [];
  }
}

async function write(marks: PendingMark[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(marks));
  } catch {
    // 저장 공간이 없으면 어쩔 수 없다. 화면 표시는 이미 되어 있다
  }
}

/** 같은 일정을 또 누르면 마지막 것만 남긴다 */
export async function enqueue(mark: PendingMark): Promise<void> {
  const marks = await read();
  const next = marks.filter((m) => m.doseId !== mark.doseId);
  next.push(mark);
  await write(next);
}

export async function pending(): Promise<PendingMark[]> {
  return read();
}

/** 특정 날짜에 대기 중인 기록 — 화면이 '동기화 대기'로 표시한다 */
export async function pendingForDate(date: string): Promise<PendingMark[]> {
  return (await read()).filter((m) => m.date === date);
}

export interface FlushResult {
  sent: number;
  remaining: number;
  /** 다시 불러와야 하는 날짜들 */
  dates: string[];
}

/**
 * 쌓인 걸 순서대로 보낸다.
 * 또 연결이 끊기면 남은 건 그대로 두고 멈춘다 — 다음 기회에 다시 시도한다.
 */
export async function flush(): Promise<FlushResult> {
  const marks = await read();
  if (marks.length === 0) return { sent: 0, remaining: 0, dates: [] };

  const left: PendingMark[] = [];
  const dates = new Set<string>();
  let sent = 0;
  let offline = false;

  for (const mark of marks) {
    if (offline) {
      left.push(mark);
      continue;
    }

    try {
      if (mark.status === 'TAKEN') {
        await doseApi.markTaken(mark.doseId, mark.takenAt);
      } else {
        await doseApi.markSkipped(mark.doseId);
      }
      sent += 1;
      dates.add(mark.date);
    } catch (e) {
      if (isOffline(e)) {
        // 아직 연결이 안 됐다. 남은 건 다음에
        offline = true;
        left.push(mark);
      }
      // 그 밖의 오류(404 등)는 다시 보내도 같은 결과다. 큐에서 버린다
    }
  }

  await write(left);
  return { sent, remaining: left.length, dates: [...dates] };
}

export async function clear(): Promise<void> {
  await write([]);
}
