import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../api/client';
import type { KnowledgeEntry, KnowledgeEntryInput } from '../api/types';
import { Card, ErrorState, Loading, PageHeader, TableWrap } from '../components/ui';
import { dateTime } from '../format';
import { useAsync } from '../useAsync';
import './KnowledgePage.css';

const EMPTY: KnowledgeEntryInput = {
  itemSeq: '',
  medicationName: '',
  purpose: '',
  sideEffects: '',
  precautions: '',
};

export default function KnowledgePage() {
  const { data, loading, error, refresh } = useAsync(() => adminApi.knowledge(), []);
  const [params, setParams] = useSearchParams();

  const [form, setForm] = useState<KnowledgeEntryInput>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  const [reindexing, setReindexing] = useState(false);
  const [reindexResult, setReindexResult] = useState<string | null>(null);

  // OCR 실패 화면에서 '지식베이스에 추가'로 넘어오면 이름을 채워 둔다
  useEffect(() => {
    const prefill = params.get('name');
    if (!prefill) return;
    setForm({ ...EMPTY, medicationName: prefill });
    setEditingId(null);
    params.delete('name');
    setParams(params, { replace: true });
  }, [params, setParams]);

  const entries = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) => e.medicationName.toLowerCase().includes(q) || e.itemSeq.includes(q),
    );
  }, [data, query]);

  const startEdit = (entry: KnowledgeEntry) => {
    setEditingId(entry.id);
    setForm({
      itemSeq: entry.itemSeq,
      medicationName: entry.medicationName,
      purpose: entry.purpose ?? '',
      sideEffects: entry.sideEffects ?? '',
      precautions: entry.precautions ?? '',
    });
    setFormError('');
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
  };

  const handleSave = async () => {
    if (saving) return;

    if (!form.itemSeq.trim() || !form.medicationName.trim()) {
      setFormError('품목기준코드와 약 이름은 반드시 입력해야 합니다.');
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      const body: KnowledgeEntryInput = {
        itemSeq: form.itemSeq.trim(),
        medicationName: form.medicationName.trim(),
        purpose: form.purpose?.trim() || null,
        sideEffects: form.sideEffects?.trim() || null,
        precautions: form.precautions?.trim() || null,
      };

      if (editingId != null) await adminApi.updateKnowledge(editingId, body);
      else await adminApi.createKnowledge(body);

      resetForm();
      await refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: KnowledgeEntry) => {
    if (!window.confirm(`'${entry.medicationName}'을(를) 지식베이스에서 삭제할까요?`)) return;
    try {
      await adminApi.deleteKnowledge(entry.id);
      if (editingId === entry.id) resetForm();
      await refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '삭제하지 못했습니다.');
    }
  };

  const handleReindex = async () => {
    if (reindexing) return;
    setReindexing(true);
    setReindexResult(null);
    try {
      const result = await adminApi.reindex();
      setReindexResult(`${result.documentsIndexed}건을 다시 색인했습니다.`);
    } catch (e) {
      setReindexResult(e instanceof Error ? e.message : '색인에 실패했습니다.');
    } finally {
      setReindexing(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <>
      <PageHeader
        title="지식베이스"
        description="여기에 등록한 약만 앱이 알아봅니다. 고친 뒤에는 반드시 재색인해야 반영됩니다."
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleReindex}
            disabled={reindexing}
          >
            {reindexing ? '색인 중…' : '재색인'}
          </button>
        }
      />

      {reindexResult && <p className="reindex-result">{reindexResult}</p>}

      <div className="knowledge-grid">
        <Card title={editingId != null ? '항목 수정' : '항목 추가'}>
          <div className="form">
            <div className="field">
              <label className="field-label" htmlFor="itemSeq">품목기준코드</label>
              <input
                id="itemSeq"
                className="input"
                value={form.itemSeq}
                onChange={(e) => setForm({ ...form, itemSeq: e.target.value })}
                placeholder="예: 197000037"
              />
              <p className="field-hint">
                식약처 코드입니다. 약물 상호작용(DUR) 검사가 이 값으로 조회합니다.
              </p>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="medicationName">약 이름</label>
              <input
                id="medicationName"
                className="input"
                value={form.medicationName}
                onChange={(e) => setForm({ ...form, medicationName: e.target.value })}
                placeholder="예: 타이레놀정500mg"
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="purpose">효능 · 목적</label>
              <textarea
                id="purpose"
                className="textarea"
                value={form.purpose ?? ''}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="어떤 증상에 쓰는 약인지"
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="sideEffects">주요 부작용</label>
              <textarea
                id="sideEffects"
                className="textarea"
                value={form.sideEffects ?? ''}
                onChange={(e) => setForm({ ...form, sideEffects: e.target.value })}
                placeholder="자주 보고되는 부작용"
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="precautions">복용 시 주의사항</label>
              <textarea
                id="precautions"
                className="textarea"
                value={form.precautions ?? ''}
                onChange={(e) => setForm({ ...form, precautions: e.target.value })}
                placeholder="음주, 식전·식후, 함께 먹으면 안 되는 음식, 운전 주의 등"
              />
              <p className="field-hint">
                챗봇이 &lsquo;술 마셔도 되나요&rsquo; 같은 질문에 답할 때 이 내용을 찾습니다.
              </p>
            </div>

            {formError && <p className="form-error" role="alert">{formError}</p>}

            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '저장 중…' : editingId != null ? '수정' : '추가'}
              </button>
              {editingId != null && (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  취소
                </button>
              )}
            </div>
          </div>
        </Card>

        <div>
          <div className="list-head">
            <h2 className="section-title">등록된 약 <span className="num">{entries.length}</span>종</h2>
            <input
              className="input search"
              placeholder="약 이름 또는 코드 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="지식베이스 검색"
            />
          </div>

          {entries.length === 0 ? (
            <Card>
              <p className="state-text">
                {query ? '조건에 맞는 약이 없습니다.' : '등록된 약이 없습니다. 왼쪽에서 추가하세요.'}
              </p>
            </Card>
          ) : (
            <TableWrap>
              <table>
                <thead>
                  <tr>
                    <th scope="col">약 이름</th>
                    <th scope="col">품목기준코드</th>
                    <th scope="col">효능</th>
                    <th scope="col">수정일</th>
                    <th scope="col" className="right">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td><b>{entry.medicationName}</b></td>
                      <td className="num muted">{entry.itemSeq}</td>
                      <td className="muted cell-clamp">{entry.purpose || '—'}</td>
                      <td className="muted">{dateTime(entry.updatedAt)}</td>
                      <td className="right">
                        <div className="row-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(entry)}>
                            수정
                          </button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(entry)}>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>
      </div>
    </>
  );
}
