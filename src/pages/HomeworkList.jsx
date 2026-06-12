import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  getClassByName, getHomeworks, addHomework, updateHomework, deleteHomework,
  countLiveRecordsByHomework, getRecordsByClassDate,
  getNoHomework, setNoHomework,
} from '../lib/store.js';
import { today } from '../lib/dateUtils.js';
import DateSelector from '../components/DateSelector.jsx';

// 숙제 추가/편집 팝업 — 숙제명 + 교시 선택
function HomeworkFormModal({ initial, defaultTitle, onSave, onCancel }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? defaultTitle ?? '');
  const [period, setPeriod] = useState(initial?.period ?? 1);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try { await onSave({ title: title.trim(), period }); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 text-lg">{isEdit ? '숙제 편집' : '새 숙제'}</h3>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">숙제명</label>
          <input
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="예: 쎈 12~15p"
            required />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">교시</label>
          <div className="flex gap-2">
            {[1, 2].map(p => (
              <button key={p} type="button" onClick={() => setPeriod(p)}
                className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  period === p
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}>
                {p}교시
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
            취소
          </button>
          <button type="submit" disabled={saving || !title.trim()}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? '저장 중…' : isEdit ? '저장' : '추가'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function HomeworkList() {
  const { className } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(className);

  const [searchParams, setSearchParams] = useSearchParams();
  const sessionDate = searchParams.get('date') ?? today();
  const { key: locationKey } = useLocation();

  const [classId, setClassId] = useState(null);
  const [homeworks, setHomeworks] = useState([]);
  const [gradedCounts, setGradedCounts] = useState({}); // homework_id → 채점 학생 수
  const [recordCount, setRecordCount] = useState(0);    // 이 날짜의 전체 채점 기록 수
  const [noHomework, setNoHomeworkFlag] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formTarget, setFormTarget] = useState(null); // 'new' | 숙제 객체

  async function refresh() {
    setLoading(true);
    try {
      const cls = await getClassByName(decoded);
      const resolvedClassId = cls?.id ?? null;
      setClassId(resolvedClassId);
      if (!resolvedClassId) { setHomeworks([]); return; }
      const [hws, records, noHw] = await Promise.all([
        getHomeworks(resolvedClassId, sessionDate),
        getRecordsByClassDate(resolvedClassId, sessionDate),
        getNoHomework(resolvedClassId, sessionDate),
      ]);
      setHomeworks(hws);
      const byHw = {};
      for (const r of records) {
        if (!r.homework_id) continue;
        (byHw[r.homework_id] ??= new Set()).add(r.student_id);
      }
      setGradedCounts(Object.fromEntries(Object.entries(byHw).map(([k, v]) => [k, v.size])));
      setRecordCount(records.length);
      setNoHomeworkFlag(noHw);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [decoded, sessionDate, locationKey]);

  async function handleSaveHomework({ title, period }) {
    if (formTarget === 'new') await addHomework(classId, sessionDate, title, period);
    else await updateHomework(formTarget.id, { title, period });
    setFormTarget(null);
    await refresh();
  }

  async function handleDeleteHomework(e, hw) {
    e.stopPropagation();
    const count = await countLiveRecordsByHomework(hw.id);
    if (count > 0) {
      alert(`'${hw.title}'에 채점 기록 ${count}건이 있어 삭제할 수 없습니다.\n기록을 먼저 삭제한 뒤 다시 시도하세요.`);
      return;
    }
    if (!confirm(`'${hw.title}' 카드를 삭제하시겠습니까?`)) return;
    await deleteHomework(hw.id);
    await refresh();
  }

  async function toggleNoHomework() {
    const next = !noHomework;
    if (next && recordCount > 0) {
      const ok = confirm(
        '채점된 데이터가 이미 있습니다. 기존의 데이터를 무시하고 숙제 없음으로 표시하겠습니까?\n'
        + '숙제 없음 처리를 해도 기존 데이터는 사라지지 않으며, 다시 원래 상태로 복원할 수 있습니다.'
      );
      if (!ok) return;
    }
    setNoHomeworkFlag(next);
    await setNoHomework(classId, sessionDate, next);
  }

  const hwLink = (hw) => `/class/${className}/hw/${hw.id}?date=${sessionDate}`;

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm">← 반 목록</button>
        <h1 className="text-2xl font-bold text-gray-900">{decoded}</h1>
      </div>

      {/* 날짜 선택 + 숙제 없음 토글 */}
      <div className="mb-5 flex items-center gap-4 flex-wrap">
        <DateSelector date={sessionDate} onChange={d => setSearchParams({ date: d })} />
        <button type="button" onClick={toggleNoHomework} className="flex items-center gap-2 flex-shrink-0">
          <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${noHomework ? 'bg-amber-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${noHomework ? 'left-4' : 'left-0.5'}`} />
          </div>
          <span className={`text-xs font-medium whitespace-nowrap transition-colors ${noHomework ? 'text-amber-600' : 'text-gray-500'}`}>
            숙제 없음
          </span>
        </button>
      </div>

      {noHomework && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
          이 날짜는 숙제가 없는 날로 저장되었습니다.
        </div>
      )}

      {homeworks.length === 0 ? (
        /* 빈 화면 — 숙제 추가 버튼 */
        <div className="text-center py-20 text-gray-400">
          <p className="text-3xl mb-3">📚</p>
          <p className="text-sm mb-6">이 날짜에 등록된 숙제가 없습니다.</p>
          <button
            onClick={() => setFormTarget('new')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            + 숙제 추가
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">숙제 {homeworks.length}개</p>
            <button
              onClick={() => setFormTarget('new')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              + 숙제 추가
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {homeworks.map(hw => {
              const graded = gradedCounts[hw.id] ?? 0;
              return (
                <div
                  key={hw.id}
                  onClick={() => navigate(hwLink(hw))}
                  className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors text-lg">
                        {hw.title}
                      </h2>
                      {hw.period && (
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {hw.period}교시
                        </span>
                      )}
                    </div>
                    <span className="text-xl">📝</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">채점 완료 {graded}명</p>
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={e => { e.stopPropagation(); setFormTarget(hw); }}
                      className="px-2.5 py-1 text-xs text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">
                      편집
                    </button>
                    <button
                      onClick={e => handleDeleteHomework(e, hw)}
                      className="px-2.5 py-1 text-xs text-gray-400 bg-gray-50 rounded hover:bg-red-50 hover:text-red-600 transition-colors">
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 숙제 추가/편집 팝업 */}
      {formTarget && (
        <HomeworkFormModal
          initial={formTarget === 'new' ? null : formTarget}
          defaultTitle={`숙제 ${homeworks.length + 1}`}
          onSave={handleSaveHomework}
          onCancel={() => setFormTarget(null)}
        />
      )}
    </div>
  );
}
