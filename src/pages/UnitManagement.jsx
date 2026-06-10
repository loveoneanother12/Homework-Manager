import { useState, useEffect } from 'react';
import { getUnits, addUnit, updateUnit, deleteUnit } from '../lib/store.js';

export const SUBJECTS = ['공통수학1', '공통수학2', '대수', '미적분I'];

const PRESET_TYPES = [
  { value: 'calculation_accuracy', label: '계산정확형',     hint: '계산 실수·검산 습관 강조' },
  { value: 'proof_description',    label: '논증서술형',     hint: '논리 전개·서술 완성도 강조' },
  { value: 'graph_interpretation', label: '그래프해석형',   hint: '그래프 오독→답 오류, 정확성 강조' },
  { value: 'application',          label: '활용 및 응용형', hint: '문제 해석·풀이 설계 + 최종 계산 둘 다' },
  { value: 'default',              label: '기본형',         hint: "균형 평가, '손 못 댐' 비율 모니터링" },
];

export const PRESET_LABEL = {
  calculation_accuracy: '계산정확형',
  proof_description:    '논증서술형',
  graph_interpretation: '그래프해석형',
  application:          '활용 및 응용형',
  default:              '기본형',
};

const WEIGHTS = ['low', 'mid', 'high'];
export const WEIGHT_LABEL = { low: '낮음', mid: '중간', high: '높음' };

const PRESET_DEFAULTS = {
  calculation_accuracy: { weight_completion: 'mid', weight_accuracy: 'high', weight_process: 'low'  },
  proof_description:    { weight_completion: 'mid', weight_accuracy: 'mid',  weight_process: 'high' },
  graph_interpretation: { weight_completion: 'mid', weight_accuracy: 'high', weight_process: 'mid'  },
  application:          { weight_completion: 'mid', weight_accuracy: 'high', weight_process: 'high' },
  default:              { weight_completion: 'mid', weight_accuracy: 'mid',  weight_process: 'mid'  },
};

const EMPTY = {
  unit_name: '', subject: SUBJECTS[0], preset_type: 'default',
  weight_completion: 'mid', weight_accuracy: 'mid', weight_process: 'mid',
};

function WeightSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400">
      {WEIGHTS.map(w => <option key={w} value={w}>{WEIGHT_LABEL[w]}</option>)}
    </select>
  );
}

function UnitRow({ unit, onEdit, onDelete }) {
  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-800">{unit.unit_name}</span>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full flex-shrink-0">
            {PRESET_LABEL[unit.preset_type] ?? unit.preset_type}
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
          <span>이행률 <b className="text-gray-600">{WEIGHT_LABEL[unit.weight_completion] ?? unit.weight_completion}</b></span>
          <span>정답률 <b className="text-gray-600">{WEIGHT_LABEL[unit.weight_accuracy]}</b></span>
          <span>서술 <b className="text-gray-600">{WEIGHT_LABEL[unit.weight_process]}</b></span>
        </div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button onClick={() => onEdit(unit)}
          className="px-2.5 py-1.5 text-xs bg-gray-50 text-gray-600 rounded hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-gray-200">
          편집
        </button>
        <button onClick={() => onDelete(unit.id)}
          className="px-2.5 py-1.5 text-xs bg-gray-50 text-gray-500 rounded hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200">
          삭제
        </button>
      </div>
    </div>
  );
}

function SubjectSection({ subject, units, onEdit, onDelete, onAddTo }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">{subject}</span>
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
            {units.length}단원
          </span>
        </div>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y divide-gray-100 bg-white">
          {units.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">등록된 단원이 없습니다.</p>
          )}
          {units.map(u => (
            <UnitRow key={u.id} unit={u} onEdit={onEdit} onDelete={onDelete} />
          ))}
          <div className="px-5 py-3 bg-gray-50">
            <button type="button" onClick={() => onAddTo(subject)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
              + {subject} 단원 추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnitManagement() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setUnits(await getUnits()); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const bySubject = Object.fromEntries(
    SUBJECTS.map(s => [s, units.filter(u => u.subject === s)])
  );

  function handlePresetChange(preset_type) {
    setForm(f => ({ ...f, preset_type, ...PRESET_DEFAULTS[preset_type] }));
  }

  function startAdd(subject) {
    setForm({ ...EMPTY, subject, ...PRESET_DEFAULTS[EMPTY.preset_type] });
    setEditId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEdit(u) {
    setForm({
      unit_name: u.unit_name,
      subject: u.subject ?? SUBJECTS[0],
      preset_type: u.preset_type,
      weight_completion: u.weight_completion,
      weight_accuracy: u.weight_accuracy,
      weight_process: u.weight_process,
    });
    setEditId(u.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.unit_name.trim()) return;
    setSaving(true);
    try {
      if (editId) { await updateUnit(editId, form); setEditId(null); }
      else { await addUnit(form); }
      setForm(EMPTY);
      setShowForm(false);
      await refresh();
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('이 단원을 삭제하시겠습니까?')) return;
    await deleteUnit(id);
    await refresh();
  }

  function cancelForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">단원 가중치 관리</h1>
        <button onClick={() => startAdd(SUBJECTS[0])}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          + 단원 추가
        </button>
      </div>

      {/* 단원 추가/편집 폼 */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-indigo-100 rounded-xl p-5 mb-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">{editId ? '단원 편집' : '새 단원'}</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">과목</label>
            <div className="flex gap-2 flex-wrap">
              {SUBJECTS.map(s => (
                <button key={s} type="button" onClick={() => setForm(f => ({ ...f, subject: s }))}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${form.subject === s ? 'bg-indigo-50 border-indigo-400 text-indigo-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">단원명</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.unit_name}
              onChange={e => setForm(f => ({ ...f, unit_name: e.target.value }))}
              placeholder="예: 방정식과 부등식 — 이차방정식" required />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">단원 유형 (프리셋)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_TYPES.map(p => (
                <button key={p.value} type="button" onClick={() => handlePresetChange(p.value)}
                  className={`p-2 rounded-lg border text-left transition-all ${form.preset_type === p.value ? 'bg-indigo-50 border-indigo-400 text-indigo-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs mt-0.5 opacity-70 leading-tight">{p.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">세부 가중치 조정</label>
            <div className="flex gap-6 flex-wrap">
              <div className="flex items-center gap-2 text-sm"><span className="text-gray-600">이행률</span><WeightSelect value={form.weight_completion} onChange={v => setForm(f => ({ ...f, weight_completion: v }))} /></div>
              <div className="flex items-center gap-2 text-sm"><span className="text-gray-600">정답률</span><WeightSelect value={form.weight_accuracy}   onChange={v => setForm(f => ({ ...f, weight_accuracy: v }))} /></div>
              <div className="flex items-center gap-2 text-sm"><span className="text-gray-600">서술</span>  <WeightSelect value={form.weight_process}    onChange={v => setForm(f => ({ ...f, weight_process: v }))} /></div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? '저장 중…' : editId ? '수정 저장' : '추가'}
            </button>
            <button type="button" onClick={cancelForm}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              취소
            </button>
          </div>
        </form>
      )}

      {/* 과목별 아코디언 */}
      <div className="space-y-3">
        {SUBJECTS.map(subj => (
          <SubjectSection
            key={subj}
            subject={subj}
            units={bySubject[subj] ?? []}
            onEdit={startEdit}
            onDelete={handleDelete}
            onAddTo={startAdd}
          />
        ))}
      </div>
    </div>
  );
}
