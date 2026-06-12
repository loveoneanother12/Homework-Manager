import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  getClassByName, getStudentsByClassId, getRecordsByStudentIds, getUnits,
  getAbsentStudentIds, setAbsence, getHomework,
} from '../lib/store.js';
import { pct } from '../lib/kpi.js';
import { today } from '../lib/dateUtils.js';
import DateSelector from '../components/DateSelector.jsx';

export default function StudentList() {
  const { className, homeworkId } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(className);

  const [searchParams] = useSearchParams();
  const sessionDate = searchParams.get('date') ?? today();
  const { key: locationKey } = useLocation();

  const [entries, setEntries] = useState([]); // [{student, record, unit}]
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState(null);
  const [homework, setHomework] = useState(null);
  const [absentIds, setAbsentIds] = useState(new Set());

  async function refresh() {
    setLoading(true);
    try {
      const [cls, hw] = await Promise.all([getClassByName(decoded), getHomework(homeworkId)]);
      const resolvedClassId = cls?.id ?? null;
      setClassId(resolvedClassId);
      setHomework(hw);
      const students = resolvedClassId ? await getStudentsByClassId(resolvedClassId) : [];
      const [allRecords, units, absentList] = await Promise.all([
        getRecordsByStudentIds(students.map(s => s.id), sessionDate, resolvedClassId, homeworkId),
        getUnits(),
        resolvedClassId ? getAbsentStudentIds(resolvedClassId, sessionDate) : [],
      ]);
      setAbsentIds(new Set(absentList));
      const unitsById = Object.fromEntries(units.map(u => [u.id, u]));

      setEntries(students.map(student => {
        const recs = allRecords.filter(r => r.student_id === student.id);
        const latest = recs[0] ?? null; // already sorted desc
        return {
          student,
          record: latest,
          unit: latest ? (unitsById[latest.unit_id] ?? null) : null,
        };
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [decoded, homeworkId, sessionDate, locationKey]);

  async function toggleAbsence(studentId) {
    const next = !absentIds.has(studentId);
    setAbsentIds(prev => {
      const s = new Set(prev);
      if (next) s.add(studentId); else s.delete(studentId);
      return s;
    });
    await setAbsence(classId, studentId, sessionDate, next);
  }

  const gradingLink = (studentId) => `/student/${studentId}/grade?date=${sessionDate}&class=${encodeURIComponent(decoded)}&hw=${homeworkId}`;
  const previewLink = `/class/${className}/hw/${homeworkId}/preview?date=${sessionDate}`;

  const doneCount = entries.filter(e => e.record).length;

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/class/${className}?date=${sessionDate}`)} className="text-gray-400 hover:text-gray-600 text-sm">← 숙제 목록</button>
        <h1 className="text-2xl font-bold text-gray-900">{decoded}</h1>
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
          {entries.map(({ student, record, unit }) => {
            const isAbsent = absentIds.has(student.id);
            return (
              <div key={student.id} className="flex items-center px-5 py-4 gap-4">
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
                    <div className="text-xs text-gray-400 mt-1">이 날짜 채점 기록 없음</div>
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
                <div className="flex gap-2">
                  <Link
                    to={gradingLink(student.id)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium hover:bg-indigo-100 transition-colors"
                  >
                    채점 입력
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
