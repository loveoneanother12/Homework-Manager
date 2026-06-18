import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getClasses, updateClass, deleteClass,
  getStudents, getStudentsByClassId, addStudentToClass, removeStudentFromClass, getAllClassMemberships,
  countRecordsByClass,
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

export default function ClassDetailPage() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [cls, setCls] = useState(null);
  const [loading, setLoading] = useState(true);

  // 구성원
  const [classStudents, setClassStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');

  // 프리셋
  const [presets, setPresets] = useState([]);

  // 반 편집
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // 삭제 모달
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

  // 파생 데이터
  const classById = {};
  // memberships에서 student → class names 맵핑
  const studentClassNames = {};
  for (const m of memberships) {
    if (!studentClassNames[m.student_id]) studentClassNames[m.student_id] = [];
    studentClassNames[m.student_id].push(m.class_id);
  }

  const inClass = new Set(classStudents.map(s => s.id));
  const searchTrimmed = memberSearch.trim();
  const studentsToAdd = searchTrimmed
    ? allStudents.filter(s => !inClass.has(s.id) && s.name.includes(searchTrimmed))
    : [];

  // 반 편집 핸들러
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

  // 반 삭제
  async function handleDeleteClass() {
    const recordCount = await countRecordsByClass(classId);
    setDeleteTarget({ recordCount });
  }

  async function confirmDelete() {
    await deleteClass(classId);
    navigate('/manage', { replace: true });
  }

  // 구성원 핸들러
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

  // 프리셋 핸들러
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

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;
  if (!cls) return null;

  const days = cls.days_of_week?.split(',').filter(Boolean) ?? [];

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <button
          onClick={() => navigate('/manage')}
          className="text-gray-400 hover:text-gray-600 text-sm mb-4 inline-block">
          ← 반 관리
        </button>

        {editMode ? (
          <form onSubmit={handleSaveClass} className="bg-white border border-indigo-100 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-800">반 편집</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">반 이름</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editForm.class_name}
                  onChange={e => setEditForm(f => ({ ...f, class_name: e.target.value }))}
                  required autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">담당 강사</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editForm.instructor}
                  onChange={e => setEditForm(f => ({ ...f, instructor: e.target.value }))}
                  placeholder="예: 김수학" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">수업 요일</label>
              <DayToggle
                value={editForm.days_of_week}
                onChange={v => setEditForm(f => ({ ...f, days_of_week: v }))} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving || !editForm.class_name.trim()}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? '저장 중…' : '수정 저장'}
              </button>
              <button type="button" onClick={() => { setEditMode(false); setEditForm({ class_name: cls.class_name, days_of_week: cls.days_of_week ?? '', instructor: cls.instructor ?? '' }); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                취소
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{cls.class_name}</h1>
              {cls.instructor && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded">{cls.instructor}</span>
              )}
              {days.length > 0 && (
                <div className="flex gap-1">
                  {days.map(d => (
                    <span key={d} className="text-sm bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{d}</span>
                  ))}
                </div>
              )}
              <span className="text-sm text-gray-400">학생 {classStudents.length}명</span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setEditMode(true)}
                className="px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors font-medium">
                편집
              </button>
              <button
                onClick={handleDeleteClass}
                className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded hover:bg-red-50 hover:text-red-600 transition-colors">
                삭제
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 현재 구성원 */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">구성원</h2>
        {classStudents.length === 0 ? (
          <p className="text-sm text-gray-400">이 반에 배정된 학생이 없습니다.</p>
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
      </section>

      {/* 학생 추가 */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">학생 추가</h2>
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
              <p className="text-xs text-gray-400 mt-2">
                {allStudents.some(s => !inClass.has(s.id) && s.name.includes(searchTrimmed))
                  ? '검색 결과 없음'
                  : `'${searchTrimmed}'에 해당하는 학생이 없거나 이미 이 반에 있습니다.`}
              </p>
            ) : (
              <div className="flex flex-col gap-1 mt-2 max-w-sm">
                {studentsToAdd.map(s => {
                  const classIds = memberships.filter(m => m.student_id === s.id).map(m => m.class_id);
                  return (
                    <div key={s.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
                      <span className="text-sm font-medium text-gray-800">{s.name}</span>
                      {s.grade && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{s.grade}</span>}
                      <span className="flex-1" />
                      <button
                        onClick={() => handleAddToClass(s)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                        + 추가
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 숙제 프리셋 */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-1">숙제 프리셋</h2>
        <p className="text-xs text-gray-400 mb-3">
          이 반의 숙제 목록을 열 때 숙제가 없으면 아래 프리셋으로 자동 생성됩니다.
        </p>
        <div className="space-y-2 max-w-sm">
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
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1">
              + 프리셋 추가
            </button>
          )}
        </div>
      </section>

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
