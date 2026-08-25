import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client';
import { Badge, Card, ErrorState, Loading, PageHeader, TableWrap } from '../components/ui';
import { useAsync } from '../useAsync';
import './OcrFailuresPage.css';

/**
 * OCR이 읽었지만 지식베이스에서 찾지 못한 약.
 * 여기 있는 이름을 지식베이스에 채우면 다음부터는 인식된다 —
 * 이 화면이 관리자 페이지의 존재 이유다.
 */
export default function OcrFailuresPage() {
  const { data, loading, error, refresh } = useAsync(() => adminApi.ocrFailures(), []);

  // 같은 이름이 여러 번 실패했다면 그만큼 자주 처방되는 약이다. 먼저 채워야 한다
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; count: number; bestConfidence: number }>();
    for (const item of data ?? []) {
      const bucket = map.get(item.medicationName) ?? {
        name: item.medicationName,
        count: 0,
        bestConfidence: 0,
      };
      bucket.count += 1;
      bucket.bestConfidence = Math.max(bucket.bestConfidence, item.confidence ?? 0);
      map.set(item.medicationName, bucket);
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [data]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const total = data?.length ?? 0;

  return (
    <>
      <PageHeader
        title="OCR 실패"
        description="처방전에서는 읽혔지만 지식베이스에 없는 약입니다. 자주 나오는 것부터 채우세요."
        action={
          <button type="button" className="btn btn-ghost" onClick={refresh}>
            새로고침
          </button>
        }
      />

      {total === 0 ? (
        <Card>
          <p className="state-title">매칭에 실패한 약이 없습니다</p>
          <p className="state-text">
            처방전에 등장한 약이 모두 지식베이스에 있습니다.
          </p>
        </Card>
      ) : (
        <>
          <p className="failure-summary">
            서로 다른 약 <b className="num">{grouped.length}</b>종이
            총 <b className="num">{total}</b>번 매칭에 실패했습니다.
          </p>

          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th scope="col">약 이름</th>
                  <th scope="col" className="right">실패 횟수</th>
                  <th scope="col">가장 가까웠던 점수</th>
                  <th scope="col" className="right">조치</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((item) => (
                  <tr key={item.name}>
                    <td><b>{item.name}</b></td>
                    <td className="right num">{item.count}</td>
                    <td>
                      {item.bestConfidence > 0 ? (
                        <Badge tone={item.bestConfidence >= 0.7 ? 'warn' : 'neutral'}>
                          {Math.round(item.bestConfidence * 100)}%
                        </Badge>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="right">
                      <Link
                        className="btn btn-primary btn-sm"
                        to={`/knowledge?name=${encodeURIComponent(item.name)}`}
                      >
                        지식베이스에 추가
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          <p className="failure-note">
            점수가 70%를 넘는데도 실패했다면 이름을 조금만 고쳐 쓴 같은 약일 수 있습니다.
            지식베이스에 별도로 추가하기 전에 기존 항목의 이름을 확인해 보세요.
          </p>
        </>
      )}
    </>
  );
}
