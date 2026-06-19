import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import GradingCard, { CARD_W, CARD_H } from '../components/GradingCard.jsx';
import { getClassByName, getStudentsByClassId, getRecordsByStudentIds, getSecondRoundsByDate, getUnits, updateRecordComment, updateRecordComment2, getAbsentStudentIds, getHomework } from '../lib/store.js';
import { today } from '../lib/dateUtils.js';
import DateSelector from '../components/DateSelector.jsx';

const A4_W = 210, A4_H = 297, MARGIN = 5;
const CARD_MM_W = (A4_W - MARGIN * 2) / 2; // 100mm = 10cm
const CARD_MM_H_MIN = 50;                   // 최소 높이 50mm = 5cm
const ROW_GAP = 2;                          // 행 간격 2mm

export default function ClassPreview() {
  const { className, homeworkId } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(className);

  const [searchParams] = useSearchParams();
  const sessionDate = searchParams.get('date') ?? today();
  const fromClassDetail = searchParams.get('from') === 'class-detail';
  const fromClassId = searchParams.get('classId');

  const [entries, setEntries] = useState([]);
  const [homework, setHomework] = useState(null);
  const [absentIds, setAbsentIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const cardRefs = useRef({});
  const pdfCardRefs = useRef({});
  const pdfTitleRef = useRef(null);

  // 코멘트 디바운스 저장 — 키 입력마다 쓰지 않고 0.8초 멈추면 저장
  const saveTimers = useRef({});   // key('1:id'|'2:id') → timeout id
  const pendingSaves = useRef({}); // key → 저장 함수 (항상 최신 값의 클로저)
  const [saveStates, setSaveStates] = useState({}); // key → 'pending' | 'saved'

  async function flushSave(key) {
    clearTimeout(saveTimers.current[key]);
    const fn = pendingSaves.current[key];
    if (!fn) return;
    delete pendingSaves.current[key];
    await fn();
    setSaveStates(s => ({ ...s, [key]: 'saved' }));
  }

  function scheduleSave(key, fn) {
    pendingSaves.current[key] = fn;
    clearTimeout(saveTimers.current[key]);
    setSaveStates(s => ({ ...s, [key]: 'pending' }));
    saveTimers.current[key] = setTimeout(() => flushSave(key), 800);
  }

  function flushAll() {
    return Promise.all(Object.keys(pendingSaves.current).map(k => flushSave(k)));
  }

  // 페이지 이탈 시 미저장분 발사 (fire-and-forget)
  useEffect(() => () => {
    for (const k of Object.keys(pendingSaves.current)) {
      const fn = pendingSaves.current[k];
      delete pendingSaves.current[k];
      fn?.();
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [cls, units, hw] = await Promise.all([getClassByName(decoded), getUnits(), getHomework(homeworkId)]);
      const classId = cls?.id ?? null;
      setHomework(hw);
      const students = classId ? await getStudentsByClassId(classId) : [];
      const studentIds = students.map(s => s.id);

      const [records, secondRecords, absentList] = await Promise.all([
        getRecordsByStudentIds(studentIds, sessionDate, classId, homeworkId),
        getSecondRoundsByDate(studentIds, sessionDate, classId, homeworkId),
        classId ? getAbsentStudentIds(classId, sessionDate) : [],
      ]);
      setAbsentIds(new Set(absentList));

      // 학생별 당일 1차 레코드 (이미 created_at desc 정렬)
      const recordByStudent = {};
      for (const r of records) {
        if (!recordByStudent[r.student_id]) recordByStudent[r.student_id] = r;
      }

      // 학생별 당일 2차 완료 레코드 (second_session_date = 오늘인 이전 회차)
      const secondByStudent = {};
      for (const r of secondRecords) {
        if (!secondByStudent[r.student_id]) secondByStudent[r.student_id] = r;
      }

      const unitsById = Object.fromEntries(units.map(u => [u.id, u]));
      setEntries(students.map(s => ({
        student: s,
        record: recordByStudent[s.id] ?? null,
        secondRecord: secondByStudent[s.id] ?? null,
        unit: recordByStudent[s.id] ? (unitsById[recordByStudent[s.id].unit_id] ?? null) : null,
      })));
    } finally {
      setLoading(false);
    }
  }, [decoded, homeworkId, sessionDate]);

  useEffect(() => { refresh(); }, [refresh]);

  function handleCommentChange(recordId, value) {
    setEntries(prev => prev.map(e =>
      e.record?.id === recordId ? { ...e, record: { ...e.record, manual_comment: value } } : e
    ));
    scheduleSave(`1:${recordId}`, () => updateRecordComment(recordId, value));
  }

  function handleCommentChange2(recordId, value) {
    setEntries(prev => prev.map(e =>
      e.secondRecord?.id === recordId
        ? { ...e, secondRecord: { ...e.secondRecord, manual_comment_2: value } }
        : e
    ));
    scheduleSave(`2:${recordId}`, () => updateRecordComment2(recordId, value));
  }

  async function handleCommentReset(recordId) {
    if (!confirm('수정한 코멘트를 버리고 자동 생성 코멘트로 되돌리시겠습니까?')) return;
    clearTimeout(saveTimers.current[`1:${recordId}`]);
    delete pendingSaves.current[`1:${recordId}`];
    await updateRecordComment(recordId, null);
    setEntries(prev => prev.map(e =>
      e.record?.id === recordId ? { ...e, record: { ...e.record, manual_comment: null } } : e
    ));
    setSaveStates(s => ({ ...s, [`1:${recordId}`]: 'saved' }));
  }

  async function handleCommentReset2(recordId) {
    if (!confirm('수정한 코멘트를 버리고 자동 생성 코멘트로 되돌리시겠습니까?')) return;
    clearTimeout(saveTimers.current[`2:${recordId}`]);
    delete pendingSaves.current[`2:${recordId}`];
    await updateRecordComment2(recordId, null);
    setEntries(prev => prev.map(e =>
      e.secondRecord?.id === recordId
        ? { ...e, secondRecord: { ...e.secondRecord, manual_comment_2: null } }
        : e
    ));
    setSaveStates(s => ({ ...s, [`2:${recordId}`]: 'saved' }));
  }

  async function handleExportPDF() {
    const withRecords = entries.filter(e => e.record && !absentIds.has(e.student.id));
    if (!withRecords.length) return alert('채점 기록이 있는 학생이 없습니다.');
    setExporting(true);
    try {
      await flushAll();
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const TITLE_W_MM = CARD_MM_W * 2; // 200mm — 페이지 전체 폭(여백 제외)

      // 타이틀 캡처 (한국어 → html2canvas로 렌더링)
      const titleEl = pdfTitleRef.current;
      let titleDataUrl = null;
      let titleHeightMM = 0;
      if (titleEl) {
        const tc = await html2canvas(titleEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
        titleDataUrl = tc.toDataURL('image/png');
        titleHeightMM = TITLE_W_MM * tc.height / tc.width;
      }
      const TITLE_GAP = 2;
      const cardsStartY = MARGIN + titleHeightMM + TITLE_GAP;

      function addTitle() {
        if (titleDataUrl) pdf.addImage(titleDataUrl, 'PNG', MARGIN, MARGIN, TITLE_W_MM, titleHeightMM);
      }

      // 모든 카드를 먼저 캡처해 실제 높이(mm) 계산
      const captured = await Promise.all(
        withRecords.map(async entry => {
          const el = pdfCardRefs.current[entry.student.id];
          if (!el) return null;
          const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
          const heightMM = Math.max(CARD_MM_H_MIN, CARD_MM_W * canvas.height / canvas.width);
          return { canvas, heightMM };
        })
      );
      const valid = captured.filter(Boolean);

      // 쌍(좌+우) 단위로 가변 높이 레이아웃
      addTitle();
      let currentY = cardsStartY;
      for (let i = 0; i < valid.length; i += 2) {
        const left = valid[i];
        const right = valid[i + 1] ?? null;
        const rowHeight = Math.max(left.heightMM, right?.heightMM ?? 0);

        if (currentY + rowHeight > A4_H - MARGIN) {
          pdf.addPage();
          addTitle();
          currentY = cardsStartY;
        }

        pdf.addImage(left.canvas.toDataURL('image/png'), 'PNG', MARGIN + 0.5, currentY + 0.5, CARD_MM_W - 1, left.heightMM - 1);
        if (right) {
          pdf.addImage(right.canvas.toDataURL('image/png'), 'PNG', MARGIN + CARD_MM_W + 0.5, currentY + 0.5, CARD_MM_W - 1, right.heightMM - 1);
        }

        currentY += rowHeight + ROW_GAP;
      }

      pdf.save(`${decoded}_${homework?.title ?? '숙제'}_평가서_${sessionDate}.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  const absentEntries = entries.filter(e => absentIds.has(e.student.id));
  const withRecords = entries.filter(e => e.record && !absentIds.has(e.student.id));
  const withoutRecords = entries.filter(e => !e.record && !absentIds.has(e.student.id));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => fromClassDetail && fromClassId
            ? navigate(`/manage/class/${fromClassId}`)
            : navigate(`/class/${className}/hw/${homeworkId}?date=${sessionDate}`)
          }
          className="text-gray-400 hover:text-gray-600 text-sm">
          {fromClassDetail ? '← 반 상세' : '← 학생 목록'}
        </button>
        <h1 className="text-xl font-extrabold text-indigo-700">{decoded} — 평가서 미리보기</h1>
        {homework && (
          <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            {homework.period ? `${homework.period}교시 · ` : ''}{homework.title}
          </span>
        )}
      </div>

      {/* 날짜 선택 — 날짜 변경 시 그 날짜의 숙제 목록으로 이동 */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <DateSelector date={sessionDate} onChange={d => navigate(`/class/${className}?date=${d}`)} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          채점 완료 {withRecords.length}명 · 미채점 {withoutRecords.length}명
          {absentEntries.length > 0 && <> · 결석 {absentEntries.length}명</>}
        </div>
        <button onClick={handleExportPDF} disabled={exporting || !withRecords.length}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${exporting ? 'bg-gray-200 text-gray-400 cursor-wait' : !withRecords.length ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'}`}>
          {exporting ? '⏳ PDF 생성 중...' : '📄 PDF 다운로드'}
        </button>
      </div>

      {absentEntries.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          결석 (PDF 제외): {absentEntries.map(e => e.student.name).join(', ')}
        </div>
      )}

      {withoutRecords.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
          이 날짜 채점 없음: {withoutRecords.map(e => e.student.name).join(', ')}
        </div>
      )}

      {withRecords.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">이 날짜의 채점 기록이 없습니다.</div>
      ) : (
        <div className="flex flex-wrap gap-6">
          {withRecords.map(entry => {
            const stateKeys = [
              `1:${entry.record.id}`,
              ...(entry.secondRecord ? [`2:${entry.secondRecord.id}`] : []),
            ];
            const states = stateKeys.map(k => saveStates[k]).filter(Boolean);
            const status = states.includes('pending')
              ? { text: '저장 중…', cls: 'text-gray-400' }
              : states.includes('saved')
                ? { text: '저장됨 ✓', cls: 'text-emerald-600' }
                : { text: '코멘트 텍스트 박스에서 직접 수정 가능', cls: 'text-gray-400' };
            return (
              <div key={entry.student.id} className="flex flex-col gap-2">
                <GradingCard
                  ref={el => { cardRefs.current[entry.student.id] = el; }}
                  record={entry.record}
                  student={entry.student}
                  unit={entry.unit}
                  secondRecord={entry.secondRecord}
                  classLabel={decoded}
                  editable
                  onCommentChange={handleCommentChange}
                  onCommentChange2={handleCommentChange2}
                  onCommentReset={handleCommentReset}
                  onCommentReset2={handleCommentReset2}
                  onFlush={flushAll}
                />
                <p className={`text-xs text-center ${status.cls}`}>{status.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF 캡처 전용 비표시 영역 */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        {/* 페이지 타이틀 — html2canvas 캡처 후 각 페이지 상단에 삽입 */}
        <div
          ref={pdfTitleRef}
          style={{
            width: CARD_W * 2,
            padding: '5px 4px 6px',
            fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            borderBottom: '1.5px solid #d1d5db',
            background: '#ffffff',
            boxSizing: 'border-box',
          }}
        >
          {sessionDate}&nbsp;&nbsp;|&nbsp;&nbsp;{decoded}&nbsp;&nbsp;|&nbsp;&nbsp;{homework?.title ?? ''}
        </div>
        {withRecords.map(entry => (
          <GradingCard
            key={`pdf-${entry.student.id}`}
            ref={el => { pdfCardRefs.current[entry.student.id] = el; }}
            record={entry.record}
            student={entry.student}
            unit={entry.unit}
            secondRecord={entry.secondRecord}
            classLabel={decoded}
            editable={false}
            pdfMode
          />
        ))}
      </div>
    </div>
  );
}
