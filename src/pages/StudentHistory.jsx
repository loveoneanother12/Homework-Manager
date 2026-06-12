import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  getStudent, updateStudent, getRecordsByStudent, getClasses, getUnits,
  addStudentToClass, removeStudentFromClass, getAllClassMemberships,
} from '../lib/store.js';
import GradingCard from '../components/GradingCard.jsx';

const GRADES = ['초1','초2','초3','초4','초5','초6','중1','중2','중3'];

function EditStudentForm({ student, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ name: student.name, grade: student.grade ?? '', school: student.school ?? '' });
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }}
      className="mt-3 bg-white border border-indigo-100 rounded-xl p-5 shadow-sm space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">학생 이름</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
            required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">학년</label>
          <select
            value={form.grade}
            onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">학년 선택</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">학교</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.school}
            onChange={e => setForm(f => ({ ...f, school: e.target.value }))}
            placeholder="예: 대치중학교" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !form.name.trim()}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? '저장 중…' : '저장'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
          취소
        </button>
      </div>
    </form>
  );
}

export default function StudentHistory() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [groups, setGroups] = useState([]); // [{cls, records: [{...r, _unit}]}]
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 수강 반 관리
  const [allClasses, setAllClasses] = useState([]);
  const [studentClassIds, setStudentClassIds] = useState(new Set());
  const [classSearch, setClassSearch] = useState('');

  useEffect(() => {
    (async () => {
      const [s, records, classes, units, memberships] = await Promise.all([
        getStudent(studentId),
        getRecordsByStudent(studentId),
        getClasses(),
        getUnits(),
        getAllClassMemberships(),
      ]);

      setStudent(s);
      setTotalCount(records.length);
      setAllClasses(classes);
      setStudentClassIds(new Set(
        memberships.filter(m => m.student_id === studentId).map(m => m.class_id)
      ));

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

  async function handleAddToClass(cls) {
    await addStudentToClass(cls.id, studentId);
    setStudentClassIds(prev => new Set([...prev, cls.id]));
    setClassSearch('');
  }

  async function handleRemoveFromClass(cls) {
    if (!confirm(`'${cls.class_name}'에서 이 학생을 제외하시겠습니까?`)) return;
    await removeStudentFromClass(cls.id, studentId);
    setStudentClassIds(prev => { const next = new Set(prev); next.delete(cls.id); return next; });
  }

  async function handleSave(form) {
    setSaving(true);
    try {
      const updated = await updateStudent(student.id, { name: form.name.trim(), grade: form.grade || null, school: form.school.trim() || null });
      setStudent(updated);
      setEditing(false);
    } finally { setSaving(false); }
  }

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
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-3 flex-1 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
            {student.grade && (
              <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {student.grade}
              </span>
            )}
            {student.school && (
              <span className="text-sm text-gray-500">{student.school}</span>
            )}
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors font-medium">
              수정
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-400">
          {totalCount > 0 ? `총 ${totalCount}건의 채점 기록` : '채점 기록이 없습니다.'}
        </p>
        {editing && (
          <>
            <EditStudentForm
              student={student}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
              saving={saving}
            />
            {/* 수강 반 관리 */}
            <div className="mt-3 bg-white border border-indigo-100 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-800 text-sm">수강 반 관리</h3>

              {/* 현재 수강 반 */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">현재 수강 반</p>
                {studentClassIds.size === 0 ? (
                  <p className="text-xs text-gray-400">배정된 반이 없습니다.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allClasses.filter(c => studentClassIds.has(c.id)).map(c => (
                      <div key={c.id}
                        className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full pl-3 pr-1.5 py-1">
                        <span className="text-sm text-indigo-800 font-medium">{c.class_name}</span>
                        {c.instructor && <span className="text-xs text-indigo-400">{c.instructor}</span>}
                        <button
                          type="button"
                          onClick={() => handleRemoveFromClass(c)}
                          className="text-indigo-300 hover:text-red-500 transition-colors text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 반 추가 검색 */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">반 추가</p>
                <input
                  type="text"
                  value={classSearch}
                  onChange={e => setClassSearch(e.target.value)}
                  placeholder="반 이름으로 검색…"
                  className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {classSearch.trim() && (() => {
                  const results = allClasses.filter(
                    c => !studentClassIds.has(c.id) && c.class_name.includes(classSearch.trim())
                  );
                  return (
                    <div className="mt-2">
                      {results.length === 0 ? (
                        <p className="text-xs text-gray-400">
                          {allClasses.some(c => c.class_name.includes(classSearch.trim()))
                            ? '이미 수강 중인 반입니다.'
                            : '검색 결과 없음'}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {results.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleAddToClass(c)}
                              className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-left hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-full max-w-xs">
                              <span className="text-sm font-medium text-gray-800">{c.class_name}</span>
                              {c.instructor && (
                                <span className="text-xs text-gray-400">{c.instructor}</span>
                              )}
                              {c.days_of_week && (
                                <div className="flex gap-1 ml-auto">
                                  {c.days_of_week.split(',').filter(Boolean).map(d => (
                                    <span key={d} className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">{d}</span>
                                  ))}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        )}
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
                <GradingCard record={r} student={student} unit={r._unit} classLabel={cls?.class_name} editable={false} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
