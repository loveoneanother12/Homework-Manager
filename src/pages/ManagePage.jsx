import { useState, useEffect } from 'react';
import {
  getClasses, getStudentsByClass,
  addStudent, addClass, updateClass, deleteClass, deleteStudent,
} from '../lib/store.js';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

function DayToggle({ value, onChange }) {
  const selected = value ? value.split(',').filter(Boolean) : [];
  function toggle(day) {
    const next = selected.includes(day)
      ? selected.filter(d => d !== day)
      : [...selected, day];
    onChange(DAYS.filter(d => next.includes(d)).join(','));
  }
  return (
    <div className="flex gap-1.5">
      {DAYS.map(d => (
        <button key={d} type="button" onClick={() => toggle(d)}
          className={`w-8 h-8 rounded-lg text-sm font-medium border transition-all ${
            selected.includes(d)
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}>
          {d}
        </button>
      ))}
    </div>
  );
}

function ClassForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    class_name:   initial?.class_name   ?? '',
    days_of_week: initial?.days_of_week ?? '',
    instructor:   initial?.instructor   ?? '',
  });
  const isEdit = !!initial?.id;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }}
      className="bg-white border border-indigo-100 rounded-xl p-5 mb-4 shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-800">{isEdit ? '반 편집' : '새 반 추가'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">반 이름</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.class_name}
            onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))}
            placeholder="예: 중2-A반" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">담당 강사</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.instructor}
            onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))}
            placeholder="예: 김수학" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">수업 요일</label>
        <DayToggle value={form.days_of_week} onChange={v => setForm(f => ({ ...f, days_of_week: v }))} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? '저장 중…' : isEdit ? '수정 저장' : '추가'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
          취소
        </button>
      </div>
    </form>
  );
}

export default function ManagePage() {
  const [classData, setClassData] = useState([]); // [{cls, studentCount}]
  const [loading, setLoading] = useState(true);

  // 반 관리
  const [classFormMode, setClassFormMode] = useState(null); // null | 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [classSaving, setClassSaving] = useState(false);

  // 학생 관리
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [addStudentName, setAddStudentName] = useState('');
  const [studentSaving, setStudentSaving] = useState(false);

  async function loadClasses() {
    const classes = await getClasses();
    const data = await Promise.all(
      classes.map(async cls => {
        const s = await getStudentsByClass(cls.class_name);
        return { cls, studentCount: s.length };
      })
    );
    return data;
  }

  useEffect(() => {
    setLoading(true);
    loadClasses().then(data => {
      setClassData(data);
      if (data.length) setSelectedClass(data[0].cls.class_name);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    setStudentsLoading(true);
    getStudentsByClass(selectedClass).then(s => {
      setStudents(s);
      setStudentsLoading(false);
    });
  }, [selectedClass]);

  // ── 반 핸들러 ──────────────────────────────────────────────────────────────

  async function handleSaveClass(form) {
    setClassSaving(true);
    try {
      if (editTarget) await updateClass(editTarget.id, form);
      else await addClass(form);
      setClassFormMode(null);
      setEditTarget(null);
      const data = await loadClasses();
      setClassData(data);
    } finally { setClassSaving(false); }
  }

  async function handleDeleteClass(cls, studentCount) {
    const msg = studentCount > 0
      ? `'${cls.class_name}'을(를) 삭제하면 소속 학생 ${studentCount}명과 채점 기록도 함께 삭제됩니다.\n계속하시겠습니까?`
      : `'${cls.class_name}'을(를) 삭제하시겠습니까?`;
    if (!confirm(msg)) return;
    await deleteClass(cls.id);
    const data = await loadClasses();
    setClassData(data);
    if (selectedClass === cls.class_name) {
      setSelectedClass(data[0]?.cls.class_name ?? '');
    }
  }

  // ── 학생 핸들러 ────────────────────────────────────────────────────────────

  async function handleAddStudent(e) {
    e.preventDefault();
    if (!addStudentName.trim() || !selectedClass) return;
    setStudentSaving(true);
    try {
      await addStudent({ name: addStudentName.trim(), class_name: selectedClass });
      setAddStudentName('');
      const s = await getStudentsByClass(selectedClass);
      setStudents(s);
      setClassData(prev => prev.map(d =>
        d.cls.class_name === selectedClass ? { ...d, studentCount: s.length } : d
      ));
    } finally { setStudentSaving(false); }
  }

  async function handleDeleteStudent(id, name) {
    if (!confirm(`'${name}' 학생을 삭제하시겠습니까?`)) return;
    await deleteStudent(id);
    setStudents(prev => prev.filter(s => s.id !== id));
    setClassData(prev => prev.map(d =>
      d.cls.class_name === selectedClass ? { ...d, studentCount: Math.max(0, d.studentCount - 1) } : d
    ));
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">학생/반 관리</h1>

      {/* ── 반 관리 ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">반 관리</h2>
          <button
            onClick={() => { setEditTarget(null); setClassFormMode('add'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            + 반 추가
          </button>
        </div>

        {(classFormMode === 'add' || classFormMode === 'edit') && (
          <ClassForm
            key={editTarget?.id ?? 'new'}
            initial={editTarget}
            onSave={handleSaveClass}
            onCancel={() => { setClassFormMode(null); setEditTarget(null); }}
            saving={classSaving}
          />
        )}

        {classData.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-xl">
            반이 없습니다. '+ 반 추가'로 첫 번째 반을 만들어보세요.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {classData.map(({ cls, studentCount }) => {
              const days = cls.days_of_week?.split(',').filter(Boolean) ?? [];
              return (
                <div key={cls.id} className="flex items-center px-5 py-4 gap-4">
                  <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-900">{cls.class_name}</span>
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
                    <span className="text-xs text-gray-400">학생 {studentCount}명</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditTarget(cls); setClassFormMode('edit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors font-medium">
                      편집
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls, studentCount)}
                      className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded hover:bg-red-50 hover:text-red-600 transition-colors">
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 학생 관리 ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">학생 관리</h2>

        {classData.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-xl">
            반을 먼저 추가해야 학생을 관리할 수 있습니다.
          </div>
        ) : (
          <>
            {/* 반 선택 탭 */}
            <div className="flex gap-2 flex-wrap mb-4">
              {classData.map(({ cls }) => (
                <button key={cls.id} onClick={() => setSelectedClass(cls.class_name)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    selectedClass === cls.class_name
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}>
                  {cls.class_name}
                </button>
              ))}
            </div>

            {/* 학생 추가 폼 */}
            <form onSubmit={handleAddStudent} className="flex gap-2 items-center mb-4">
              <input
                type="text"
                value={addStudentName}
                onChange={e => setAddStudentName(e.target.value)}
                placeholder="학생 이름"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button type="submit" disabled={studentSaving || !addStudentName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {studentSaving ? '저장 중…' : '+ 추가'}
              </button>
            </form>

            {/* 학생 목록 */}
            {studentsLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">불러오는 중…</div>
            ) : students.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-xl">
                {selectedClass}에 학생이 없습니다.
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                {students.map(s => (
                  <div key={s.id} className="flex items-center px-5 py-3 gap-4">
                    <span className="flex-1 text-sm font-medium text-gray-900">{s.name}</span>
                    <button onClick={() => handleDeleteStudent(s.id, s.name)}
                      className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded hover:bg-red-50 hover:text-red-600 transition-colors">
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
