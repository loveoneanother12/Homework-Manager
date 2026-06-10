import { useState, useEffect } from 'react';
import { getSentences, updateSentence, addSentence, deleteSentence, resetSentencesToDefault } from '../lib/store.js';

const PARTS = ['1', '2', '3', '4', '5', '6'];
const PART_LABEL = {
  '1': '파트 1 — 이행 총평 (1차, 항상)',
  '2': '파트 2 — 오답 유형 진단 (1차, 항상)',
  '3': '파트 3 — 풀이 서술 평가 (1차, 조건부)',
  '4': '파트 4 — 오답 교정 결과 (2차, 항상)',
  '5': '파트 5 — 반복 오류·미해결 경고 (2차, 조건부)',
  '6': '파트 6 — 오답노트 서술 (2차, 조건부)',
};
const CONDITION_OPTIONS = {
  '1': [
    { value: 'completion_high', label: '이행률 ≥ 90%' },
    { value: 'completion_mid',  label: '70% ≤ 이행률 < 90%' },
    { value: 'completion_low',  label: '이행률 < 70%' },
    { value: 'fallback',        label: 'fallback' },
  ],
  '2': [
    { value: 'gave_up_dominant',       label: '손 못 댄 비율 높음' },
    { value: 'not_attempted_dominant', label: '안 푼 비율 높음' },
    { value: 'wrong_dominant_general', label: '풀고 틀린 비율 높음 (일반)' },
    { value: 'wrong_dominant_calc',    label: '풀고 틀린 비율 높음 (계산정확형·그래프해석형)' },
    { value: 'no_issue',               label: '우수 / 특이사항 없음' },
    { value: 'fallback',               label: 'fallback' },
  ],
  '3': [
    { value: 'good_logic',         label: '서술 우수 (논증서술형·활용 및 응용형)' },
    { value: 'good_general',       label: '서술 우수 (그 외 단원)' },
    { value: 'needs_work_logic',   label: '서술 보완 필요 (논증서술형·활용 및 응용형)' },
    { value: 'needs_work_general', label: '서술 보완 필요 (그 외 단원)' },
    { value: 'poor',               label: '서술 미흡' },
  ],
  '4': [
    { value: 'understanding_high', label: '이해 도달률 ≥ 70%' },
    { value: 'understanding_mid',  label: '40% ≤ 이해 도달률 < 70%' },
    { value: 'understanding_low',  label: '이해 도달률 < 40%' },
    { value: 'fallback',           label: 'fallback' },
  ],
  '5': [
    { value: 'repeat_error_only', label: '반복 오류만 있음 (retry_wrong > 0)' },
    { value: 'unresolved_only',   label: '미해결만 있음 (retry_gave_up > 0)' },
    { value: 'both',              label: '반복 오류·미해결 모두 있음' },
  ],
  '6': [
    { value: 'note_good',       label: '오답노트 우수' },
    { value: 'note_needs_work', label: '오답노트 보완 필요' },
    { value: 'note_poor',       label: '오답노트 미흡' },
  ],
};

function SentenceRow({ s, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(s.sentence_text);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try { await onSave(s.id, { sentence_text: draft }); setEditing(false); setPreview(null); }
    finally { setSaving(false); }
  }

  const condLabel = CONDITION_OPTIONS[s.part]?.find(o => o.value === s.condition_key)?.label ?? s.condition_key;

  return (
    <div className={`px-5 py-3 ${!s.is_active ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{condLabel}</span>
            {!s.is_active && <span className="text-xs text-gray-400">비활성</span>}
          </div>
          {editing ? (
            <div className="space-y-2">
              <textarea className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2} value={draft} onChange={e => setDraft(e.target.value)} />
              {preview !== null && (
                <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm text-amber-900">
                  <span className="text-xs font-medium text-amber-600 block mb-1">변경 후 미리보기</span>
                  {preview}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setPreview(draft)} className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200">미리보기</button>
                <button onClick={handleSave} disabled={saving} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? '저장 중…' : '저장'}
                </button>
                <button onClick={() => { setDraft(s.sentence_text); setEditing(false); setPreview(null); }}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">취소</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700">{s.sentence_text}</p>
          )}
        </div>
        {!editing && (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onSave(s.id, { is_active: !s.is_active })}
              className="px-2 py-1 text-xs text-gray-500 bg-gray-50 rounded hover:bg-gray-100">
              {s.is_active ? '비활성' : '활성'}
            </button>
            <button onClick={() => { setDraft(s.sentence_text); setEditing(true); }}
              className="px-2 py-1 text-xs text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100">편집</button>
            <button onClick={() => onDelete(s.id)} className="px-2 py-1 text-xs text-red-500 bg-red-50 rounded hover:bg-red-100">삭제</button>
          </div>
        )}
      </div>
    </div>
  );
}

const NEW_EMPTY = { part: '1', condition_key: 'completion_high', sentence_text: '' };

export default function SentenceManagement() {
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState(NEW_EMPTY);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setSentences(await getSentences()); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function handleSave(id, data) {
    await updateSentence(id, data);
    await refresh();
  }

  async function handleDelete(id) {
    if (!confirm('이 문장을 삭제하시겠습니까?')) return;
    await deleteSentence(id);
    await refresh();
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newForm.sentence_text.trim()) return;
    setSaving(true);
    try {
      await addSentence(newForm);
      setNewForm(NEW_EMPTY);
      setShowAdd(false);
      await refresh();
    } finally { setSaving(false); }
  }

  async function handleReset() {
    if (!confirm('모든 문장을 기본값으로 초기화하시겠습니까? 커스텀 문장이 모두 사라집니다.')) return;
    await resetSentencesToDefault();
    await refresh();
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">문장 풀 관리</h1>
        <div className="flex gap-2">
          <button onClick={handleReset} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">기본값으로 초기화</button>
          <button onClick={() => setShowAdd(v => !v)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ 문장 추가</button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-indigo-100 rounded-xl p-5 mb-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">새 문장 추가</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">파트</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={newForm.part}
                onChange={e => setNewForm(f => ({ ...f, part: e.target.value, condition_key: CONDITION_OPTIONS[e.target.value][0].value }))}>
                {PARTS.map(p => <option key={p} value={p}>{PART_LABEL[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">조건</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={newForm.condition_key}
                onChange={e => setNewForm(f => ({ ...f, condition_key: e.target.value }))}>
                {(CONDITION_OPTIONS[newForm.part] || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">문장 내용</label>
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2} value={newForm.sentence_text}
              onChange={e => setNewForm(f => ({ ...f, sentence_text: e.target.value }))}
              placeholder="문장을 입력하세요." required />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? '추가 중…' : '추가'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">취소</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {PARTS.map(part => {
          const partSentences = sentences.filter(s => s.part === part);
          return (
            <div key={part} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-700 text-sm">{PART_LABEL[part]}</h2>
              </div>
              {partSentences.length === 0
                ? <p className="px-5 py-4 text-sm text-gray-400">문장 없음</p>
                : <div className="divide-y divide-gray-100">
                    {partSentences.map(s => (
                      <SentenceRow key={s.id} s={s} onSave={handleSave} onDelete={handleDelete} />
                    ))}
                  </div>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}
