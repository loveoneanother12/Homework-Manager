import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getStudent, getUnits, getRecordsByStudent,
  getPendingSecondRoundRecords, getClassByName,
  addRecord, updateRecord, deleteRecord, getSentences,
} from '../lib/store.js';
import { calcFirst, calcSecond, validate1st, validate2nd, pct } from '../lib/kpi.js';
import { generateComment1st, generateComment2nd, shouldFlagClinic } from '../lib/comments.js';
import { today } from '../lib/dateUtils.js';
import DateSelector from '../components/DateSelector.jsx';
import { SUBJECTS } from './UnitManagement.jsx';

const PROCESS_OPTIONS = [
  { value: null,         label: '없음', cls: 'bg-gray-100 text-gray-500 border-gray-300' },
  { value: 'good',       label: '우수', cls: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'needs_work', label: '보통', cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'poor',       label: '미흡', cls: 'bg-red-100 text-red-800 border-red-300' },
];

function NumInput({ label, value, onChange, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type="number" min="0" step="1"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={value}
        onChange={e => onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))} />
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
          ['정답 수', `${kpi1.correct}문항`],
          ['이행률', pct(kpi1.completion_rate)],
          ['정답률', pct(kpi1.accuracy_rate)],
          ['1차 오답', `${kpi1.first_wrongs}문항`],
          ['안 푼', pct(kpi1.not_attempted_rate)],
          ['손 못 댄', pct(kpi1.gave_up_rate)],
          ['풀고 틀린', pct(kpi1.wrong_rate)],
        ].map(([l, v]) => (
          <><span key={l} className="text-gray-600">{l}</span><span className="font-medium text-right">{v}</span></>
        ))}
      </div>
      {kpi2 && (
        <div className="mt-3 pt-3 border-t border-indigo-200 grid grid-cols-2 gap-x-6 gap-y-1.5">
          <p className="col-span-2 font-semibold text-indigo-700 text-xs mb-1">2차 채점</p>
          {[
            ['오답 이행률', pct(kpi2.retry_completion_rate)],
            ['이해 도달률', pct(kpi2.understanding_rate)],
            ['반복 오류율', pct(kpi2.repeat_error_rate)],
            ['완전 미해결율', pct(kpi2.unresolved_rate)],
          ].map(([l, v]) => (
            <><span key={l} className="text-gray-600">{l}</span><span className="font-medium text-right">{v}</span></>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 기록 수정 폼 ─────────────────────────────────────────────────────────────

function EditRecordForm({ record, units, onSave, onCancel }) {
  const hasSecond = record.round === 2;
  const currentUnit = units.find(u => u.id === record.unit_id);
  const defaultSubject = currentUnit?.subject ?? SUBJECTS[0] ?? '';

  const bySubject = Object.fromEntries(SUBJECTS.map(s => [s, units.filter(u => u.subject === s)]));

  const [selectedSubject, setSelectedSubject] = useState(defaultSubject);
  const subjectUnits = selectedSubject ? (bySubject[selectedSubject] ?? []) : units.filter(u => !u.subject);

  const [f, setF] = useState({
    unit_id: record.unit_id ?? '',
    total_count: record.total_count ?? '',
    not_attempted: record.not_attempted ?? 0,
    gave_up: record.gave_up ?? 0,
    wrong_attempted: record.wrong_attempted ?? 0,
    process_score: record.process_score ?? 'good',
    retry_total: record.retry_total ?? 0,
    retry_correct: record.retry_correct ?? 0,
    retry_wrong: record.retry_wrong ?? 0,
    retry_gave_up: record.retry_gave_up ?? 0,
    note_quality: record.note_quality ?? 'good',
  });
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  function handleSubjectSelect(subj) {
    setSelectedSubject(subj);
    setF(prev => ({ ...prev, unit_id: (bySubject[subj] ?? [])[0]?.id ?? '' }));
  }

  const filled = f.total_count !== '' && Number(f.total_count) >= 0 && f.unit_id;
  const kpi1 = filled ? calcFirst({
    total_count: Number(f.total_count), not_attempted: Number(f.not_attempted),
    gave_up: Number(f.gave_up), wrong_attempted: Number(f.wrong_attempted),
  }) : null;
  const firstWrongs = kpi1?.first_wrongs ?? 0;
  const kpi2 = hasSecond && kpi1 ? calcSecond({
    retry_total: Number(f.retry_total), retry_correct: Number(f.retry_correct),
    retry_wrong: Number(f.retry_wrong), retry_gave_up: Number(f.retry_gave_up),
  }, firstWrongs) : null;

  useEffect(() => {
    if (!filled) { setErrors([]); return; }
    const e1 = validate1st({
      total_count: Number(f.total_count), not_attempted: Number(f.not_attempted),
      gave_up: Number(f.gave_up), wrong_attempted: Number(f.wrong_attempted),
    });
    const e2 = hasSecond ? validate2nd({
      retry_total: Number(f.retry_total), retry_correct: Number(f.retry_correct),
      retry_wrong: Number(f.retry_wrong), retry_gave_up: Number(f.retry_gave_up),
    }, firstWrongs) : [];
    setErrors([...e1, ...e2]);
  }, [f, filled, hasSecond, firstWrongs]);

  const canSave = filled && errors.length === 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try { await onSave(f, kpi1, kpi2); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-700">채점 기록 수정</p>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">과목</label>
        <div className="flex gap-2 flex-wrap">
          {SUBJECTS.map(s => (
            <button key={s} type="button" onClick={() => handleSubjectSelect(s)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${selectedSubject === s ? 'bg-indigo-50 border-indigo-400 text-indigo-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      {selectedSubject && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">단원</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={f.unit_id} onChange={e => setF(p => ({ ...p, unit_id: e.target.value }))}>
            {subjectUnits.length === 0
              ? <option value="">— 등록된 단원 없음 —</option>
              : subjectUnits.map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <NumInput label="전체 문항 수"     value={f.total_count}    onChange={v => setF(p => ({ ...p, total_count: v }))} />
        <NumInput label="안 푼 문항 수"     value={f.not_attempted}  onChange={v => setF(p => ({ ...p, not_attempted: v }))} />
        <NumInput label="손 못 댄 문항 수"  value={f.gave_up}        onChange={v => setF(p => ({ ...p, gave_up: v }))} />
        <NumInput label="풀고 틀린 문항 수" value={f.wrong_attempted} onChange={v => setF(p => ({ ...p, wrong_attempted: v }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">풀이과정 서술 수준</label>
        <ProcessToggle value={f.process_score} onChange={v => setF(p => ({ ...p, process_score: v }))} />
      </div>
      {hasSecond && (
        <div className="pt-3 border-t border-gray-100 space-y-4">
          <p className="text-xs font-semibold text-gray-500">2차 채점 수정</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumInput label={`오답노트 작성 수 (최대 ${firstWrongs})`} value={f.retry_total}  onChange={v => setF(p => ({ ...p, retry_total: v }))} />
            <NumInput label="재채점 맞은 수"   value={f.retry_correct} onChange={v => setF(p => ({ ...p, retry_correct: v }))} />
            <NumInput label="재채점 틀린 수"   value={f.retry_wrong}   onChange={v => setF(p => ({ ...p, retry_wrong: v }))} />
            <NumInput label="여전히 손 못 댄"  value={f.retry_gave_up} onChange={v => setF(p => ({ ...p, retry_gave_up: v }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">오답노트 서술 성의</label>
            <ProcessToggle value={f.note_quality} onChange={v => setF(p => ({ ...p, note_quality: v }))} />
          </div>
        </div>
      )}
      {errors.length > 0 && <div className="space-y-1">{errors.map((e, i) => <p key={i} className="text-xs text-red-600">⚠ {e}</p>)}</div>}
      {kpi1 && errors.length === 0 && <KpiBox kpi1={kpi1} kpi2={kpi2} />}
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

// ── 기록 카드 (이력 표시용) ──────────────────────────────────────────────────

function RecordCard({ record, units, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const unit = units.find(u => u.id === record.unit_id);
  const kpi1 = record._kpi1;
  const kpi2 = record._kpi2;
  const hasSecond = kpi2 != null;

  if (isEditing) {
    return (
      <div className="bg-white border border-indigo-200 rounded-xl px-5 py-4">
        <EditRecordForm
          record={record}
          units={units}
          onSave={async (f, k1, k2) => { await onEdit(record.id, f, k1, k2); setIsEditing(false); }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{unit?.unit_name ?? '단원 없음'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hasSecond ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {hasSecond ? '1차+2차 완료' : '1차 완료'}
            </span>
            {record.clinic_flag && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">클리닉</span>
            )}
          </div>
          {kpi1 && (
            <div className="mt-2 flex gap-4 text-xs text-gray-600 flex-wrap">
              <span>이행률 <b className="text-gray-900">{pct(kpi1.completion_rate)}</b></span>
              <span>정답률 <b className="text-gray-900">{pct(kpi1.accuracy_rate)}</b></span>
              <span>1차 오답 <b className="text-gray-900">{kpi1.first_wrongs}문항</b></span>
              {hasSecond && <span>이해도달 <b className="text-emerald-700">{pct(kpi2.understanding_rate)}</b></span>}
            </div>
          )}
          {hasSecond && record.second_session_date && (
            <p className="text-xs text-gray-400 mt-1">2차: {record.second_session_date}</p>
          )}
          {(record.manual_comment || record.generated_comment) && (
            <p className="mt-2 text-xs text-gray-500 line-clamp-2">
              {record.manual_comment || record.generated_comment}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-xs bg-gray-50 text-gray-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
            수정
          </button>
          <button onClick={() => onDelete(record.id)}
            className="px-3 py-1.5 text-xs bg-gray-50 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: 1차 채점 폼 ──────────────────────────────────────────────────────

function FirstRoundForm({ units, onSave, onCancel }) {
  const bySubject = Object.fromEntries(
    SUBJECTS.map(s => [s, units.filter(u => u.subject === s)])
  );
  const noSubject = units.filter(u => !u.subject);
  const defaultSubject = units.find(u => u.subject)?.subject ?? '';

  const [selectedSubject, setSelectedSubject] = useState(defaultSubject);
  const subjectUnits = selectedSubject ? (bySubject[selectedSubject] ?? []) : noSubject;

  const [f, setF] = useState({
    unit_id: subjectUnits[0]?.id ?? '',
    total_count: '', not_attempted: 0, gave_up: 0, wrong_attempted: 0, process_score: 'good',
  });
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  function handleSubjectSelect(subj) {
    setSelectedSubject(subj);
    setF(prev => ({ ...prev, unit_id: (bySubject[subj] ?? [])[0]?.id ?? '' }));
  }

  const filled = f.total_count !== '' && Number(f.total_count) >= 0 && f.unit_id;
  const kpi1 = filled ? calcFirst({
    total_count: Number(f.total_count), not_attempted: Number(f.not_attempted),
    gave_up: Number(f.gave_up), wrong_attempted: Number(f.wrong_attempted),
  }) : null;

  useEffect(() => {
    if (!filled) { setErrors([]); return; }
    setErrors(validate1st({
      total_count: Number(f.total_count), not_attempted: Number(f.not_attempted),
      gave_up: Number(f.gave_up), wrong_attempted: Number(f.wrong_attempted),
    }));
  }, [f, filled]);

  const canSave = filled && errors.length === 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try { await onSave(f, kpi1); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      {/* 과목 선택 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">과목</label>
        <div className="flex gap-2 flex-wrap">
          {SUBJECTS.map(s => (
            <button key={s} type="button" onClick={() => handleSubjectSelect(s)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${selectedSubject === s ? 'bg-indigo-50 border-indigo-400 text-indigo-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      {selectedSubject && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">단원</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={f.unit_id} onChange={e => setF(p => ({ ...p, unit_id: e.target.value }))}>
            {subjectUnits.length === 0
              ? <option value="">— 등록된 단원 없음 —</option>
              : subjectUnits.map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
          </select>
        </div>
      )}
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

// ── Step 2: 2차 채점 폼 ──────────────────────────────────────────────────────

function SecondRoundForm({ refRecord, units, onSave, onCancel }) {
  const [s, setS] = useState({ retry_total: 0, retry_correct: 0, retry_wrong: 0, retry_gave_up: 0, note_quality: 'good' });
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const unit = units.find(u => u.id === refRecord.unit_id);
  const kpi1 = refRecord._kpi1;
  const firstWrongs = kpi1?.first_wrongs ?? 0;
  const kpi2 = calcSecond({
    retry_total: Number(s.retry_total), retry_correct: Number(s.retry_correct),
    retry_wrong: Number(s.retry_wrong), retry_gave_up: Number(s.retry_gave_up),
  }, firstWrongs);

  useEffect(() => {
    setErrors(validate2nd({
      retry_total: Number(s.retry_total), retry_correct: Number(s.retry_correct),
      retry_wrong: Number(s.retry_wrong), retry_gave_up: Number(s.retry_gave_up),
    }, firstWrongs));
  }, [s, firstWrongs]);

  async function handleSave() {
    if (errors.length > 0) return;
    setSaving(true);
    try { await onSave(s, kpi2); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      {/* 1차 참조 데이터 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm">
        <p className="text-xs font-semibold text-gray-500 mb-2">참조 — 1차 채점 기록 ({refRecord.session_date})</p>
        <div className="flex gap-5 flex-wrap text-gray-700">
          <span>단원: <b>{unit?.unit_name ?? '—'}</b></span>
          <span>이행률: <b>{kpi1 ? pct(kpi1.completion_rate) : '—'}</b></span>
          <span>정답률: <b>{kpi1 ? pct(kpi1.accuracy_rate) : '—'}</b></span>
          <span className="text-indigo-700 font-semibold">1차 오답: <b>{firstWrongs}문항</b></span>
        </div>
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
        <button disabled={errors.length > 0 || saving} onClick={handleSave}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${errors.length === 0 && !saving ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
          {saving ? '저장 중…' : '2차 저장'}
        </button>
        <button onClick={onCancel} className="px-6 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">취소</button>
      </div>
    </div>
  );
}

// ── Step 2 — 대기 레코드 목록 ────────────────────────────────────────────────

function PendingList({ records, units, onSelect }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-2xl mb-2">✅</p>
        <p className="text-sm">이전 회차 중 2차 채점이 필요한 기록이 없습니다.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">아래 기록 중 오답노트를 확인할 회차를 선택하세요.</p>
      {records.map(r => {
        const unit = units.find(u => u.id === r.unit_id);
        const kpi1 = r._kpi1;
        return (
          <div key={r.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900">{unit?.unit_name ?? '단원 없음'}</span>
                <span className="text-xs text-gray-400">{r.session_date}</span>
              </div>
              {kpi1 && (
                <div className="mt-1 flex gap-3 text-xs text-gray-500">
                  <span>1차 오답 <b className="text-gray-800">{kpi1.first_wrongs}문항</b></span>
                  <span>이행률 <b className="text-gray-800">{pct(kpi1.completion_rate)}</b></span>
                </div>
              )}
            </div>
            <button onClick={() => onSelect(r)}
              className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors flex-shrink-0">
              2차 채점 입력
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── 과제 채점 패널 (Step 1 + Step 2) ────────────────────────────────────────

function GradingPanel({ units, pendingRecords, pendingLoading, sessionDate, onSaveFirst, onSaveSecond, onClose }) {
  const [step, setStep] = useState(1);
  const [secondTarget, setSecondTarget] = useState(null);

  function handleSelectRecord(record) {
    setSecondTarget(record);
  }

  function handleCancelSecond() {
    setSecondTarget(null);
  }

  async function handleSaveSecond(s, kpi2) {
    await onSaveSecond(secondTarget, s, kpi2);
    setSecondTarget(null);
  }

  const step2Badge = pendingRecords.length > 0
    ? <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">{pendingRecords.length}</span>
    : null;

  return (
    <div className="bg-white border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 bg-indigo-50 border-b border-indigo-100">
        <span className="font-semibold text-indigo-900 text-sm">과제 채점</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕ 닫기</button>
      </div>

      {/* Step 탭 */}
      <div className="flex border-b border-gray-200">
        {[
          { num: 1, label: '이번 회차 1차 채점' },
          { num: 2, label: '이전 회차 2차 채점', badge: step2Badge },
        ].map(({ num, label, badge }) => (
          <button key={num} onClick={() => setStep(num)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${step === num ? 'text-indigo-700 border-b-2 border-indigo-600 bg-white' : 'text-gray-500 hover:text-gray-700 bg-gray-50'}`}>
            Step {num} {label}{badge}
          </button>
        ))}
      </div>

      {/* Step 내용 */}
      <div className="p-5">
        {step === 1 && (
          <FirstRoundForm
            units={units}
            onSave={async (f, kpi1) => { await onSaveFirst(f, kpi1); }}
            onCancel={onClose}
          />
        )}
        {step === 2 && (
          pendingLoading
            ? <div className="text-center py-8 text-gray-400 text-sm">불러오는 중…</div>
            : secondTarget
              ? <SecondRoundForm
                  refRecord={secondTarget}
                  units={units}
                  onSave={handleSaveSecond}
                  onCancel={handleCancelSecond}
                />
              : <PendingList
                  records={pendingRecords}
                  units={units}
                  onSelect={handleSelectRecord}
                />
        )}
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

export default function GradingInput() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionDate = searchParams.get('date') ?? today();
  const className = searchParams.get('class');

  const classIdRef = useRef(null); // 항상 최신 classId를 참조

  const [student, setStudent] = useState(null);
  const [units, setUnits] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u, cls] = await Promise.all([
        getStudent(studentId),
        getUnits(),
        className ? getClassByName(className) : Promise.resolve(null),
      ]);
      const resolvedClassId = cls?.id ?? null;
      classIdRef.current = resolvedClassId;
      const r = await getRecordsByStudent(studentId, sessionDate, resolvedClassId);
      setStudent(s);
      setUnits(u);
      setRecords(r);
    } finally {
      setLoading(false);
    }
  }, [studentId, sessionDate, className]);

  useEffect(() => { refresh(); }, [refresh]);

  async function refreshPending() {
    setPendingLoading(true);
    try {
      const pending = await getPendingSecondRoundRecords(studentId, sessionDate, classIdRef.current);
      setPendingRecords(pending);
    } finally {
      setPendingLoading(false);
    }
  }

  async function openPanel() {
    setShowPanel(true);
    await refreshPending();
  }

  async function handleSaveFirst(f, kpi1) {
    const unit = units.find(u => u.id === f.unit_id);
    const sentences = await getSentences();
    const generated_comment = generateComment1st({
      kpi1, preset_type: unit?.preset_type ?? 'default',
      process_score: f.process_score, sentences,
    });
    await addRecord({
      student_id: studentId,
      class_id: classIdRef.current,
      unit_id: f.unit_id,
      round: 1,
      session_date: sessionDate,
      total_count: Number(f.total_count),
      not_attempted: Number(f.not_attempted),
      gave_up: Number(f.gave_up),
      wrong_attempted: Number(f.wrong_attempted),
      process_score: f.process_score,
      retry_total: null, retry_correct: null, retry_wrong: null, retry_gave_up: null,
      note_quality: null,
      generated_comment,
      generated_comment_2: null,
      manual_comment: null,
      manual_comment_2: null,
      clinic_flag: shouldFlagClinic({ kpi1, kpi2: null }),
    });
    await refresh();
  }

  async function handleSaveSecond(refRecord, s, kpi2) {
    const kpi1 = refRecord._kpi1;
    const sentences = await getSentences();
    const generated_comment_2 = generateComment2nd({
      kpi2,
      retry_wrong: Number(s.retry_wrong),
      retry_gave_up: Number(s.retry_gave_up),
      note_quality: s.note_quality,
      sentences,
    });
    await updateRecord(refRecord.id, {
      round: 2,
      second_session_date: sessionDate,
      retry_total: Number(s.retry_total),
      retry_correct: Number(s.retry_correct),
      retry_wrong: Number(s.retry_wrong),
      retry_gave_up: Number(s.retry_gave_up),
      note_quality: s.note_quality,
      generated_comment_2,
      manual_comment_2: null,
      clinic_flag: shouldFlagClinic({ kpi1, kpi2 }),
    });
    await refresh();
    await refreshPending();
  }

  async function handleDelete(id) {
    if (!confirm('이 채점 기록을 삭제하시겠습니까?')) return;
    await deleteRecord(id);
    await refresh();
  }

  async function handleEdit(id, f, kpi1, kpi2) {
    const unit = units.find(u => u.id === f.unit_id);
    const sentences = await getSentences();
    const generated_comment = generateComment1st({
      kpi1, preset_type: unit?.preset_type ?? 'default',
      process_score: f.process_score, sentences,
    });
    const updateData = {
      unit_id: f.unit_id,
      total_count: Number(f.total_count),
      not_attempted: Number(f.not_attempted),
      gave_up: Number(f.gave_up),
      wrong_attempted: Number(f.wrong_attempted),
      process_score: f.process_score,
      generated_comment,
      clinic_flag: shouldFlagClinic({ kpi1, kpi2 }),
    };
    if (kpi2) {
      const generated_comment_2 = generateComment2nd({
        kpi2, retry_wrong: Number(f.retry_wrong),
        retry_gave_up: Number(f.retry_gave_up), note_quality: f.note_quality, sentences,
      });
      Object.assign(updateData, {
        retry_total: Number(f.retry_total),
        retry_correct: Number(f.retry_correct),
        retry_wrong: Number(f.retry_wrong),
        retry_gave_up: Number(f.retry_gave_up),
        note_quality: f.note_quality,
        generated_comment_2,
      });
    }
    await updateRecord(id, updateData);
    await refresh();
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;
  if (!student) return <div className="text-center py-16 text-gray-400">학생 정보를 불러올 수 없습니다.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/class/${encodeURIComponent(className)}?date=${sessionDate}`)} className="text-gray-400 hover:text-gray-600 text-sm">← 학생 목록</button>
        <h1 className="text-xl font-bold text-gray-900">{student.name}</h1>
        {className && <span className="text-sm text-gray-400">{className}</span>}
      </div>

      {/* 날짜 선택 */}
      <div className="flex items-center gap-3 py-3 border-b border-gray-100">
        <DateSelector date={sessionDate} onChange={d => { setShowPanel(false); setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('date', d); return p; }); }} />
      </div>

      {/* 과제 채점 버튼 / 패널 */}
      {!showPanel ? (
        <div className="flex justify-end">
          <button onClick={openPanel}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            + 과제 채점
          </button>
        </div>
      ) : (
        <GradingPanel
          units={units}
          pendingRecords={pendingRecords}
          pendingLoading={pendingLoading}
          sessionDate={sessionDate}
          onSaveFirst={handleSaveFirst}
          onSaveSecond={handleSaveSecond}
          onClose={() => setShowPanel(false)}
        />
      )}

      {/* 이력 */}
      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-3">📝</p>
          <p className="text-sm">이 날짜의 채점 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-medium">채점 기록 ({records.length}건)</p>
          {records.map(r => (
            <RecordCard key={r.id} record={r} units={units} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
