import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getStudentsByClass, getRecordsByStudentIds, getUnits, deleteStudent } from '../lib/store.js';
import { pct } from '../lib/kpi.js';

export default function StudentList() {
  const { className } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(className);

  const [entries, setEntries] = useState([]); // [{student, record, recordCount, unit}]
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const students = await getStudentsByClass(decoded);
      const [allRecords, units] = await Promise.all([
        getRecordsByStudentIds(students.map(s => s.id)),
        getUnits(),
      ]);
      const unitsById = Object.fromEntries(units.map(u => [u.id, u]));

      setEntries(students.map(student => {
        const recs = allRecords.filter(r => r.student_id === student.id);
        const latest = recs[0] ?? null; // already sorted desc
        return {
          student,
          record: latest,
          recordCount: recs.length,
          unit: latest ? (unitsById[latest.unit_id] ?? null) : null,
        };
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [decoded]);

  async function handleDelete(id, name) {
    if (!confirm(`'${name}' 학생을 삭제하시겠습니까?`)) return;
    await deleteStudent(id);
    await refresh();
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm">← 반 목록</button>
        <h1 className="text-2xl font-bold text-gray-900">{decoded}</h1>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">학생 {entries.length}명</p>
        <Link
          to={`/class/${className}/preview`}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          반 평가서 미리보기 / PDF
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">이 반에 학생이 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {entries.map(({ student, record, recordCount, unit }) => (
            <div key={student.id} className="flex items-center px-5 py-4 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{student.name}</span>
                  {record?.clinic_flag && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">클리닉</span>
                  )}
                  {recordCount > 0 && (
                    <span className="text-xs text-gray-400">채점 {recordCount}건</span>
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
                    <span className="text-gray-400">{record.created_at?.slice(0, 10)}</span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 mt-1">채점 기록 없음</div>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/student/${student.id}/grade`}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium hover:bg-indigo-100 transition-colors"
                >
                  채점 입력
                </Link>
                <button
                  onClick={() => handleDelete(student.id, student.name)}
                  className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded text-xs hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
