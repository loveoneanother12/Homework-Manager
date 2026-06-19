import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { pct, calcFirst, calcSecond } from '../lib/kpi.js';
import {
  getStudent, updateStudent, getRecordsByStudent, getClasses, getUnits,
  getHomeworksByIds, getAbsencesByStudentId,
  addStudentToClass, removeStudentFromClass, getAllClassMemberships,
} from '../lib/store.js';

const GRADES = ['초1','초2','초3','초4','초5','초6','중1','중2','중3'];

// ─── 교시별 테마 ─────────────────────────────────────────────────────────────
function periodTheme(period) {
  const n = Number(period);
  if (n === 1) return { bar: '#ef4444', hoverBorder: 'hover:border-red-200',    dot: '#ef4444', periodText: 'text-red-500'    };
  if (n === 2) return { bar: '#6366f1', hoverBorder: 'hover:border-indigo-200', dot: '#6366f1', periodText: 'text-indigo-500' };
  return            { bar: '#9ca3af', hoverBorder: 'hover:border-gray-200',   dot: '#9ca3af', periodText: 'text-gray-400'   };
}

// ─── 작은 카드 (횡스크롤용) ──────────────────────────────────────────────────
function MiniKpiBar({ rate, hexColor }) {
  return (
    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(rate * 100, 100)}%`, background: hexColor }}
      />
    </div>
  );
}

function ScorePill({ value }) {
  const map = {
    good:       { label: '우수', cls: 'bg-emerald-50 text-emerald-700' },
    needs_work: { label: '보통', cls: 'bg-amber-50 text-amber-700' },
    poor:       { label: '미흡', cls: 'bg-red-50 text-red-600' },
  };
  const { label, cls } = map[value] ?? { label: value, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}

function HScrollCard({ record, period }) {
  const kpi = record._kpi1;
  const theme = periodTheme(period);
  return (
    <div className={`flex-shrink-0 w-44 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 hover:shadow-md ${theme.hoverBorder} transition-all`}>
      {/* 날짜 + 뱃지 */}
      <div className="flex items-center justify-between mb-2.5 gap-1">
        <span className="text-xs font-semibold text-gray-700 tabular-nums">{record.session_date}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {record.clinic_flag && (
            <span className="text-[10px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">클리닉</span>
          )}
          {record.process_score && <ScorePill value={record.process_score} />}
        </div>
      </div>

      {/* KPI */}
      <div className="space-y-1.5 mb-2.5">
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-400">이행률</span>
            <span className="font-semibold text-gray-700">{pct(kpi.completion_rate)}</span>
          </div>
          <MiniKpiBar rate={kpi.completion_rate} hexColor={theme.bar} />
        </div>
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-400">정답률</span>
            <span className="font-semibold text-gray-700">{pct(kpi.accuracy_rate)}</span>
          </div>
          <MiniKpiBar rate={kpi.accuracy_rate} hexColor="#10b981" />
        </div>
      </div>

      {/* 오답 유형 */}
      {(kpi.gave_up_rate > 0 || kpi.wrong_rate > 0) && (
        <div className="flex gap-1 flex-wrap">
          {kpi.gave_up_rate > 0 && (
            <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">
              미완결 {pct(kpi.gave_up_rate)}
            </span>
          )}
          {kpi.wrong_rate > 0 && (
            <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full">
              오답 {pct(kpi.wrong_rate)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 주간 데이터 집계 ─────────────────────────────────────────────────────────

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeeklyData(records) {
  const thisMonday = getMondayOf(new Date());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(thisMonday);
    start.setDate(thisMonday.getDate() - (7 - i) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: `${start.getMonth() + 1}/${start.getDate()}`, recs: [] };
  });

  for (const r of records) {
    if (!r.session_date) continue;
    const d = new Date(r.session_date + 'T00:00:00');
    for (const w of weeks) {
      if (d >= w.start && d <= w.end) { w.recs.push(r); break; }
    }
  }

  return weeks.map(w => {
    if (!w.recs.length) return { label: w.label, hasData: false };
    const sum = w.recs.reduce((acc, r) => ({
      total_count:     acc.total_count     + (r.total_count     ?? 0),
      not_attempted:   acc.not_attempted   + (r.not_attempted   ?? 0),
      gave_up:         acc.gave_up         + (r.gave_up         ?? 0),
      wrong_attempted: acc.wrong_attempted + (r.wrong_attempted ?? 0),
      retry_total:     acc.retry_total     + (r.retry_total     ?? 0),
      retry_correct:   acc.retry_correct   + (r.retry_correct   ?? 0),
      retry_wrong:     acc.retry_wrong     + (r.retry_wrong     ?? 0),
      retry_gave_up:   acc.retry_gave_up   + (r.retry_gave_up   ?? 0),
    }), { total_count:0, not_attempted:0, gave_up:0, wrong_attempted:0,
          retry_total:0, retry_correct:0, retry_wrong:0, retry_gave_up:0 });

    const kpi1 = calcFirst(sum);
    const kpi2 = sum.retry_total > 0 ? calcSecond(sum, kpi1.first_wrongs) : null;
    return {
      label: w.label,
      hasData: true,
      completion_rate:    kpi1.completion_rate,
      accuracy_rate:      kpi1.accuracy_rate,
      understanding_rate: kpi2?.understanding_rate ?? null,
    };
  });
}

// ─── 꺾은선 그래프 (SVG) ──────────────────────────────────────────────────────

const TREND_LINES = [
  { key: 'completion_rate',    label: '이행률'     },
  { key: 'accuracy_rate',      color: '#10b981', label: '정답률'     },
  { key: 'understanding_rate', color: '#f59e0b', label: '2차 정답률' },
];

function MiniLineChart({ weeklyData, periodColor }) {
  const W = 240, H = 90;
  const PL = 8, PR = 8, PT = 8, PB = 22;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const N = weeklyData.length;

  const xOf = i => PL + (N <= 1 ? cW / 2 : (i / (N - 1)) * cW);
  const yOf = rate => PT + (1 - Math.max(0, Math.min(1, rate))) * cH;

  function buildPath(key) {
    let d = '', pen = false;
    for (let i = 0; i < N; i++) {
      const w = weeklyData[i];
      if (!w.hasData || w[key] == null) { pen = false; continue; }
      const x = xOf(i).toFixed(1), y = yOf(w[key]).toFixed(1);
      d += pen ? `L${x} ${y} ` : `M${x} ${y} `;
      pen = true;
    }
    return d.trim();
  }

  const lines = TREND_LINES.map(l => ({ ...l, color: l.color ?? periodColor }));

  return (
    <div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        {/* 그리드 */}
        {[0, 0.25, 0.5, 0.75, 1].map(r => (
          <line key={r}
            x1={PL} y1={yOf(r)} x2={W - PR} y2={yOf(r)}
            stroke="#f3f4f6" strokeWidth="1"
            strokeDasharray={r > 0 && r < 1 ? '3 3' : undefined}
          />
        ))}

        {/* 선 */}
        {lines.map(({ key, color }) => {
          const d = buildPath(key);
          return d ? (
            <path key={key} d={d}
              fill="none" stroke={color} strokeWidth="1.8"
              strokeLinejoin="round" strokeLinecap="round" />
          ) : null;
        })}

        {/* 점 */}
        {lines.map(({ key, color }) =>
          weeklyData.map((w, i) =>
            w.hasData && w[key] != null ? (
              <circle key={`${key}-${i}`}
                cx={xOf(i)} cy={yOf(w[key])} r="2.5"
                fill="white" stroke={color} strokeWidth="1.5" />
            ) : null
          )
        )}

        {/* X축 레이블 */}
        {weeklyData.map((w, i) => (
          <text key={i}
            x={xOf(i)} y={H - 4}
            textAnchor="middle" fontSize="8"
            fill={w.hasData ? '#9ca3af' : '#e5e7eb'}>
            {w.label}
          </text>
        ))}
      </svg>

      {/* 범례 */}
      <div className="flex items-center gap-3 mt-1">
        {lines.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[9px] text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 추이 카드 ────────────────────────────────────────────────────────────────

function HomeworkTrendCard({ records, period }) {
  const theme = periodTheme(period);
  const weeklyData = buildWeeklyData(records);
  if (!weeklyData.some(w => w.hasData)) return null;

  return (
    <div className="flex-shrink-0 w-72 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm p-3.5">
      <p className="text-[10px] font-semibold text-gray-400 mb-2.5 tracking-wide">8주 추이</p>
      <MiniLineChart weeklyData={weeklyData} periodColor={theme.bar} />
    </div>
  );
}

// ─── 숙제 그룹 행 ────────────────────────────────────────────────────────────
function HomeworkRow({ title, period, unitLabel, records }) {
  const theme = periodTheme(period);
  return (
    <div>
      {/* 숙제 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        {period != null && (
          <span
            className="flex-shrink-0 w-2 h-2 rounded-full"
            style={{ background: theme.dot }}
          />
        )}
        <span className="text-sm font-medium text-gray-800 truncate">
          {title ?? '숙제 미지정'}
        </span>
        {period != null && (
          <span className={`text-xs font-medium flex-shrink-0 ${theme.periodText}`}>{period}교시</span>
        )}
        {unitLabel && (
          <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">· {unitLabel}</span>
        )}
        <span className="text-xs text-gray-300 flex-shrink-0">{records.length}회</span>
      </div>

      {/* 횡스크롤 카드 열 */}
      <div
        className="flex gap-2.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {records.length >= 2 && <HomeworkTrendCard records={records} period={period} />}
        {records.map(r => <HScrollCard key={r.id} record={r} period={period} />)}
      </div>
    </div>
  );
}

// ─── 결석 카드 ───────────────────────────────────────────────────────────────
function AbsenceCard({ sessionDate }) {
  return (
    <div className="flex-shrink-0 w-44 bg-red-50 rounded-2xl border border-red-100 shadow-sm p-3.5">
      <p className="text-xs font-semibold text-gray-500 tabular-nums mb-3">{sessionDate}</p>
      <div className="flex items-center justify-center h-10">
        <span className="text-xs text-red-400 font-medium">결석으로 미체크</span>
      </div>
    </div>
  );
}

// ─── 반 섹션 (흰 카드 블록) ──────────────────────────────────────────────────
function ClassSection({ cls, hwGroups, absenceDates }) {
  const recordTotal = hwGroups.reduce((s, g) => s + g.records.length, 0);
  const total = recordTotal + absenceDates.length;
  return (
    <div className="mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* 반 헤더 */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">{cls?.class_name ?? '반 미지정'}</h2>
        {cls?.instructor && (
          <span className="text-xs text-gray-400">{cls.instructor}</span>
        )}
        <span className="text-xs text-gray-300 ml-auto">{total}건</span>
      </div>
      {/* 숙제 그룹 목록 */}
      <div className="divide-y divide-gray-50">
        {hwGroups.map(g => (
          <div key={g.key} className="px-5 py-4">
            <HomeworkRow title={g.title} period={g.period} unitLabel={g.unitLabel} records={g.records} />
          </div>
        ))}
        {/* 결석 행 */}
        {absenceDates.length > 0 && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-red-400">결석</span>
              <span className="text-xs text-gray-300">{absenceDates.length}회</span>
            </div>
            <div
              className="flex gap-2.5 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {absenceDates.map(d => <AbsenceCard key={d} sessionDate={d} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 편집 폼 ─────────────────────────────────────────────────────────────────
function EditStudentForm({ student, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: student.name,
    grade: student.grade ?? '',
    school: student.school ?? '',
  });
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }}
      className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      <p className="text-sm font-semibold text-gray-700">학생 정보 수정</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">학생 이름</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">학년</label>
          <select value={form.grade}
            onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50">
            <option value="">학년 선택</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">학교</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
            value={form.school}
            onChange={e => setForm(f => ({ ...f, school: e.target.value }))}
            placeholder="예: 대치중학교" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !form.name.trim()}
          className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? '저장 중…' : '저장'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition-colors">
          취소
        </button>
      </div>
    </form>
  );
}

function ClassManager({ allClasses, studentClassIds, onAdd, onRemove }) {
  const [classSearch, setClassSearch] = useState('');
  const results = classSearch.trim()
    ? allClasses.filter(c => !studentClassIds.has(c.id) && c.class_name.includes(classSearch.trim()))
    : [];
  const alreadyEnrolled = classSearch.trim() && results.length === 0
    && allClasses.some(c => c.class_name.includes(classSearch.trim()));

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      <p className="text-sm font-semibold text-gray-700">수강 반 관리</p>
      <div>
        <p className="text-xs font-medium text-gray-400 mb-2">현재 수강 반</p>
        {studentClassIds.size === 0 ? (
          <p className="text-xs text-gray-400">배정된 반이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allClasses.filter(c => studentClassIds.has(c.id)).map(c => (
              <div key={c.id}
                className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full pl-3 pr-1.5 py-1">
                <span className="text-sm text-indigo-800 font-medium">{c.class_name}</span>
                {c.instructor && <span className="text-xs text-indigo-400">{c.instructor}</span>}
                <button type="button" onClick={() => onRemove(c)}
                  className="text-indigo-300 hover:text-red-500 transition-colors text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 mb-2">반 추가</p>
        <input
          type="text"
          value={classSearch}
          onChange={e => setClassSearch(e.target.value)}
          placeholder="반 이름으로 검색…"
          className="w-full max-w-xs border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
        />
        {classSearch.trim() && (
          <div className="mt-2">
            {alreadyEnrolled ? (
              <p className="text-xs text-gray-400">이미 수강 중인 반입니다.</p>
            ) : results.length === 0 ? (
              <p className="text-xs text-gray-400">검색 결과 없음</p>
            ) : (
              <div className="flex flex-col gap-1">
                {results.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => { onAdd(c); setClassSearch(''); }}
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-left hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-full max-w-xs">
                    <span className="text-sm font-medium text-gray-800">{c.class_name}</span>
                    {c.instructor && <span className="text-xs text-gray-400">{c.instructor}</span>}
                    {c.days_of_week && (
                      <div className="flex gap-1 ml-auto">
                        {c.days_of_week.split(',').filter(Boolean).map(d => (
                          <span key={d} className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-lg">{d}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function StudentHistory() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [classSections, setClassSections] = useState([]); // [{cls, hwGroups}]
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [allClasses, setAllClasses] = useState([]);
  const [studentClassIds, setStudentClassIds] = useState(new Set());

  useEffect(() => {
    (async () => {
      const [s, records, classes, units, memberships, absences] = await Promise.all([
        getStudent(studentId),
        getRecordsByStudent(studentId),
        getClasses(),
        getUnits(),
        getAllClassMemberships(),
        getAbsencesByStudentId(studentId),
      ]);

      setStudent(s);
      setTotalCount(records.length);
      setAllClasses(classes);
      setStudentClassIds(new Set(
        memberships.filter(m => m.student_id === studentId).map(m => m.class_id)
      ));

      // 숙제·단원 조회
      const hwIds = [...new Set(records.map(r => r.homework_id).filter(Boolean))];
      const homeworks = await getHomeworksByIds(hwIds);

      const hwById = Object.fromEntries(homeworks.map(h => [h.id, h]));
      const unitsById = Object.fromEntries(units.map(u => [u.id, u]));

      // 반별 결석 날짜 맵
      const absenceMap = {}; // class_id → Set<session_date>
      for (const a of absences) {
        if (!absenceMap[a.class_id]) absenceMap[a.class_id] = [];
        absenceMap[a.class_id].push(a.session_date);
      }

      // 반별 레코드 맵
      const classRecordMap = {};
      for (const r of records) {
        const ckey = r.class_id ?? '__none__';
        if (!classRecordMap[ckey]) classRecordMap[ckey] = [];
        classRecordMap[ckey].push({ ...r, _unit: unitsById[r.unit_id] ?? null });
      }

      // 채점 기록이 있거나 결석이 있는 반 목록
      const classesWithData = new Set([
        ...classes.filter(c => classRecordMap[c.id]).map(c => c.id),
        ...Object.keys(absenceMap),
      ]);

      const orderedClasses = classes.filter(c => classesWithData.has(c.id));
      if (classRecordMap['__none__']?.length) orderedClasses.push(null);

      const sections = [];
      for (const cls of orderedClasses) {
        const ckey = cls?.id ?? '__none__';
        const recs = classRecordMap[ckey] ?? [];

        // 숙제별 그룹핑: (title + period) 조합 키
        const hwGroupMap = {};
        for (const r of recs) {
          const hw = r.homework_id ? hwById[r.homework_id] : null;
          const title = hw?.title ?? null;
          const period = hw?.period ?? null;
          const gkey = `${title ?? ''}__${period ?? ''}`;
          if (!hwGroupMap[gkey]) {
            hwGroupMap[gkey] = {
              key: gkey,
              title,
              period,
              unitLabel: r._unit?.unit_name ?? r._unit?.subject ?? null,
              records: [],
            };
          }
          hwGroupMap[gkey].records.push(r);
        }

        sections.push({
          cls,
          hwGroups: Object.values(hwGroupMap),
          absenceDates: absenceMap[cls?.id] ?? [],
        });
      }

      setClassSections(sections);
      setLoading(false);
    })();
  }, [studentId]);

  async function handleAddToClass(cls) {
    await addStudentToClass(cls.id, studentId);
    setStudentClassIds(prev => new Set([...prev, cls.id]));
  }

  async function handleRemoveFromClass(cls) {
    if (!confirm(`'${cls.class_name}'에서 이 학생을 제외하시겠습니까?`)) return;
    await removeStudentFromClass(cls.id, studentId);
    setStudentClassIds(prev => { const next = new Set(prev); next.delete(cls.id); return next; });
  }

  async function handleSave(form) {
    setSaving(true);
    try {
      const updated = await updateStudent(student.id, {
        name: form.name.trim(),
        grade: form.grade || null,
        school: form.school.trim() || null,
      });
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-white">{student.name.slice(0, 1)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-gray-900">{student.name}</h1>
              {student.grade && (
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  {student.grade}
                </span>
              )}
            </div>
            {student.school && (
              <p className="text-sm text-gray-500 mt-0.5">{student.school}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {totalCount > 0 ? `총 ${totalCount}건 채점 기록` : '채점 기록 없음'}
            </p>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl font-semibold transition-colors flex-shrink-0">
              수정
            </button>
          )}
        </div>
      </div>

      {/* 편집 패널 */}
      {editing && (
        <div className="mb-4 space-y-3">
          <EditStudentForm
            student={student}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
            saving={saving}
          />
          <ClassManager
            allClasses={allClasses}
            studentClassIds={studentClassIds}
            onAdd={handleAddToClass}
            onRemove={handleRemoveFromClass}
          />
        </div>
      )}

      {/* 빈 상태 */}
      {classSections.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-3xl mb-3">📝</p>
          <p className="text-sm">채점 기록이 없습니다.</p>
        </div>
      )}

      {/* 반별 → 숙제별 → 횡스크롤 */}
      {classSections.map(({ cls, hwGroups, absenceDates }) => (
        <ClassSection key={cls?.id ?? '__none__'} cls={cls} hwGroups={hwGroups} absenceDates={absenceDates} />
      ))}
    </div>
  );
}
