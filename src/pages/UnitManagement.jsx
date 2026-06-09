import { useState, useEffect } from 'react';
import { getUnits, addUnit, updateUnit, deleteUnit } from '../lib/store.js';

const PRESET_TYPES = [
  { value: 'calculation_accuracy', label: '계산정확형',    hint: '계산 실수·검산 습관 강조' },
  { value: 'proof_description',    label: '논증서술형',    hint: '논리 전개·서술 완성도 강조' },
  { value: 'graph_interpretation', label: '그래프해석형',  hint: '그래프 오독→답 오류, 그래프 정확성 강조' },
  { value: 'application',          label: '활용 및 응용형', hint: '문제 해석·풀이 설계 + 최종 계산 둘 다' },
  { value: 'default',              label: '기본형',        hint: "균형 평가, '손 못 댐' 비율 모니터링" },
];
const WEIGHTS = ['low', 'mid', 'mid_high', 'high'];
const WEIGHT_LABEL = { low: '낮음', mid: '중', mid_high: '중~높음', high: '높음' };

const PRESET_DEFAULTS = {
  calculation_accuracy: { weight_completion: 'mid',      weight_accuracy: 'high', weight_process: 'low'  },
  proof_description:    { weight_completion: 'mid',      weight_accuracy: 'mid',  weight_process: 'high' },
  graph_interpretation: { weight_completion: 'mid',      weight_accuracy: 'high', weight_process: 'mid'  },
  application:          { weight_completion: 'mid',      weight_accuracy: 'high', weight_process: 'high' },
  default:              { weight_completion: 'mid_high', weight_accuracy: 'mid',  weight_process: 'mid'  },
};

const EMPTY = { unit_name: '', preset_type: 'default', weight_completion: 'mid_high', weight_accuracy: 'mid', weight_process: 'mid' };

function WeightSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400">
      {WEIGHTS.map(w => <option key={w} value={w}>{WEIGHT_LABEL[w]}</option>)}
    </select>
  );
}

export default function UnitManagement() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setUnits(await getUnits()); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  function handlePresetChange(preset_type) {
    setForm(f => ({ ...f, preset_type, ...PRESET_DEFAULTS[preset_type] }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.unit_name.trim()) return;
    setSaving(true);
    try {
      if (editId) { await updateUnit(editId, form); setEditId(null); }
      else { await addUnit(form); }
      setForm(EMPTY);
      setShowAdd(false);
      await refresh();
    } finally { setSaving(false); }
  }

  function startEdit(u) {
    setForm({ unit_name: u.unit_name, preset_type: u.preset_type, weight_completion: u.weight_completion, weight_accuracy: u.weight_accuracy, weight_process: u.weight_process });
    setEditId(u.id);
    setShowAdd(true);
  }

  async function handleDelete(id) {
    if (!confirm('이 단원을 삭제하시겠습니까?')) return;
    await deleteUnit(id);
    await refresh();
  }

  function cancelEdit() { setForm(EMPTY); setEditId(null); setShowAdd(false); }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">단원 가중치 관리</h1>
        <button onClick={() => { setShowAdd(v => !v); if (editId) cancelEdit(); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          + 단원 추가
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="bg-white border border-indigo-100 rounded-xl p-5 mb-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">{editId ? '단원 편집' : '새 단원'}</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">단원명</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.unit_name} onChange={e => setForm(f => ({ ...f, unit_name: e.target.value }))}
              placeholder="예: 3-2단원 일차방정식" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">단원 유형 (프리셋)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_TYPES.map(p => (
                <button key={p.value} type="button" onClick={() => handlePresetChange(p.value)}
                  className={`p-2 rounded-lg border text-left transition-all ${form.preset_type === p.value ? 'bg-indigo-50 border-indigo-400 text-indigo-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs mt-0.5 opacity-70">{p.hint}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">세부 가중치 조정</label>
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-sm"><span className="text-gray-600">이행률</span><WeightSelect value={form.weight_completion} onChange={v => setForm(f => ({ ...f, weight_completion: v }))} /></div>
              <div className="flex items-center gap-2 text-sm"><span className="text-gray-600">정답률</span><WeightSelect value={form.weight_accuracy}   onChange={v => setForm(f => ({ ...f, weight_accuracy: v }))} /></div>
              <div className="flex items-center gap-2 text-sm"><span className="text-gray-600">서술</span>  <WeightSelect value={form.weight_process}    onChange={v => setForm(f => ({ ...f, weight_process: v }))} /></div>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? '저장 중…' : editId ? '수정 저장' : '추가'}
            </button>
            <button type="button" onClick={cancelEdit} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">취소</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {units.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">등록된 단원이 없습니다.</p>}
        {units.map(u => (
          <div key={u.id} className="px-5 py-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{u.unit_name}</span>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                  {{ calculation_accuracy: '계산정확형', proof_description: '논증서술형', graph_interpretation: '그래프해석형', application: '활용 및 응용형', default: '기본형' }[u.preset_type] ?? u.preset_type}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex gap-4">
                <span>이행률 <b>{WEIGHT_LABEL[u.weight_completion]}</b></span>
                <span>정답률 <b>{WEIGHT_LABEL[u.weight_accuracy]}</b></span>
                <span>서술 <b>{WEIGHT_LABEL[u.weight_process]}</b></span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(u)} className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded hover:bg-indigo-50 hover:text-indigo-700 transition-colors">편집</button>
              <button onClick={() => handleDelete(u.id)} className="px-3 py-1.5 text-xs bg-gray-50 text-gray-500 rounded hover:bg-red-50 hover:text-red-600 transition-colors">삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
