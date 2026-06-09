import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getClasses, getStudentsByClass, addStudent, addClass, updateClass } from '../lib/store.js';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const CLASS_EMPTY = { class_name: '', days_of_week: '', instructor: '' };

function DayToggle({ value, onChange }) {
  const selected = value ? value.split(',').filter(Boolean) : [];
  function toggle(day) {
    const next = selected.includes(day)
      ? selected.filter(d => d !== day)
      : [...selected, day];
    // 요일 순서 유지 (월~일)
    onChange(DAYS.filter(d => next.includes(d)).join(','));
  }
  return (
    <div className="flex gap-1.5">
      {DAYS.map(d => (
        <button key={d} type="button" onClick={() => toggle(d)}
          className={`w-8 h-8 rounded-lg text-sm font-medium border transition-all ${selected.includes(d) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
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
      className="bg-white border border-indigo-100 rounded-xl p-5 mb-6 shadow-sm space-y-4">
      <h2 className="font-semibold text-gray-800">{isEdit ? '반 편집' : '새 반 추가'}</h2>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">반 이름</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.class_name}
          onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))}
          placeholder="예: 중2-A반"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">수업 요일</label>
        <DayToggle value={form.days_of_week} onChange={v => setForm(f => ({ ...f, days_of_week: v }))} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">담당 강사</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.instructor}
          onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))}
          placeholder="예: 김수학"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? '저장 중…' : isEdit ? '수정 저장' : '추가'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
          취소
        </button>
      </div>
    </form>
  );
}

export default function ClassList() {
  const [classData, setClassData] = useState([]); // [{cls, students}]
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState(null); // null | 'add_class' | 'edit_class' | 'add_student'
  const [editTarget, setEditTarget] = useState(null);
  const [studentForm, setStudentForm] = useState({ name: '', class_name: '' });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const classes = await getClasses();
      const data = await Promise.all(
        classes.map(async cls => ({ cls, students: await getStudentsByClass(cls.class_name) }))
      );
      setClassData(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function handleSaveClass(form) {
    setSaving(true);
    try {
      if (editTarget) await updateClass(editTarget.id, form);
      else await addClass(form);
      setFormMode(null);
      setEditTarget(null);
      await refresh();
    } finally { setSaving(false); }
  }

  async function handleAddStudent(e) {
    e.preventDefault();
    if (!studentForm.name.trim() || !studentForm.class_name) return;
    setSaving(true);
    try {
      await addStudent({ name: studentForm.name.trim(), class_name: studentForm.class_name });
      setStudentForm(f => ({ ...f, name: '' }));
      setFormMode(null);
      await refresh();
    } finally { setSaving(false); }
  }

  function openEditClass(cls) {
    setEditTarget(cls);
    setFormMode('edit_class');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openAddStudent() {
    setStudentForm({ name: '', class_name: classData[0]?.cls.class_name ?? '' });
    setFormMode('add_student');
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">반 목록</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setFormMode('add_class'); setEditTarget(null); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + 반 추가
          </button>
          <button
            onClick={openAddStudent}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            + 학생 추가
          </button>
        </div>
      </div>

      {/* 반 추가/편집 폼 */}
      {(formMode === 'add_class' || formMode === 'edit_class') && (
        <ClassForm
          key={editTarget?.id ?? 'new'}
          initial={editTarget}
          onSave={handleSaveClass}
          onCancel={() => { setFormMode(null); setEditTarget(null); }}
          saving={saving}
        />
      )}

      {/* 학생 추가 폼 */}
      {formMode === 'add_student' && (
        <form onSubmit={handleAddStudent}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">학생 추가</h2>
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">학생 이름</label>
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={studentForm.name}
                onChange={e => setStudentForm(f => ({ ...f, name: e.target.value }))}
                placeholder="홍길동" required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">반</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={studentForm.class_name}
                onChange={e => setStudentForm(f => ({ ...f, class_name: e.target.value }))}
                required
              >
                <option value="">반 선택</option>
                {classData.map(({ cls }) => (
                  <option key={cls.id} value={cls.class_name}>{cls.class_name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? '저장 중…' : '저장'}
            </button>
            <button type="button" onClick={() => setFormMode(null)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              취소
            </button>
          </div>
        </form>
      )}

      {classData.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-sm">'반 추가'로 반을 먼저 만들어보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classData.map(({ cls, students }) => {
            const days = cls.days_of_week ? cls.days_of_week.split(',').filter(Boolean) : [];
            return (
              <div key={cls.id}
                className="bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group flex flex-col">
                <Link to={`/class/${encodeURIComponent(cls.class_name)}`} className="block p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors text-lg">
                      {cls.class_name}
                    </h2>
                    <span className="text-xl">🏫</span>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {cls.instructor && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="text-gray-400">강사</span>
                        <span className="font-medium text-gray-700">{cls.instructor}</span>
                      </p>
                    )}
                    {days.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">요일</span>
                        <div className="flex gap-1">
                          {days.map(d => (
                            <span key={d} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{d}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">학생 {students.length}명</p>
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    {students.slice(0, 5).map(s => (
                      <span key={s.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{s.name}</span>
                    ))}
                    {students.length > 5 && (
                      <span className="text-xs text-gray-400">+{students.length - 5}명</span>
                    )}
                  </div>
                </Link>

                <div className="px-5 py-2.5 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => openEditClass(cls)}
                    className="text-xs text-gray-400 hover:text-indigo-600 font-medium transition-colors"
                  >
                    반 정보 편집
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
