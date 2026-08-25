// ─────────────────────────────────────────────
//  useAsync — 화면마다 반복되는 fetch/로딩/에러 처리를 한 곳에 모은다
// ─────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** 다시 불러온다 */
  refresh: () => Promise<void>;
  /** 서버를 거치지 않고 화면 값만 먼저 바꿀 때 (낙관적 갱신) */
  setData: (updater: T | ((prev: T | null) => T | null)) => void;
}

/**
 * deps가 바뀌면 다시 부른다.
 * 화면을 벗어난 뒤 늦게 도착한 응답은 버린다.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const { enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  // 응답이 뒤늦게 도착했을 때 최신 요청인지 가린다
  const runId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    const id = ++runId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (mounted.current && id === runId.current) setData(result);
    } catch (e) {
      if (mounted.current && id === runId.current) {
        setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.');
      }
    } finally {
      if (mounted.current && id === runId.current) setLoading(false);
    }
    // fn은 매 렌더 새로 만들어지므로 deps로 갱신 시점을 정한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  return { data, loading, error, refresh, setData };
}
