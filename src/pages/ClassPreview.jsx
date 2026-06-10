import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import GradingCard, { CARD_W, CARD_H } from '../components/GradingCard.jsx';
import { getClassByName, getStudentsByClassId, getRecordsByStudentIds, getSecondRoundsByDate, getUnits, updateRecordComment, updateRecordComment2 } from '../lib/store.js';
import { today } from '../lib/dateUtils.js';
import DateSelector from '../components/DateSelector.jsx';

const A4_W = 210, A4_H = 297, MARGIN = 5;
const CARD_MM_W = (A4_W - MARGIN * 2) / 2;
const CARD_MM_H = (A4_H - MARGIN * 2) / 3;

export default function ClassPreview() {
  const { className } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(className);

  const [searchParams, setSearchParams] = useSearchParams();
  const sessionDate = searchParams.get('date') ?? today();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const cardRefs = useRef({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [cls, units] = await Promise.all([getClassByName(decoded), getUnits()]);
      const classId = cls?.id ?? null;
      const students = classId ? await getStudentsByClassId(classId) : [];
      const studentIds = students.map(s => s.id);

      const [records, secondRecords] = await Promise.all([
        getRecordsByStudentIds(studentIds, sessionDate, classId),
        getSecondRoundsByDate(studentIds, sessionDate, classId),
      ]);

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
  }, [decoded, sessionDate]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCommentChange(recordId, value) {
    await updateRecordComment(recordId, value);
    setEntries(prev => prev.map(e =>
      e.record?.id === recordId ? { ...e, record: { ...e.record, manual_comment: value } } : e
    ));
  }

  async function handleCommentChange2(recordId, value) {
    await updateRecordComment2(recordId, value);
    setEntries(prev => prev.map(e =>
      e.secondRecord?.id === recordId
        ? { ...e, secondRecord: { ...e.secondRecord, manual_comment_2: value } }
        : e
    ));
  }

  async function handleExportPDF() {
    const withRecords = entries.filter(e => e.record);
    if (!withRecords.length) return alert('채점 기록이 있는 학생이 없습니다.');
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      for (let i = 0; i < withRecords.length; i++) {
        const entry = withRecords[i];
        if (i > 0 && i % 6 === 0) pdf.addPage();
        const pos = i % 6;
        const col = pos % 2;
        const row = Math.floor(pos / 2);
        const x = MARGIN + col * CARD_MM_W;
        const y = MARGIN + row * CARD_MM_H;
        const el = cardRefs.current[entry.student.id];
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x + 0.5, y + 0.5, CARD_MM_W - 1, CARD_MM_H - 1);
      }
      pdf.save(`${decoded}_평가서_${sessionDate}.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중…</div>;

  const withRecords = entries.filter(e => e.record);
  const withoutRecords = entries.filter(e => !e.record);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-sm">← 학생 목록</button>
        <h1 className="text-xl font-bold text-gray-900">{decoded} — 평가서 미리보기</h1>
      </div>

      {/* 날짜 선택 */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <DateSelector date={sessionDate} onChange={d => setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('date', d); return p; })} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">채점 완료 {withRecords.length}명 · 미채점 {withoutRecords.length}명</div>
        <button onClick={handleExportPDF} disabled={exporting || !withRecords.length}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${exporting ? 'bg-gray-200 text-gray-400 cursor-wait' : !withRecords.length ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'}`}>
          {exporting ? '⏳ PDF 생성 중...' : '📄 PDF 다운로드'}
        </button>
      </div>

      {withoutRecords.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
          이 날짜 채점 없음: {withoutRecords.map(e => e.student.name).join(', ')}
        </div>
      )}

      {withRecords.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">이 날짜의 채점 기록이 없습니다.</div>
      ) : (
        <div className="flex flex-wrap gap-6">
          {withRecords.map(entry => (
            <div key={entry.student.id} className="flex flex-col gap-2">
              <GradingCard
                ref={el => { cardRefs.current[entry.student.id] = el; }}
                record={entry.record}
                student={entry.student}
                unit={entry.unit}
                secondRecord={entry.secondRecord}
                editable
                onCommentChange={handleCommentChange}
                onCommentChange2={handleCommentChange2}
              />
              <p className="text-xs text-gray-400 text-center">코멘트 텍스트 박스에서 직접 수정 가능</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
