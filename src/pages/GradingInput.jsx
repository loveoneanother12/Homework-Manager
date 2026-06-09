import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getStudent, getUnits, getRecordsByStudent,
  addRecord, updateRecord, deleteRecord, getSentences, getUnit,
} from '../lib/store.js';
import { calcFirst, calcSecond, validate1st, validate2nd, pct } from '../lib/kpi.js';
import { generateComment, shouldFlagClinic } from '../lib/comments.js';

const PROCESS_OPTIONS = [
  { value: 'good',       label: '우수', cls: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'needs_work', label: '보통', cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'poor',       label: '미흡', cls: 'bg-red-100 text-red-800 border-red-300'   },
];

function NumInput({ label, value, onChange, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number" min="0" step="1"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={value}
        onChange={e => onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function ProcessToggle({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {PROCESS_OPTIONS.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-all ${value === o.value ? o.cls + ' border-current' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function KpiBox({ kpi1, kpi2 }) {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm">
      <p className="font-semibold text-indigo-800 mb-3">KPI 미리보기</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {[
          ['정답 수',   `${kpi1.correct}문항`],
          ['이행률',    pct(kpi1.completion_rate)],
          ['정답률',    pct(kpi1.accuracy_rate)],
          ['1차 오답',  `${kpi1.first_wrongs}문항`],
          ['안 푼',     pct(kpi1.not_attempted_rate)],
          ['손 못 댄',  pct(kpi1.gave_up_rate)],
          ['풀고 틀린', pct(kpi1.wrong_rate)],
        ].map(([l, v]) => (
          <><span key={l} className="text-gray-600">{l}</span><span className="font-medium text-right">{v}</span></>
        ))}
      </div>
      {kpi2 && (
        <div className="mt-3 pt-3 border-t border-indigo-200 grid grid-cols-2 gap-x-6 gap-y-1.5">
          <p className="col-span-2 font-semibold text-indigo-700 text-xs mb-1">2차 채점</p>
          {[
            ['오답 이행률',   pct(kpi2.retry_completion_rate)],
            ['이해 도달률',   pct(kpi2.understanding_rate)],
            ['반복 오류율',   pct(kpi2.repeat_error_rate)],
            ['완전 미해결율', pct(kpi2.unresolved_rate)],
          ].map(([l, v]) => (
            <><span key={l} className="text-gray-600">{l}</span><span className="font-medium text-right">{v}</span></>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordCard({ record, units, onAddSecond, onDelete }) {
  const unit = units.find(u => u.id === record.unit_id);
  const kpi1 = record._kpi1;
  const kpi2 = record._kpi2;
  const hasSecond = kpi2 != null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{unit?.unit_name ?? '단원 없음'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hasSecond ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {hasSecond ? '1차+2차' : '1차'}
            </span>
            {record.clinic_flag && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">클리닉</span>
            )}
            <span className="text-xs text-gray-400 ml-auto">{record.created_at?.slice(0, 10)}</span>
          </div>
          {kpi1 && (
            <div className="mt-2 flex gap-4 text-xs text-gray-600 flex-wrap">
              <span>이행률 <b className="text-gray-900">{pct(kpi1.completion_rate)}</b></span>
              <span>정답률 <b className="text-gray-900">{pct(kpi1.accuracy_rate)}</b></span>
              <span>1차 오답 <b className="text-gray-900">{kpi1.first_wrongs}문항</b></span>
              {hasSecond && <span>이해도달 <b className="text-emerald-700">{pct(kpi2.understanding_rate)}</b></span>}
            </div>
          )}
          {record.generated_comment && (
            <p className="mt-2 text-xs text-gray-500 line-clamp-2">
              {record.manual_comment || record.generated_comment}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
          {!hasSecond && (
            <button onClick={() => onAddSecond(record)}
              className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg font-medium hover:bg-emerald-100 transition-colors">
              2차 채점 입력
            </button>
          )}
          <button onClick={() => onDelete(record.id)}
            className="px-3 py-1.5 text-xs bg-gray-50 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 1차 채점 폼 ──────────────────────────────────────────────────────────────

function FirstRoundForm({ units, onSave, onCancel }) {
  const [f, setF] = useState({ unit_id: units[0]?.id ?? '', total_count: '', not_attempted: 0, gave_up: 0, wrong_attempted: 0, process_score: 'good' });
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const filled = f.total_count !== '' && Number(f.total_count) >= 0 && f.unit_id;
  const kpi1 = filled ? calcFirst({ total_count: Number(f.total_count), not_attempted: Number(f.not_attempted), gave_up: Number(f.gave_up), wrong_attempted: Number(f.wrong_attempted) }) : null;

  useEffect(() => {
    if (!filled) { setErrors([]); return; }
    setErrors(validate1st({ total_count: Number(f.total_count), not_attempted: Number(f.not_attempted), gave_up: Number(f.gave_up), wrong_attempted: Number(f.wrong_attempted) }));
  }, [f, filled]);

  const canSave = filled && errors.length === 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try { await onSave(f, kpi1); } finally { setSaving(false); }
  }

  return (
    <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-5">
      <h2 className="font-semibold text-gray-800">새 1차 채점</h2>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">단원</label>
        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={f.unit_id} onChange={e => setF(p => ({ ...p, unit_id: e.target.value }))}>
          {units.map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <NumInput label="전체 문항 수"     value={f.total_count}    onChange={v => setF(p => ({ ...p, total_count: v }))} />
        <NumInput label="안 푼 문항 수"     value={f.not_attempted}  onChange={v => setF(p => ({ ...p, not_attempted: v }))} />
        <NumInput label="손 못 댄 문항 수"  value={f.gave_up}        onChange={v => setF(p => ({ ...p, gave_up: v }))} hint="시도했으나 미완" />
        <NumInput label="풀고 틀린 문항 수" value={f.wrong_attempted} onChange={v => setF(p => ({ ...p, wrong_attempted: v }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">풀이과정 서술 수준</label>
        <ProcessToggle value={f.process_score} onChange={v => setF(p => ({ ...p, process_score: v }))} />
      </div>
      {errors.length > 0 && <div className="space-y-1">{errors.map((e, i) => <p key={i} className="text-xs text-red-600">⚠ {e}</p>)}</div>}
      {kpi1 && errors.length === 0 && <KpiBox kpi1={kpi1} />}
      <div className="flex gap-2 pt-1">
        <button disabled={!canSave || saving} onClick={handleSave}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${canSave && !saving ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
          {saving ? '저장 중…' : '저장'}
        </button>
        <button onClick={onCancel} className="px-6 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">취소</button>
      </div>
    </div>
  );
}

// ── 2차 채점 폼 ──────────────────────────────────────────────────────────────

function SecondRoundForm({ refRecord, units, onSave, onCancel }) {
  const [s, setS] = useState({ retry_total: 0, retry_correct: 0, retry_wrong: 0, retry_gave_up: 0, note_quality: 'good' });
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const unit = units.find(u => u.id === refRecord.unit_id);
  const kpi1 = refRecord._kpi1;
  const firstWrongs = kpi1?.first_wrongs ?? 0;

  const kpi2 = calcSecond({ retry_total: Number(s.retry_total), retry_correct: Number(s.retry_correct), retry_wrong: Number(s.retry_wrong), retry_gave_up: Number(s.retry_gave_up) }, firstWrongs);

  useEffect(() => {
    setErrors(validate2nd({ retry_total: Number(s.retry_total), retry_correct: Number(s.retry_correct), retry_wrong: Number(s.retry_wrong), retry_gave_up: Number(s.retry_gave_up) }, firstWrongs));
  }, [s, firstWrongs]);

  const canSave = errors.length === 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try { await onSave(s, kpi2); } finally { setSaving(false); }
  }

  return (
    <div className="bg-white border border-emerald-200 rounded-xl p-5 space-y-5">
      <h2 className="font-semibold text-gray-800">2차 채점 (오답노트)</h2>
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm">
        <p className="text-xs font-semibold text-gray-500 mb-2">참조 — 1차 채점 기록</p>
        <div className="flex gap-5 flex-wrap text-gray-700">
          <span>단원: <b>{unit?.unit_name ?? '—'}</b></span>
          <span>이행률: <b>{kpi1 ? pct(kpi1.completion_rate) : '—'}</b></span>
          <span>정답률: <b>{kpi1 ? pct(kpi1.accuracy_rate) : '—'}</b></span>
          <span className="text-indigo-700 font-semibold">1차 오답: <b>{firstWrongs}문항</b></span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{refRecord.created_at?.slice(0, 10)} 저장</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <NumInput label={`오답노트 작성 수 (최대 ${firstWrongs})`} value={s.retry_total}  onChange={v => setS(p => ({ ...p, retry_total: v }))} />
        <NumInput label="재채점 맞은 수"   value={s.retry_correct} onChange={v => setS(p => ({ ...p, retry_correct: v }))} />
        <NumInput label="재채점 틀린 수"   value={s.retry_wrong}   onChange={v => setS(p => ({ ...p, retry_wrong: v }))} />
        <NumInput label="여전히 손 못 댄"  value={s.retry_gave_up} onChange={v => setS(p => ({ ...p, retry_gave_up: v }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">오답노트 서술 성의</label>
        <ProcessToggle value={s.note_quality} onChange={v => setS(p => ({ ...p, note_quality: v }))} />
      </div>
      {errors.length > 0 && <div className="space-y-1">{errors.map((e, i) => <p key={i} className="text-xs text-red-600">⚠ {e}</p>)}</div>}
      {kpi1 && errors.length === 0 && <KpiBox kpi1={kpi1} kpi2={kpi2} />}
      <div className="flex gap-2 pt-1">
        <button disabled={!canSave || saving} onClick={handleSave}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${canSave && !saving ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
          {saving ? '저장 중…' : '2차 저장'}
        </button>
        <button onClick={onCancel} className="px-6 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">취소</button>
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

export default function GradingInput() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [units, setUnits] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // null | 'new_first' | {type:'second', record}

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u, r] = await Promise.all([
        getStudent(studentId),
        getUnits(),
        getRecordsByStudent(studentId),
      ]);
      setStudent(s);
      setUnits(u);
      setRecords(r);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function buildComment(kpi1, kpi2, unitId, process_score) {
    const unit = units.find(u => u.id === unitId);
    const sentences = await getSentences();
    return generateComment({ kpi1, kpi2, preset_type: unit?.preset_type ?? 'default', process_score, sentences });
  }

  async function handleSaveFirst(f, kpi1) {
    const generated_comment = await buildComment(kpi1, null, f.unit_id, f.process_score);
    await addRecord({
      student_id: studentId,
      unit_id: f.unit_id,
      round: 1,
      total_count: Number(f.total_count),
      not_attempted: Number(f.not_attempted),
      gave_up: Number(f.gave_up),
      wrong_attempted: Number(f.wrong_attempted),
      process_score: f.process_score,
      retry_total: null, retry_correct: null, retry_wrong: null, retry_gave_up: null, note_quality: null,
      generated_comment,
      manual_comment: null,
      clinic_flag: shouldFlagClinic({ kpi1, kpi2: null }),
    });
    setMode(null);
    await refresh();
  }

  async function handleSaveSecond(refRecord, s, kpi2) {
    const kpi1 = refRecord._kpi1;
    const generated_comment = await buildComment(kpi1, kpi2, refRecord.unit_id, refRecord.process_score);
    await updateRecord(refRecord.id, {
      round: 2,
      retry_total: Number(s.retry_total),
      retry_correct: Number(s.retry_correct),
      retry_wrong: Number(s.retry_wrong),
      retry_gave_up: Number(s.retry_gave_up),
      note_quality: s.note_quality,
      generated_comment,
      manual_comment: null,
      clinic_flag: shouldFlagClinic({ kpi1, kpi2 }),
    });
    setMode(null);
    await refresh();
  }

  async function handleDelete(id) {
    if (!confirm('이 채점 기록을 삭제하시겠습니까?')) return;
    await deleteRecord(id);
    await refresh();
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;
  if (!student) return <div className="text-center py-16 text-gray-400">학생 정보를 불러올 수 없습니다.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-sm">← 뒤로</button>
        <h1 className="text-xl font-bold text-gray-900">채점 이력 — {student.name}</h1>
        <span className="text-sm text-gray-400">{student.class_name}</span>
      </div>

      {mode === null && (
        <div className="flex justify-end">
          <button onClick={() => setMode('new_first')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            + 새 1차 채점
          </button>
        </div>
      )}

      {mode === 'new_first' && units.length > 0 && (
        <FirstRoundForm units={units} onSave={handleSaveFirst} onCancel={() => setMode(null)} />
      )}

      {mode?.type === 'second' && (
        <SecondRoundForm
          refRecord={mode.record}
          units={units}
          onSave={(s, kpi2) => handleSaveSecond(mode.record, s, kpi2)}
          onCancel={() => setMode(null)}
        />
      )}

      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-3">📝</p>
          <p className="text-sm">채점 기록이 없습니다. '새 1차 채점'으로 시작하세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-medium">채점 이력 ({records.length}건) — 최신순</p>
          {records.map(r => (
            <RecordCard key={r.id} record={r} units={units}
              onAddSecond={record => setMode({ type: 'second', record })}
              onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
