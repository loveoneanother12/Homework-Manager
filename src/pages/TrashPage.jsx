import { useState, useEffect, useCallback } from 'react';
import {
  getDeletedClasses, getDeletedStudents, getDeletedRecords,
  getAllClassesIncludingDeleted, getAllStudentsIncludingDeleted, getUnits,
  restoreClass, restoreStudent, restoreRecord,
  classNameExists, studentNameExists, recordConflictExists,
} from '../lib/store.js';
import GradingCard from '../components/GradingCard.jsx';

const fmtDate = ts => ts?.slice(0, 10) ?? '';

export default function TrashPage() {
  const [deletedClasses, setDeletedClasses] = useState([]);
  const [deletedStudents, setDeletedStudents] = useState([]);
  const [deletedRecords, setDeletedRecords] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassKey, setSelectedClassKey] = useState(null); // class_id 또는 '__none__'

  const refresh = useCallback(async () => {
    const [dc, ds, dr, ac, as, u] = await Promise.all([
      getDeletedClasses(), getDeletedStudents(), getDeletedRecords(),
      getAllClassesIncludingDeleted(), getAllStudentsIncludingDeleted(), getUnits(),
    ]);
    setDeletedClasses(dc);
    setDeletedStudents(ds);
    setDeletedRecords(dr);
    setAllClasses(ac);
    setAllStudents(as);
    setUnits(u);
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const classById = Object.fromEntries(allClasses.map(c => [c.id, c]));
  const studentById = Object.fromEntries(allStudents.map(s => [s.id, s]));
  const unitById = Object.fromEntries(units.map(u => [u.id, u]));

  // 삭제된 채점 기록을 반별로 그룹핑
  const recordGroups = {};
  for (const r of deletedRecords) {
    const key = r.class_id ?? '__none__';
    if (!recordGroups[key]) recordGroups[key] = [];
    recordGroups[key].push(r);
  }
  const groupKeys = Object.keys(recordGroups);

  const selectedRecords = selectedClassKey ? (recordGroups[selectedClassKey] ?? []) : [];
  const selectedClass = selectedClassKey && selectedClassKey !== '__none__'
    ? classById[selectedClassKey] : null;

  useEffect(() => {
    // 복원으로 그룹이 비면 모달 닫기
    if (selectedClassKey && !recordGroups[selectedClassKey]) setSelectedClassKey(null);
  }, [deletedRecords]); // eslint-disable-line react-hooks/exhaustive-deps

  // '(구) 이름'도 이미 쓰이고 있으면 '(구2) 이름', '(구3) 이름'… 으로 회피
  async function availableRestoreName(name, existsFn) {
    let candidate = `(구) ${name}`;
    let n = 2;
    while (await existsFn(candidate)) candidate = `(구${n++}) ${name}`;
    return candidate;
  }

  async function handleRestoreClass(cls) {
    let newName = null;
    if (await classNameExists(cls.class_name)) {
      newName = await availableRestoreName(cls.class_name, classNameExists);
      alert(`같은 이름의 반이 이미 있습니다. '${newName}' 이름으로 복원합니다.`);
    }
    await restoreClass(cls, newName);
    await refresh();
  }

  async function handleRestoreStudent(student) {
    let newName = null;
    if (await studentNameExists(student.name)) {
      newName = await availableRestoreName(student.name, studentNameExists);
      alert(`같은 이름의 학생이 이미 있습니다. '${newName}' 이름으로 복원합니다.`);
    }
    await restoreStudent(student, newName);
    await refresh();
  }

  async function handleRestoreRecord(record) {
    if (await recordConflictExists(record)) {
      alert('이미 해당 날짜에 입력된 데이터가 있어 복원이 불가합니다.');
      return;
    }
    await restoreRecord(record.id);
    await refresh();
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  const isEmpty = deletedRecords.length === 0 && deletedClasses.length === 0 && deletedStudents.length === 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-700">휴지통</h1>
        <p className="mt-1 text-sm text-gray-400">삭제된 항목이 보관됩니다. 복원하면 원래 자리로 돌아갑니다.</p>
      </div>

      {isEmpty && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-3xl mb-3">🗑</p>
          <p className="text-sm">휴지통이 비어 있습니다.</p>
        </div>
      )}

      {/* ── 1) 채점 정보 ── */}
      {groupKeys.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">채점 정보</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupKeys.map(key => {
              const cls = key !== '__none__' ? classById[key] : null;
              const records = recordGroups[key];
              const isSelected = selectedClassKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedClassKey(isSelected ? null : key)}
                  className={`block text-left bg-white border rounded-xl p-5 transition-all ${
                    isSelected ? 'border-indigo-400 shadow-sm' : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 text-base">
                      {cls?.class_name ?? '반 미지정'}
                    </h3>
                    <span className="text-xl opacity-50">🗑</span>
                  </div>
                  {cls?.instructor && (
                    <p className="text-xs text-gray-500 mb-1">강사 {cls.instructor}</p>
                  )}
                  <p className="text-xs text-gray-400">삭제된 채점 기록 {records.length}건</p>
                  {cls?.deleted_at && (
                    <p className="text-xs text-amber-600 mt-1.5">이 반도 휴지통에 있음</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 2) 반 정보 ── */}
      {deletedClasses.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">반 정보</h2>
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden bg-white">
            {deletedClasses.map(cls => {
              const days = cls.days_of_week?.split(',').filter(Boolean) ?? [];
              return (
                <div key={cls.id} className="flex items-center px-5 py-4 gap-4">
                  <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-700">{cls.class_name}</span>
                    {cls.instructor && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{cls.instructor}</span>
                    )}
                    {days.length > 0 && (
                      <div className="flex gap-1">
                        {days.map(d => (
                          <span key={d} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{d}</span>
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-gray-400">삭제일 {fmtDate(cls.deleted_at)}</span>
                  </div>
                  <button
                    onClick={() => handleRestoreClass(cls)}
                    className="px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors font-medium flex-shrink-0">
                    복원
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-400">반을 복원하면 함께 삭제된 채점 기록도 같이 복원됩니다.</p>
        </section>
      )}

      {/* ── 3) 학생 정보 ── */}
      {deletedStudents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">학생 정보</h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {deletedStudents.map(s => (
              <div key={s.id} className="flex items-center px-5 py-3 gap-3">
                <span className="font-medium text-gray-700 w-20 flex-shrink-0">{s.name}</span>
                {s.grade
                  ? <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">{s.grade}</span>
                  : <span className="w-10 flex-shrink-0" />
                }
                {s.school && (
                  <span className="text-xs text-gray-500 flex-shrink-0">{s.school}</span>
                )}
                <span className="flex-1 text-xs text-gray-400 text-right">삭제일 {fmtDate(s.deleted_at)}</span>
                <button
                  onClick={() => handleRestoreStudent(s)}
                  className="px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors font-medium flex-shrink-0">
                  복원
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">학생을 복원하면 함께 삭제된 채점 기록과 반 소속도 같이 복원됩니다.</p>
        </section>
      )}

      {/* ── 채점 정보 하단 모달 (좌우 스크롤) ── */}
      {selectedClassKey && selectedRecords.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedClassKey(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-baseline gap-3">
                <h3 className="font-bold text-gray-800">
                  {selectedClass?.class_name ?? '반 미지정'} — 삭제된 채점 기록
                </h3>
                <span className="text-xs text-gray-400">{selectedRecords.length}건</span>
              </div>
              <button
                onClick={() => setSelectedClassKey(null)}
                className="text-gray-400 hover:text-gray-600 text-sm">
                ✕ 닫기
              </button>
            </div>
            {selectedClass?.deleted_at && (
              <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                이 반은 휴지통에 있습니다. '반 정보'에서 반을 복원하면 함께 삭제된 기록이 한 번에 복원됩니다.
              </div>
            )}
            {/* 좌우 스크롤 카드 목록 */}
            <div className="overflow-x-auto px-6 py-5">
              <div className="flex gap-5 w-max">
                {selectedRecords.map(r => {
                  const student = studentById[r.student_id];
                  return (
                    <div key={r.id} className="flex flex-col gap-2 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          수업일 {r.session_date} · 삭제일 {fmtDate(r.deleted_at)}
                        </span>
                        <button
                          onClick={() => handleRestoreRecord(r)}
                          className="px-3 py-1 text-xs text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors font-medium">
                          복원
                        </button>
                      </div>
                      {student ? (
                        <GradingCard
                          record={r}
                          student={student}
                          unit={unitById[r.unit_id] ?? null}
                          editable={false}
                        />
                      ) : (
                        <div className="w-[378px] h-40 flex items-center justify-center text-xs text-gray-400 border border-gray-200 rounded-lg">
                          학생 정보를 찾을 수 없습니다.
                        </div>
                      )}
                      {student?.deleted_at && (
                        <p className="text-xs text-amber-600">
                          '{student.name}' 학생도 휴지통에 있음
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
