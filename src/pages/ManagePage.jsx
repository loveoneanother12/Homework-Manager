import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  getClasses, addClass, updateClass, deleteClass,
  getStudents, getStudentsByClassId, addStudent, deleteStudent,
  addStudentToClass, removeStudentFromClass, getAllClassMemberships,
  countRecordsByStudent, countRecordsByClass,
  getHomeworkPresets, addHomeworkPreset, updateHomeworkPreset, deleteHomeworkPreset,
} from '../lib/store.js';
import DeleteConfirmModal from '../components/DeleteConfirmModal.jsx';

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

function PresetRow({ preset, onUpdate, onDelete }) {
  const [title, setTitle] = useState(preset.title);
  const titleRef = useRef(preset.title);

  function handleTitleBlur() {
    const trimmed = title.trim();
    if (trimmed === titleRef.current) return;
    titleRef.current = trimmed;
    onUpdate(preset.id, { title: trimmed });
  }

  function handlePeriodToggle(p) {
    const next = preset.period === p ? null : p;
    onUpdate(preset.id, { period: next });
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
      <input
        className="flex-1 text-sm border-none outline-none focus:ring-0 bg-transparent text-gray-800 placeholder-gray-300"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        placeholder="숙제명 입력…"
      />
      <div className="flex gap-1 flex-shrink-0">
        {[1, 2].map(p => (
          <button
            key={p}
            type="button"
            onClick={() => handlePeriodToggle(p)}
            className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${
              preset.period === p
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {p}교시
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onDelete(preset.id)}
        className="text-gray-300 hover:text-red-500 transition-colors text-xs w-5 h-5 flex items-center justify-center flex-shrink-0">
        ✕
      </button>
    </div>
  );
}

function StudentForm({ onSave, onCancel, saving }) {
  const [form, setForm] = useState({ name: '', grade: '', school: '' });

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }}
      className="bg-white border border-indigo-100 rounded-xl p-5 mb-4 shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-800">새 학생 추가</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">학생 이름</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="예: 홍길동"
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
            {['초1','초2','초3','초4','초5','초6','중1','중2','중3'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
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
          {saving ? '저장 중…' : '추가'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
          취소
        </button>
      </div>
    </form>
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
  const [classes, setClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [memberships, setMemberships] = useState([]); // [{class_id, student_id}]
  const [loading, setLoading] = useState(true);

  // 반 관리
  const [classFormMode, setClassFormMode] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [classSaving, setClassSaving] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [classStudentsLoading, setClassStudentsLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');

  // 학생 풀 관리
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // 삭제 확인 모달 — { type: 'class'|'student', item, recordCount }
  const [deleteTarget, setDeleteTarget] = useState(null);

  // 숙제 프리셋 — classId → preset[]
  const [presetsByClass, setPresetsByClass] = useState({});
  const [presetsLoading, setPresetsLoading] = useState(false);

  async function loadData() {
    const [cls, students, mems] = await Promise.all([
      getClasses(),
      getStudents(),
      getAllClassMemberships(),
    ]);
    setClasses(cls);
    setAllStudents(students);
    setMemberships(mems);
  }

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!expandedClassId) { setClassStudents([]); setMemberSearch(''); return; }
    setClassStudentsLoading(true);
    setPresetsLoading(true);
    Promise.all([
      getStudentsByClassId(expandedClassId),
      getHomeworkPresets(expandedClassId),
    ]).then(([students, presets]) => {
      setClassStudents(students);
      setClassStudentsLoading(false);
      setPresetsByClass(prev => ({ ...prev, [expandedClassId]: presets }));
      setPresetsLoading(false);
    });
    setMemberSearch('');
  }, [expandedClassId]);

  // ── 파생 데이터 ──────────────────────────────────────────────────────────────

  const classById = Object.fromEntries(classes.map(c => [c.id, c]));

  // studentId → [className, ...]
  const studentClassNames = {};
  for (const m of memberships) {
    if (!studentClassNames[m.student_id]) studentClassNames[m.student_id] = [];
    const cls = classById[m.class_id];
    if (cls) studentClassNames[m.student_id].push(cls.class_name);
  }

  // classId → 학생 수
  const classStudentCounts = {};
  for (const m of memberships) {
    classStudentCounts[m.class_id] = (classStudentCounts[m.class_id] ?? 0) + 1;
  }

  // 확장된 반에 없는 학생 중 검색어에 맞는 것
  const inExpandedClass = new Set(classStudents.map(s => s.id));
  const searchTrimmed = memberSearch.trim();
  const studentsToAdd = searchTrimmed
    ? allStudents.filter(s => !inExpandedClass.has(s.id) && s.name.includes(searchTrimmed))
    : [];

  // ── 반 핸들러 ──────────────────────────────────────────────────────────────

  async function handleSaveClass(form) {
    setClassSaving(true);
    try {
      if (editTarget) await updateClass(editTarget.id, form);
      else await addClass(form);
      setClassFormMode(null);
      setEditTarget(null);
      const [cls, mems] = await Promise.all([getClasses(), getAllClassMemberships()]);
      setClasses(cls);
      setMemberships(mems);
    } catch (err) {
      if (err?.code === '23505') {
        alert(`'${form.class_name}' 이름의 반이 이미 있습니다. 다른 이름을 사용해 주세요.`);
      } else {
        alert(`반 저장 중 오류가 발생했습니다.\n${err?.message ?? err}`);
      }
    } finally { setClassSaving(false); }
  }

  async function askDeleteClass(cls) {
    const recordCount = await countRecordsByClass(cls.id);
    setDeleteTarget({ type: 'class', item: cls, recordCount });
  }

  // ── 반 구성원 핸들러 ──────────────────────────────────────────────────────

  async function handleAddToClass(student) {
    await addStudentToClass(expandedClassId, student.id);
    setClassStudents(prev =>
      [...prev, student].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    );
    setMemberships(prev => [...prev, { class_id: expandedClassId, student_id: student.id }]);
    setMemberSearch('');
  }

  async function handleRemoveFromClass(student) {
    if (!confirm(`'${student.name}'을(를) 이 반에서 제외하시겠습니까?`)) return;
    await removeStudentFromClass(expandedClassId, student.id);
    setClassStudents(prev => prev.filter(s => s.id !== student.id));
    setMemberships(prev =>
      prev.filter(m => !(m.class_id === expandedClassId && m.student_id === student.id))
    );
  }

  // ── 숙제 프리셋 핸들러 ───────────────────────────────────────────────────

  async function handleAddPreset(classId) {
    const presets = presetsByClass[classId] ?? [];
    const nextPeriod = presets.length === 0 ? 1 : presets.length === 1 ? (presets[0].period === 1 ? 2 : 1) : null;
    const preset = await addHomeworkPreset(classId, {
      title: '',
      period: nextPeriod,
      sort_order: presets.length,
    });
    setPresetsByClass(prev => ({ ...prev, [classId]: [...(prev[classId] ?? []), preset] }));
  }

  async function handleUpdatePreset(classId, id, updates) {
    await updateHomeworkPreset(id, updates);
    setPresetsByClass(prev => ({
      ...prev,
      [classId]: (prev[classId] ?? []).map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }

  async function handleDeletePreset(classId, id) {
    await deleteHomeworkPreset(id);
    setPresetsByClass(prev => ({
      ...prev,
      [classId]: (prev[classId] ?? []).filter(p => p.id !== id),
    }));
  }

  // ── 학생 풀 핸들러 ────────────────────────────────────────────────────────

  async function handleAddStudent(form) {
    if (!form.name.trim()) return;
    setStudentSaving(true);
    try {
      const s = await addStudent({ name: form.name.trim(), grade: form.grade || null, school: form.school.trim() || null });
      setAllStudents(prev => [...prev, s].sort((a, b) => a.name.localeCompare(b.name, 'ko')));
      setStudentFormOpen(false);
    } finally { setStudentSaving(false); }
  }

  async function askDeleteStudent(student) {
    const recordCount = await countRecordsByStudent(student.id);
    setDeleteTarget({ type: 'student', item: student, recordCount });
  }

  async function confirmDelete() {
    const { type, item } = deleteTarget;
    if (type === 'class') {
      if (expandedClassId === item.id) setExpandedClassId(null);
      await deleteClass(item.id);
      const [newCls, mems] = await Promise.all([getClasses(), getAllClassMemberships()]);
      setClasses(newCls);
      setMemberships(mems);
    } else {
      await deleteStudent(item.id);
      setAllStudents(prev => prev.filter(s => s.id !== item.id));
      setMemberships(prev => prev.filter(m => m.student_id !== item.id));
      setClassStudents(prev => prev.filter(s => s.id !== item.id));
    }
    setDeleteTarget(null);
  }

  function deleteModalProps() {
    const { type, item, recordCount } = deleteTarget;
    if (type === 'class') {
      return {
        title: '반 삭제',
        targetName: item.class_name,
        requireType: recordCount > 0,
        lines: recordCount > 0
          ? [
              `'${item.class_name}' 반을 삭제하면 이 반의 채점 기록 ${recordCount}건이 함께 휴지통으로 이동합니다.`,
              '학생 정보는 유지됩니다. 휴지통 탭에서 복원할 수 있습니다.',
            ]
          : [`'${item.class_name}' 반을 삭제하시겠습니까? 이 반에는 채점 기록이 없습니다.`],
      };
    }
    const classNames = studentClassNames[item.id] ?? [];
    return {
      title: '학생 삭제',
      targetName: item.name,
      requireType: recordCount > 0,
      lines: recordCount > 0
        ? [
            `'${item.name}' 학생을 삭제하면 채점 기록 ${recordCount}건이 함께 휴지통으로 이동합니다.`,
            ...(classNames.length > 0 ? [`소속 반: ${classNames.join(', ')}`] : []),
            '휴지통 탭에서 복원할 수 있습니다.',
          ]
        : [
            `'${item.name}' 학생을 삭제하시겠습니까? 채점 기록이 없습니다.`,
            ...(classNames.length > 0 ? [`소속 반: ${classNames.join(', ')}`] : []),
          ],
    };
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">학생/반 관리</h1>

      {/* ── 반 관리 ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">반 관리</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={classSearch}
              onChange={e => setClassSearch(e.target.value)}
              placeholder="반 이름 검색…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => { setEditTarget(null); setClassFormMode('add'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              + 반 추가
            </button>
          </div>
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

        {classes.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-xl">
            반이 없습니다. '+ 반 추가'로 첫 번째 반을 만들어보세요.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {classes.filter(c => !classSearch.trim() || c.class_name.includes(classSearch.trim())).map((cls, idx) => {
              const days = cls.days_of_week?.split(',').filter(Boolean) ?? [];
              const count = classStudentCounts[cls.id] ?? 0;
              const isExpanded = expandedClassId === cls.id;

              return (
                <div key={cls.id} className={idx > 0 ? 'border-t border-gray-200' : ''}>
                  {/* 반 행 헤더 */}
                  <div
                    className={`flex items-center px-5 py-4 gap-4 cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'}`}
                    onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}>
                    <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                      <span className={`font-semibold text-gray-900 ${isExpanded ? 'text-indigo-700' : ''}`}>
                        {cls.class_name}
                      </span>
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
                      <span className="text-xs text-gray-400">학생 {count}명</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); setEditTarget(cls); setClassFormMode('edit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors font-medium">
                        편집
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); askDeleteClass(cls); }}
                        className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded hover:bg-red-50 hover:text-red-600 transition-colors">
                        삭제
                      </button>
                      <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </div>

                  {/* 확장 영역: 구성원 + 학생 추가 검색 + 숙제 프리셋 */}
                  {isExpanded && (
                    <div className="border-t border-indigo-100 bg-indigo-50/40 px-5 py-4 space-y-4">
                      {/* 현재 구성원 */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">현재 구성원</p>
                        {classStudentsLoading ? (
                          <p className="text-xs text-gray-400">불러오는 중…</p>
                        ) : classStudents.length === 0 ? (
                          <p className="text-xs text-gray-400">이 반에 배정된 학생이 없습니다.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {classStudents.map(s => (
                              <div key={s.id}
                                className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full pl-3 pr-1.5 py-1">
                                <span className="text-sm text-gray-800 font-medium">{s.name}</span>
                                {s.grade && <span className="text-xs text-gray-400">{s.grade}</span>}
                                <button
                                  onClick={() => handleRemoveFromClass(s)}
                                  className="text-gray-400 hover:text-red-500 transition-colors text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50">
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 학생 검색 추가 */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">학생 추가</p>
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={e => setMemberSearch(e.target.value)}
                          placeholder="학생 이름으로 검색…"
                          className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        {searchTrimmed && (
                          <div className="mt-2">
                            {studentsToAdd.length === 0 ? (
                              <p className="text-xs text-gray-400">
                                {allStudents.some(s => !inExpandedClass.has(s.id) && s.name.includes(searchTrimmed))
                                  ? '검색 결과 없음'
                                  : `'${searchTrimmed}'에 해당하는 학생이 없거나 이미 이 반에 있습니다.`}
                              </p>
                            ) : (
                              <div className="flex flex-col gap-1 mt-2">
                                {studentsToAdd.map(s => (
                                  <div key={s.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
                                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                                    {s.grade && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{s.grade}</span>}
                                    <span className="flex-1" />
                                    {(studentClassNames[s.id] ?? []).length > 0 && (
                                      <span className="text-xs text-gray-400">
                                        {studentClassNames[s.id].join(', ')}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => handleAddToClass(s)}
                                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                                      + 추가
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* 숙제 프리셋 */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">숙제 프리셋</p>
                        <p className="text-xs text-gray-400 mb-2">
                          이 반의 HomeworkList를 열 때 숙제가 없으면 아래 프리셋으로 자동 생성됩니다.
                        </p>
                        {presetsLoading ? (
                          <p className="text-xs text-gray-400">불러오는 중…</p>
                        ) : (
                          <div className="space-y-2">
                            {(presetsByClass[cls.id] ?? []).map(preset => (
                              <PresetRow
                                key={preset.id}
                                preset={preset}
                                onUpdate={(id, updates) => handleUpdatePreset(cls.id, id, updates)}
                                onDelete={(id) => handleDeletePreset(cls.id, id)}
                              />
                            ))}
                            {(presetsByClass[cls.id] ?? []).length < 4 && (
                              <button
                                onClick={() => handleAddPreset(cls.id)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1">
                                + 프리셋 추가
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 학생 관리 ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">학생 관리</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="학생 이름 검색…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => { setStudentFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              + 학생 추가
            </button>
          </div>
        </div>

        {studentFormOpen && (
          <StudentForm
            onSave={handleAddStudent}
            onCancel={() => setStudentFormOpen(false)}
            saving={studentSaving}
          />
        )}

        {allStudents.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-xl">
            학생이 없습니다. 이름을 입력해 첫 번째 학생을 추가해보세요.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {allStudents.filter(s => !studentSearch.trim() || s.name.includes(studentSearch.trim())).map(s => {
              const classNames = studentClassNames[s.id] ?? [];
              return (
                <div key={s.id} className="flex items-center px-5 py-3 gap-3">
                  <Link
                    to={`/student/${s.id}/history`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-indigo-700 hover:underline w-20 flex-shrink-0">
                    {s.name}
                  </Link>
                  <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                    {classNames.length > 0
                      ? classNames.map(cn => (
                          <span key={cn} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{cn}</span>
                        ))
                      : <span className="text-xs text-gray-400">미배정</span>
                    }
                  </div>
                  <span className="w-px h-4 bg-gray-300 flex-shrink-0" />
                  {s.school && (
                    <span className="text-xs text-gray-500 flex-shrink-0">{s.school}</span>
                  )}
                  {s.grade && (
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">{s.grade}</span>
                  )}
                  <span className="flex-1" />
                  <button onClick={() => askDeleteStudent(s)}
                    className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0">
                    삭제
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <DeleteConfirmModal
          {...deleteModalProps()}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
