import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  getClassByName, getStudentsByClassId, getRecordsByStudentIds, getUnits,
  getAbsentStudentIds, setAbsence, getHomework, getLastUnitForHomework,
  getPendingSecondRoundRecords, addRecord, updateRecord, deleteRecord, getSentences,
} from '../lib/store.js';
import { pct } from '../lib/kpi.js';
import { generateComment1st, generateComment2nd, shouldFlagClinic } from '../lib/comments.js';
import { today } from '../lib/dateUtils.js';
import DateSelector from '../components/DateSelector.jsx';
import GradingPanel from '../components/GradingPanel.jsx';

export default function StudentList() {
  const { className, homeworkId } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(className);

  const [searchParams] = useSearchParams();
  const sessionDate = searchParams.get('date') ?? today();
  const { key: locationKey } = useLocation();

  const [entries, setEntries] = useState([]); // [{student, records, record, unit}]
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState(null);
  const [homework, setHomework] = useState(null);
  const [absentIds, setAbsentIds] = useState(new Set());

  // 인라인 채점 패널
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // 같은 숙제 내 학생 간 공유 단원
  const [sharedUnit, setSharedUnit] = useState({ subject: '', unitId: '' });

  // 다음 학생 자동 이동 시 해당 행으로 스크롤
  const studentRowRefs = useRef({});
  const autoScrollRef = useRef(false);

  useEffect(() => {
    if (expandedStudentId && autoScrollRef.current) {
      autoScrollRef.current = false;
      studentRowRefs.current[expandedStudentId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [expandedStudentId]);

  // 다음 학생 이동 확인 팝업
  const [nextStudentConfirm, setNextStudentConfirm] = useState(null); // student 객체 or null

  async function refresh(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [cls, hw] = await Promise.all([getClassByName(decoded), getHomework(homeworkId)]);
      const resolvedClassId = cls?.id ?? null;
      setClassId(resolvedClassId);
      setHomework(hw);
      const students = resolvedClassId ? await getStudentsByClassId(resolvedClassId) : [];
      const [allRecords, allUnits, absentList] = await Promise.all([
        getRecordsByStudentIds(students.map(s => s.id), sessionDate, resolvedClassId, homeworkId),
        getUnits(),
        resolvedClassId ? getAbsentStudentIds(resolvedClassId, sessionDate) : [],
      ]);
      setUnits(allUnits);
      setAbsentIds(new Set(absentList));
      const unitsById = Object.fromEntries(allUnits.map(u => [u.id, u]));

      setEntries(students.map(student => {
        const recs = allRecords.filter(r => r.student_id === student.id);
        const latest = recs[0] ?? null; // already sorted desc
        return {
          student,
          records: recs,
          record: latest,
          unit: latest ? (unitsById[latest.unit_id] ?? null) : null,
        };
      }));

      // 같은 반·같은 숙제명의 지난 회차에서 사용된 단원으로 초기화
      if (!silent && hw?.title && resolvedClassId) {
        const lastUnitId = await getLastUnitForHomework(hw.title, resolvedClassId, homeworkId);
        if (lastUnitId) {
          const unit = allUnits.find(u => u.id === lastUnitId);
          if (unit) setSharedUnit({ subject: unit.subject ?? '', unitId: lastUnitId });
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { refresh(false); }, [decoded, homeworkId, sessionDate, locationKey]);

  async function toggleAbsence(studentId) {
    const next = !absentIds.has(studentId);
    setAbsentIds(prev => {
      const s = new Set(prev);
      if (next) s.add(studentId); else s.delete(studentId);
      return s;
    });
    await setAbsence(classId, studentId, sessionDate, next);
  }

  // ── 인라인 채점 패널 핸들러 ─────────────────────────────────────────────────

  async function refreshPending(studentId) {
    setPendingLoading(true);
    try {
      setPendingRecords(await getPendingSecondRoundRecords(studentId, sessionDate, classId));
    } finally {
      setPendingLoading(false);
    }
  }

  async function toggleGrading(studentId) {
    if (expandedStudentId === studentId) { setExpandedStudentId(null); return; }
    setExpandedStudentId(studentId);
    setPendingRecords([]);
    await refreshPending(studentId);
  }

  async function handleSaveFirst(studentId, f, kpi1) {
    const unit = units.find(u => u.id === f.unit_id);
    const sentences = await getSentences();
    const generated_comment = generateComment1st({
      kpi1, preset_type: unit?.preset_type ?? 'default',
      process_score: f.process_score, sentences,
    });
    await addRecord({
      student_id: studentId,
      class_id: classId,
      homework_id: homeworkId ?? null,
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
    await refresh(true);
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
      second_session_homework_id: homeworkId ?? null,
      retry_total: Number(s.retry_total),
      retry_correct: Number(s.retry_correct),
      retry_wrong: Number(s.retry_wrong),
      retry_gave_up: Number(s.retry_gave_up),
      note_quality: s.note_quality,
      generated_comment_2,
      manual_comment_2: null,
      clinic_flag: shouldFlagClinic({ kpi1, kpi2 }),
    });
    await refresh(true);
    if (expandedStudentId) await refreshPending(expandedStudentId);
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
    await refresh(true);
  }

  async function handleDelete(id) {
    if (!confirm('이 채점 기록을 삭제하시겠습니까? (휴지통으로 이동하며 복원할 수 있습니다)')) return;
    await deleteRecord(id);
    await refresh(true);
  }

  // ── 다음 학생 이동 로직 ──────────────────────────────────────────────────────

  function handleReadyForNext() {
    const currentIndex = entries.findIndex(e => e.student.id === expandedStudentId);
    if (currentIndex === -1) { setExpandedStudentId(null); return; }
    const nextEntry = entries.slice(currentIndex + 1).find(e => !absentIds.has(e.student.id));
    if (!nextEntry) {
      setExpandedStudentId(null);
      return;
    }
    setNextStudentConfirm(nextEntry.student);
  }

  async function handleNextStudentConfirmed() {
    const nextId = nextStudentConfirm.id;
    setNextStudentConfirm(null);
    autoScrollRef.current = true;
    await toggleGrading(nextId);
  }

  function handleNextStudentSkipped() {
    setExpandedStudentId(null);
    setNextStudentConfirm(null);
  }

  const previewLink = `/class/${className}/hw/${homeworkId}/preview?date=${sessionDate}`;
  const doneCount = entries.filter(e => e.record).length;

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/class/${className}?date=${sessionDate}`)} className="text-gray-400 hover:text-gray-600 text-sm">← 숙제 목록</button>
        <h1 className="text-2xl font-extrabold text-indigo-700">{decoded}</h1>
        {homework && (
          <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            {homework.period ? `${homework.period}교시 · ` : ''}{homework.title}
          </span>
        )}
      </div>

      {/* 날짜 선택 — 숙제는 날짜에 속하므로 날짜 변경 시 그 날짜의 숙제 목록으로 이동 */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <DateSelector date={sessionDate} onChange={d => navigate(`/class/${className}?date=${d}`)} />
        <span className="text-xs text-gray-400">채점 완료 {doneCount} / {entries.length}명</span>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">학생 {entries.length}명</p>
        <Link
          to={previewLink}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          평가서 미리보기 / PDF
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">이 반에 학생이 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {entries.map(({ student, records, record, unit }) => {
            const isAbsent = absentIds.has(student.id);
            const isExpanded = expandedStudentId === student.id;
            return (
              <div key={student.id} ref={el => { if (el) studentRowRefs.current[student.id] = el; }}>
                <div className="flex items-center px-5 py-4 gap-4">
                  <div className={`flex-1 min-w-0 ${isAbsent ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{student.name}</span>
                      {student.grade && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{student.grade}</span>}
                      {isAbsent && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">결석</span>
                      )}
                      {record?.clinic_flag && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">클리닉</span>
                      )}
                    </div>
                    {record ? (
                      <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
                        <span>{unit?.unit_name ?? '단원 없음'}</span>
                        <span className={record._kpi2 ? 'text-emerald-600 font-medium' : ''}>
                          {record._kpi2 ? '1차+2차' : '1차'}
                        </span>
                        <span>이행률 {pct(record._kpi1?.completion_rate ?? 0)}</span>
                        <span>정답률 {pct(record._kpi1?.accuracy_rate ?? 0)}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 mt-1">이 숙제 채점 기록 없음</div>
                    )}
                  </div>
                  <button type="button" onClick={() => toggleAbsence(student.id)} className="flex items-center gap-1.5 flex-shrink-0">
                    <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${isAbsent ? 'bg-red-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${isAbsent ? 'left-4' : 'left-0.5'}`} />
                    </div>
                    <span className={`text-xs font-medium transition-colors ${isAbsent ? 'text-red-600' : 'text-gray-400'}`}>
                      결석
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGrading(student.id)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                      isExpanded
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    }`}>
                    {isExpanded ? '닫기 ▲' : '채점 입력 ▼'}
                  </button>
                </div>

                {/* 인라인 채점 패널 */}
                {isExpanded && (
                  <div className="px-5 pb-5 bg-indigo-50/40 border-t border-indigo-100 pt-4">
                    <GradingPanel
                      units={units}
                      records={records}
                      pendingRecords={pendingRecords}
                      pendingLoading={pendingLoading}
                      onSaveFirst={(f, kpi1) => handleSaveFirst(student.id, f, kpi1)}
                      onSaveSecond={handleSaveSecond}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onClose={() => setExpandedStudentId(null)}
                      defaultUnit={sharedUnit}
                      onUnitChange={setSharedUnit}
                      onReadyForNext={handleReadyForNext}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 다음 학생 이동 확인 팝업 */}
      {nextStudentConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <p className="font-semibold text-gray-900 text-sm leading-relaxed">
              다음 <span className="text-indigo-700">{nextStudentConfirm.name}</span> 학생으로 이동하시겠습니까?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleNextStudentSkipped}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                건너뛰기
              </button>
              <button
                onClick={handleNextStudentConfirmed}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
