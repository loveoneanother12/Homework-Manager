import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getClasses, getStudentsByClass, addStudent } from '../lib/store.js';

export default function ClassList() {
  const [classData, setClassData] = useState([]); // [{cls, students}]
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', class_name: '' });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const classes = await getClasses();
      const data = await Promise.all(
        classes.map(async cls => ({ cls, students: await getStudentsByClass(cls) }))
      );
      setClassData(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.class_name.trim()) return;
    setSaving(true);
    try {
      await addStudent({ name: form.name.trim(), class_name: form.class_name.trim() });
      setForm({ name: '', class_name: '' });
      setShowAdd(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">반 목록</h1>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + 학생 추가
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">학생 이름</label>
            <input
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="홍길동"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">반 이름</label>
            <input
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-36"
              value={form.class_name}
              onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))}
              placeholder="중2-A반"
              required
            />
          </div>
          <button type="submit" disabled={saving}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? '저장 중…' : '저장'}
          </button>
          <button type="button" onClick={() => setShowAdd(false)}
            className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
            취소
          </button>
        </form>
      )}

      {classData.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-sm">등록된 반이 없습니다. 학생을 추가해 반을 만들어보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classData.map(({ cls, students }) => (
            <Link
              key={cls}
              to={`/class/${encodeURIComponent(cls)}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{cls}</h2>
                  <p className="text-sm text-gray-500 mt-1">학생 {students.length}명</p>
                </div>
                <span className="text-2xl">🏫</span>
              </div>
              <div className="mt-4 flex gap-1 flex-wrap">
                {students.slice(0, 5).map(s => (
                  <span key={s.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{s.name}</span>
                ))}
                {students.length > 5 && <span className="text-xs text-gray-400">+{students.length - 5}명</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
