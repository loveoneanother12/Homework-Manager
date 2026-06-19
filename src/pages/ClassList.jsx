import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getClasses, getStudentsByClass } from '../lib/store.js';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const JS_TO_KR = ['일', '월', '화', '수', '목', '금', '토'];

function getTodayDay() {
  return JS_TO_KR[new Date().getDay()];
}

export default function ClassList() {
  const [classData, setClassData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterDays, setFilterDays] = useState([]);
  const [todayOnly, setTodayOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const classes = await getClasses();
      const data = await Promise.all(
        classes.map(async cls => ({ cls, students: await getStudentsByClass(cls.class_name) }))
      );
      setClassData(data);
      setLoading(false);
    })();
  }, []);

  const today = getTodayDay();

  const filtered = classData.filter(({ cls, students }) => {
    if (todayOnly) {
      const days = cls.days_of_week?.split(',').filter(Boolean) ?? [];
      if (!days.includes(today)) return false;
    }
    if (!todayOnly && filterDays.length > 0) {
      const days = cls.days_of_week?.split(',').filter(Boolean) ?? [];
      if (!filterDays.some(d => days.includes(d))) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchClass      = cls.class_name.toLowerCase().includes(q);
      const matchInstructor = cls.instructor?.toLowerCase().includes(q) ?? false;
      const matchStudent    = students.some(s => s.name.toLowerCase().includes(q));
      if (!matchClass && !matchInstructor && !matchStudent) return false;
    }
    return true;
  });

  function toggleFilterDay(day) {
    setFilterDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-indigo-700">채점</h1>
      </div>

      {/* 검색 · 필터 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="학생명, 반명, 강사명 검색…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setTodayOnly(v => !v)}
            className="flex items-center gap-2 flex-shrink-0">
            <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${todayOnly ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${todayOnly ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span className={`text-xs font-medium whitespace-nowrap transition-colors ${todayOnly ? 'text-indigo-600' : 'text-gray-500'}`}>
              오늘 수업만 보기
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 flex-shrink-0">요일</span>
          <div className="flex gap-1.5">
            {DAYS.map(d => {
              const active = filterDays.includes(d);
              const isToday = d === today;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={todayOnly}
                  onClick={() => toggleFilterDay(d)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium border transition-all
                    ${todayOnly
                      ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                      : active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : isToday
                          ? 'bg-indigo-50 text-indigo-500 border-indigo-200 hover:bg-indigo-100'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}>
                  {d}
                </button>
              );
            })}
          </div>
          {filterDays.length > 0 && !todayOnly && (
            <button onClick={() => setFilterDays([])}
              className="text-xs text-gray-400 hover:text-gray-600 ml-1">
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 반 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {classData.length === 0
            ? <><p className="text-4xl mb-3">📚</p><p className="text-sm">'학생/반 관리' 탭에서 반을 먼저 만들어보세요.</p></>
            : <><p className="text-3xl mb-3">🔍</p><p className="text-sm">검색 결과가 없습니다.</p></>
          }
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ cls, students }) => {
            const days = cls.days_of_week?.split(',').filter(Boolean) ?? [];
            return (
              <Link
                key={cls.id}
                to={`/class/${encodeURIComponent(cls.class_name)}`}
                className="block bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group p-5">
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
                          <span key={d}
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${d === today ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-50 text-blue-600'}`}>
                            {d}
                          </span>
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
                  {students.length > 5 && <span className="text-xs text-gray-400">+{students.length - 5}명</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
