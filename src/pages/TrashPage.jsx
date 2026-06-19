import { useState, useEffect, useCallback } from 'react';
import {
  getDeletedClasses, getDeletedStudents, getDeletedRecords,
  getAllClassesIncludingDeleted, getAllStudentsIncludingDeleted, getUnits,
  getHomeworksByIds, getDeletedHomeworks,
  restoreClass, restoreStudent, restoreRecord, restoreHomework,
  purgeClass, purgeStudent, purgeRecord, purgeHomework,
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
  const [homeworksById, setHomeworksById] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedGroupKey, setSelectedGroupKey] = useState(null); // '반|날짜|숙제' 그룹 키

  const [deletedHomeworks, setDeletedHomeworks] = useState([]);

  const refresh = useCallback(async () => {
    const [dc, ds, dr, dh, ac, as, u] = await Promise.all([
      getDeletedClasses(), getDeletedStudents(), getDeletedRecords(), getDeletedHomeworks(),
      getAllClassesIncludingDeleted(), getAllStudentsIncludingDeleted(), getUnits(),
    ]);
    setDeletedClasses(dc);
    setDeletedStudents(ds);
    setDeletedRecords(dr);
    setDeletedHomeworks(dh);
    setAllClasses(ac);
    setAllStudents(as);
    setUnits(u);
    const hwIds = [...new Set(dr.map(r => r.homework_id).filter(Boolean))];
    const hws = await getHomeworksByIds(hwIds);
    setHomeworksById({
      ...Object.fromEntries(hws.map(h => [h.id, h])),
      ...Object.fromEntries(dh.map(h => [h.id, h])),
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const classById = Object.fromEntries(allClasses.map(c => [c.id, c]));
  const studentById = Object.fromEntries(allStudents.map(s => [s.id, s]));
  const unitById = Object.fromEntries(units.map(u => [u.id, u]));

  // 삭제된 채점 기록을 숙제 카드 단위로 그룹핑 (반, 날짜, 숙제)
  const recordGroups = {};
  for (const r of deletedRecords) {
    const key = `${r.class_id ?? 'none'}|${r.session_date}|${r.homework_id ?? 'none'}`;
    if (!recordGroups[key]) {
      recordGroups[key] = {
        key,
        records: [],
        cls: r.class_id ? classById[r.class_id] : null,
        hw: r.homework_id ? homeworksById[r.homework_id] : null,
        date: r.session_date,
      };
    }
    recordGroups[key].records.push(r);
  }
  // 휴지통에 있는 숙제는 기록이 없어도 카드로 표시
  for (const hw of deletedHomeworks) {
    const key = `${hw.class_id}|${hw.session_date}|${hw.id}`;
    if (!recordGroups[key]) {
      recordGroups[key] = { key, records: [], cls: classById[hw.class_id] ?? null, hw, date: hw.session_date };
    } else if (!recordGroups[key].hw) {
      recordGroups[key].hw = hw;
    }
  }
  const groupList = Object.values(recordGroups).map(g => ({
    ...g,
    studentNames: [...new Set(g.records.map(r => r.student_id))]
      .map(id => studentById[id]?.name ?? '알 수 없음'),
  }));

  const selected = selectedGroupKey
    ? groupList.find(g => g.key === selectedGroupKey) ?? null
    : null;

  useEffect(() => {
    // 복원/완전 삭제로 그룹이 사라지면 모달 닫기
    if (selectedGroupKey && !recordGroups[selectedGroupKey]) setSelectedGroupKey(null);
  }, [deletedRecords, deletedHomeworks]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // 기록이 속한 반/학생이 아직 휴지통에 있으면 복원 불가 — 먼저 복원해야 함
    const cls = record.class_id ? classById[record.class_id] : null;
    if (cls?.deleted_at) {
      alert(`해당 기록의 '${cls.class_name}' 반이 휴지통에 있어 복원이 불가능합니다.\n먼저 '${cls.class_name}' 반을 복원한 뒤 다시 시도해주세요.`);
      return;
    }
    const stu = studentById[record.student_id];
    if (stu?.deleted_at) {
      alert(`해당 기록의 '${stu.name}' 학생이 휴지통에 있어 복원이 불가능합니다.\n먼저 '${stu.name}' 학생을 복원한 뒤 다시 시도해주세요.`);
      return;
    }
    const hw = record.homework_id ? homeworksById[record.homework_id] : null;
    if (hw?.deleted_at) {
      alert(`해당 기록의 '${hw.title}' 숙제가 휴지통에 있어 복원이 불가능합니다.\n먼저 '${hw.title}' 숙제를 복원한 뒤 다시 시도해주세요.`);
      return;
    }
    if (await recordConflictExists(record)) {
      alert('이미 해당 날짜에 입력된 데이터가 있어 복원이 불가합니다.');
      return;
    }
    await restoreRecord(record.id);
    await refresh();
  }

  async function handleRestoreAllRecords({ records, cls, hw }) {
    if (cls?.deleted_at) {
      alert(`'${cls.class_name}' 반이 휴지통에 있어 복원이 불가능합니다.\n먼저 반을 복원해주세요.`);
      return;
    }
    if (hw?.deleted_at) {
      alert(`'${hw.title}' 숙제가 휴지통에 있어 복원이 불가능합니다.\n먼저 숙제를 복원해주세요.`);
      return;
    }
    let skipped = 0;
    for (const record of records) {
      const stu = studentById[record.student_id];
      if (stu?.deleted_at) { skipped++; continue; }
      if (await recordConflictExists(record)) { skipped++; continue; }
      await restoreRecord(record.id);
    }
    if (skipped > 0) alert(`${records.length - skipped}건 복원 완료. ${skipped}건은 충돌 또는 학생 삭제로 건너뛰었습니다.`);
    await refresh();
  }

  async function handleRestoreHomework(hw) {
    const cls = classById[hw.class_id];
    if (cls?.deleted_at) {
      alert(`해당 숙제의 '${cls.class_name}' 반이 휴지통에 있어 복원이 불가능합니다.\n먼저 '${cls.class_name}' 반을 복원한 뒤 다시 시도해주세요.`);
      return;
    }
    await restoreHomework(hw);
    await refresh();
  }

  // ── 완전 삭제 ──────────────────────────────────────────────────────────────

  const PURGE_MSG = '해당 데이터가 완전히 삭제되며 복구가 불가능합니다. 그래도 삭제하시겠습니까?';

  async function handlePurgeClass(cls) {
    if (!confirm(PURGE_MSG)) return;
    await purgeClass(cls.id);
    await refresh();
  }

  async function handlePurgeStudent(student) {
    if (!confirm(PURGE_MSG)) return;
    await purgeStudent(student.id);
    await refresh();
  }

  async function handlePurgeRecord(record) {
    if (!confirm(PURGE_MSG)) return;
    await purgeRecord(record.id);
    await refresh();
  }

  async function handlePurgeHomework(hw) {
    if (!confirm(PURGE_MSG)) return;
    await purgeHomework(hw.id);
    await refresh();
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  const isEmpty = deletedRecords.length === 0 && deletedClasses.length === 0
    && deletedStudents.length === 0 && deletedHomeworks.length === 0;

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

      {/* ── 1) 채점 정보 (숙제 카드 단위) ── */}
      {groupList.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">채점 정보</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupList.map(({ key, records, cls, hw, date, studentNames }) => {
              const isSelected = selectedGroupKey === key;
              return (
                <div
                  key={key}
                  onClick={() => records.length > 0 && setSelectedGroupKey(isSelected ? null : key)}
                  className={`bg-white border rounded-xl p-5 transition-all ${records.length > 0 ? 'cursor-pointer' : ''} ${
                    isSelected ? 'border-indigo-400 shadow-sm' : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}>
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-800 text-base">
                      {hw ? (
                        <>
                          {hw.title}
                          <span className="block text-sm font-normal text-gray-400 mt-0.5">
                            {date}
                            <span className="mx-1.5 text-gray-300">|</span>
                            {cls?.class_name ?? '반 미지정'}
                          </span>
                        </>
                      ) : '숙제 미지정'}
                    </h3>
                    <span className="text-xl opacity-50">🗑</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-1.5">학생 {studentNames.length}명 · 기록 {records.length}건</p>
                  <div className="flex gap-1 flex-wrap">
                    {studentNames.map((name, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{name}</span>
                    ))}
                  </div>
                  {cls?.deleted_at && (
                    <p className="text-xs text-amber-600 mt-2">이 반도 휴지통에 있음</p>
                  )}
                  <div className="flex justify-end gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
                    {hw?.deleted_at ? (
                      /* 숙제 자체가 휴지통에 있으면 숙제 단위 복원/완전 삭제 */
                      <>
                        <button
                          onClick={() => handleRestoreHomework(hw)}
                          className="px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors font-medium">
                          복원
                        </button>
                        <button
                          onClick={() => handlePurgeHomework(hw)}
                          className="px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors font-medium">
                          완전 삭제
                        </button>
                      </>
                    ) : (
                      /* 채점 기록만 휴지통에 있는 경우 — 전체 복원 */
                      <button
                        onClick={() => handleRestoreAllRecords({ records, cls, hw })}
                        className="px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors font-medium">
                        전체 복원
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-400">숙제를 복원하면 함께 삭제된 채점 기록도 같이 복원됩니다. 카드를 클릭하면 학생별 데이터를 볼 수 있습니다.</p>
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
                  <button
                    onClick={() => handlePurgeClass(cls)}
                    className="px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors font-medium flex-shrink-0">
                    완전 삭제
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
                <button
                  onClick={() => handlePurgeStudent(s)}
                  className="px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors font-medium flex-shrink-0">
                  완전 삭제
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">학생을 복원하면 함께 삭제된 채점 기록과 반 소속도 같이 복원됩니다.</p>
        </section>
      )}

      {/* ── 채점 정보 하단 모달 (좌우 스크롤, 평가서 모양) ── */}
      {selected && selected.records.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedGroupKey(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h3 className="font-bold text-gray-800">
                  {selected.hw ? (
                    <>
                      {selected.hw.title} — 삭제된 채점 기록
                      <span className="block text-sm font-normal text-gray-400 mt-0.5">
                        {selected.date}
                        <span className="mx-1.5 text-gray-300">|</span>
                        {selected.cls?.class_name ?? '반 미지정'}
                      </span>
                    </>
                  ) : '숙제 미지정 — 삭제된 채점 기록'}
                </h3>
                <span className="text-xs text-gray-400">학생 {selected.studentNames.length}명 · {selected.records.length}건</span>
              </div>
              <button
                onClick={() => setSelectedGroupKey(null)}
                className="text-gray-400 hover:text-gray-600 text-sm">
                ✕ 닫기
              </button>
            </div>
            {selected.cls?.deleted_at && (
              <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                이 반은 휴지통에 있습니다. '반 정보'에서 반을 복원하면 함께 삭제된 기록이 한 번에 복원됩니다.
              </div>
            )}
            {selected.hw?.deleted_at && (
              <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                이 숙제는 휴지통에 있습니다. 숙제 카드의 '복원'을 누르면 함께 삭제된 기록이 한 번에 복원됩니다.
              </div>
            )}
            {/* 좌우 스크롤 카드 목록 */}
            <div className="overflow-x-auto px-6 py-5">
              <div className="flex gap-5 w-max">
                {selected.records.map(r => {
                  const student = studentById[r.student_id];
                  return (
                    <div key={r.id} className="flex flex-col gap-2 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          삭제일 {fmtDate(r.deleted_at)}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleRestoreRecord(r)}
                            className="px-3 py-1 text-xs text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors font-medium">
                            복원
                          </button>
                          <button
                            onClick={() => handlePurgeRecord(r)}
                            className="px-3 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors font-medium">
                            완전 삭제
                          </button>
                        </div>
                      </div>
                      {student ? (
                        <GradingCard
                          record={r}
                          student={student}
                          unit={unitById[r.unit_id] ?? null}
                          classLabel={selected.cls?.class_name}
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
