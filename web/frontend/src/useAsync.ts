// ─────────────────────────────────────────────
//  useAsync — 화면마다 반복되는 fetch/로딩/에러 처리
//  앱의 frontend/src/hooks/useAsync.ts 와 같은 규칙이다.
// ─────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 화면을 벗어난 뒤 늦게 도착한 응답은 버린다
  const runId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
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
  }, deps);

  useEffect(() => { void refresh(); }, [refresh]);

  return { data, loading, error, refresh, setData };
}
