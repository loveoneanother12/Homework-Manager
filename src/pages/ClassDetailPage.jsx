import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getClasses, updateClass, deleteClass,
  getStudents, getStudentsByClassId, addStudentToClass, removeStudentFromClass, getAllClassMemberships,
  countRecordsByClass,
  getHomeworkPresets, addHomeworkPreset, updateHomeworkPreset, deleteHomeworkPreset,
} from '../lib/store.js';
import DeleteConfirmModal from '../components/DeleteConfirmModal.jsx';
import { today } from '../lib/dateUtils.js';

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
    <div className="flex gap-2">
      {DAYS.map(d => (
        <button key={d} type="button" onClick={() => toggle(d)}
          className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${
            selected.includes(d)
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
      <input
        className="flex-1 text-sm font-medium bg-transparent border-none outline-none text-gray-800 placeholder-gray-300"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        placeholder="숙제명 입력…"
      />
      <div className="flex gap-1.5 flex-shrink-0">
        {[1, 2].map(p => (
          <button
            key={p}
            type="button"
            onClick={() => handlePeriodToggle(p)}
            className={`px-2.5 py-1 text-xs rounded-full font-semibold transition-all ${
              preset.period === p
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300'
            }`}>
            {p}교시
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onDelete(preset.id)}
        className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all flex-shrink-0">
        ✕
      </button>
    </div>
  );
}

export default function ClassDetailPage() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [cls, setCls] = useState(null);
  const [loading, setLoading] = useState(true);

  const [classStudents, setClassStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');

  const [presets, setPresets] = useState([]);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [classes, students, mems, classStudentsList, presetList] = await Promise.all([
        getClasses(),
        getStudents(),
        getAllClassMemberships(),
        getStudentsByClassId(classId),
        getHomeworkPresets(classId),
      ]);
      const found = classes.find(c => c.id === classId);
      if (!found) { navigate('/manage', { replace: true }); return; }
      setCls(found);
      setEditForm({ class_name: found.class_name, days_of_week: found.days_of_week ?? '', instructor: found.instructor ?? '' });
      setAllStudents(students);
      setMemberships(mems);
      setClassStudents(classStudentsList);
      setPresets(presetList);
      setLoading(false);
    }
    load();
  }, [classId]);

  const inClass = new Set(classStudents.map(s => s.id));
  const searchTrimmed = memberSearch.trim();
  const studentsToAdd = searchTrimmed
    ? allStudents.filter(s => !inClass.has(s.id) && s.name.includes(searchTrimmed))
    : [];

  async function handleSaveClass(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await updateClass(classId, editForm);
      setCls(prev => ({ ...prev, ...editForm }));
      setEditMode(false);
    } catch (err) {
      if (err?.code === '23505') {
        alert(`'${editForm.class_name}' 이름의 반이 이미 있습니다. 다른 이름을 사용해 주세요.`);
      } else {
        alert(`저장 중 오류가 발생했습니다.\n${err?.message ?? err}`);
      }
    } finally { setSaving(false); }
  }

  async function handleDeleteClass() {
    const recordCount = await countRecordsByClass(classId);
    setDeleteTarget({ recordCount });
  }

  async function confirmDelete() {
    await deleteClass(classId);
    navigate('/manage', { replace: true });
  }

  async function handleAddToClass(student) {
    await addStudentToClass(classId, student.id);
    setClassStudents(prev =>
      [...prev, student].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    );
    setMemberships(prev => [...prev, { class_id: classId, student_id: student.id }]);
    setMemberSearch('');
  }

  async function handleRemoveFromClass(student) {
    if (!confirm(`'${student.name}'을(를) 이 반에서 제외하시겠습니까?`)) return;
    await removeStudentFromClass(classId, student.id);
    setClassStudents(prev => prev.filter(s => s.id !== student.id));
    setMemberships(prev =>
      prev.filter(m => !(m.class_id === classId && m.student_id === student.id))
    );
  }

  async function handleAddPreset() {
    const nextPeriod = presets.length === 0 ? 1 : presets.length === 1 ? (presets[0].period === 1 ? 2 : 1) : null;
    const preset = await addHomeworkPreset(classId, {
      title: '',
      period: nextPeriod,
      sort_order: presets.length,
    });
    setPresets(prev => [...prev, preset]);
  }

  async function handleUpdatePreset(id, updates) {
    await updateHomeworkPreset(id, updates);
    setPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }

  async function handleDeletePreset(id) {
    await deleteHomeworkPreset(id);
    setPresets(prev => prev.filter(p => p.id !== id));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400 text-sm">불러오는 중…</div>
  );
  if (!cls) return null;

  const days = cls.days_of_week?.split(',').filter(Boolean) ?? [];

  return (
    <div className="space-y-4 pb-12">

      {/* 뒤로 */}
      <button
        onClick={() => navigate('/manage')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors pt-1">
        <span className="text-base">←</span> 반 관리
      </button>

      {/* 헤더 카드 — 전체 너비 */}
      {editMode ? (
        <form onSubmit={handleSaveClass} className="bg-white rounded-3xl shadow-sm p-6 space-y-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">반 편집</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">반 이름</label>
              <input
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                value={editForm.class_name}
                onChange={e => setEditForm(f => ({ ...f, class_name: e.target.value }))}
                required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">담당 강사</label>
              <input
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                value={editForm.instructor}
                onChange={e => setEditForm(f => ({ ...f, instructor: e.target.value }))}
                placeholder="예: 김수학" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">수업 요일</label>
            <DayToggle value={editForm.days_of_week} onChange={v => setEditForm(f => ({ ...f, days_of_week: v }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving || !editForm.class_name.trim()}
              className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors">
              {saving ? '저장 중…' : '저장'}
            </button>
            <button type="button"
              onClick={() => { setEditMode(false); setEditForm({ class_name: cls.class_name, days_of_week: cls.days_of_week ?? '', instructor: cls.instructor ?? '' }); }}
              className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl text-sm font-medium hover:bg-gray-200 transition-colors">
              취소
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* 반 정보 */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">{cls.class_name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {cls.instructor && (
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {cls.instructor}
                </span>
              )}
              {days.map(d => (
                <span key={d} className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {d}
                </span>
              ))}
              <span className="text-xs text-gray-400 font-medium">학생 {classStudents.length}명</span>
            </div>
          </div>

          {/* CTA + 편집·삭제 */}
          <div className="flex flex-col gap-2 lg:items-end flex-shrink-0">
            <button
              onClick={() => navigate(`/class/${encodeURIComponent(cls.class_name)}?date=${today()}`)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all whitespace-nowrap">
              오늘 숙제 보기 →
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setEditMode(true)}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                편집
              </button>
              <span className="text-gray-200">|</span>
              <button
                onClick={handleDeleteClass}
                className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors">
                반 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2단 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* 구성원 카드 */}
        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">구성원</p>
            <span className="text-xs font-bold text-indigo-600">{classStudents.length}명</span>
          </div>

          {classStudents.length === 0 ? (
            <p className="text-sm text-gray-400">이 반에 배정된 학생이 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classStudents.map(s => (
                <div key={s.id}
                  className="flex items-center gap-1.5 bg-gray-50 rounded-full pl-3.5 pr-2 py-1.5">
                  <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                  {s.grade && <span className="text-xs text-gray-400">{s.grade}</span>}
                  <button
                    onClick={() => handleRemoveFromClass(s)}
                    className="w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all text-xs">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 학생 추가 검색 */}
          <div className="pt-1">
            <input
              type="text"
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="학생 이름으로 검색해서 추가…"
              className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 transition placeholder-gray-300"
            />
            {searchTrimmed && (
              <div className="mt-2 space-y-1">
                {studentsToAdd.length === 0 ? (
                  <p className="text-xs text-gray-400 px-1">
                    {allStudents.some(s => !inClass.has(s.id) && s.name.includes(searchTrimmed))
                      ? '검색 결과 없음'
                      : `'${searchTrimmed}'에 해당하는 학생이 없거나 이미 이 반에 있습니다.`}
                  </p>
                ) : (
                  studentsToAdd.map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                      <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                      {s.grade && (
                        <span className="text-xs font-medium text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                          {s.grade}
                        </span>
                      )}
                      <span className="flex-1" />
                      <button
                        onClick={() => handleAddToClass(s)}
                        className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 transition-colors">
                        + 추가
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 숙제 프리셋 카드 */}
        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">숙제 프리셋</p>
            <p className="text-xs text-gray-400">숙제가 없는 날 진입하면 자동으로 생성됩니다.</p>
          </div>
          <div className="space-y-2">
            {presets.map(preset => (
              <PresetRow
                key={preset.id}
                preset={preset}
                onUpdate={handleUpdatePreset}
                onDelete={handleDeletePreset}
              />
            ))}
            {presets.length < 4 && (
              <button
                onClick={handleAddPreset}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-xs font-semibold text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-all">
                + 프리셋 추가
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 반 삭제 확인 모달 */}
      {deleteTarget && (
        <DeleteConfirmModal
          title="반 삭제"
          targetName={cls.class_name}
          requireType={deleteTarget.recordCount > 0}
          lines={
            deleteTarget.recordCount > 0
              ? [
                  `'${cls.class_name}' 반을 삭제하면 이 반의 채점 기록 ${deleteTarget.recordCount}건이 함께 휴지통으로 이동합니다.`,
                  '학생 정보는 유지됩니다. 휴지통 탭에서 복원할 수 있습니다.',
                ]
              : [`'${cls.class_name}' 반을 삭제하시겠습니까? 이 반에는 채점 기록이 없습니다.`]
          }
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
