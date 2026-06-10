import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getStudent, getRecordsByStudent, getClasses, getUnits } from '../lib/store.js';
import GradingCard from '../components/GradingCard.jsx';

export default function StudentHistory() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [groups, setGroups] = useState([]); // [{cls, records: [{...r, _unit}]}]
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, records, classes, units] = await Promise.all([
        getStudent(studentId),
        getRecordsByStudent(studentId), // sessionDate·classId 필터 없음 → 전체
        getClasses(),
        getUnits(),
      ]);

      setStudent(s);
      setTotalCount(records.length);

      const classById = Object.fromEntries(classes.map(c => [c.id, c]));
      const unitsById = Object.fromEntries(units.map(u => [u.id, u]));

      // 반별 그룹핑 (created_at desc 이미 정렬된 상태)
      const groupMap = {};
      for (const r of records) {
        const key = r.class_id ?? '__none__';
        if (!groupMap[key]) groupMap[key] = [];
        groupMap[key].push({ ...r, _unit: unitsById[r.unit_id] ?? null });
      }

      // 반 순서 유지 (클래스 생성 순)
      const result = classes
        .filter(c => groupMap[c.id])
        .map(c => ({ cls: c, records: groupMap[c.id] }));

      if (groupMap['__none__']?.length) {
        result.push({ cls: null, records: groupMap['__none__'] });
      }

      setGroups(result);
      setLoading(false);
    })();
  }, [studentId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
      불러오는 중…
    </div>
  );

  if (!student) return (
    <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
      학생 정보를 불러올 수 없습니다.
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* 헤더 */}
      <div className="mb-8 pb-5 border-b border-gray-200">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
          {student.grade && (
            <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {student.grade}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-400">
          {totalCount > 0 ? `총 ${totalCount}건의 채점 기록` : '채점 기록이 없습니다.'}
        </p>
      </div>

      {groups.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-3xl mb-3">📝</p>
          <p className="text-sm">채점 기록이 없습니다.</p>
        </div>
      )}

      {/* 반별 섹션 */}
      {groups.map(({ cls, records }) => (
        <section key={cls?.id ?? '__none__'} className="mb-12">
          {/* 반 제목 */}
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-base font-semibold text-gray-700">
              {cls?.class_name ?? '반 미지정'}
            </h2>
            {cls?.instructor && (
              <span className="text-xs text-gray-400">{cls.instructor}</span>
            )}
            <span className="text-xs text-gray-400">{records.length}건</span>
            <div className="flex-1 border-b border-gray-200" />
          </div>

          {/* 카드 목록 (최신순) */}
          <div className="flex flex-col gap-6">
            {records.map(r => (
              <div key={r.id}>
                <p className="text-xs text-gray-400 mb-2 font-medium">{r.session_date}</p>
                <GradingCard record={r} student={student} unit={r._unit} editable={false} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
