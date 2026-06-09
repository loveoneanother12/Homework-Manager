import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import GradingCard, { CARD_W, CARD_H } from '../components/GradingCard.jsx';
import { getStudentsByClass, getRecordsByClass, getUnits, updateRecordComment } from '../lib/store.js';

const A4_W = 210, A4_H = 297, MARGIN = 5;
const CARD_MM_W = (A4_W - MARGIN * 2) / 2;
const CARD_MM_H = (A4_H - MARGIN * 2) / 3;

export default function ClassPreview() {
  const { className } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(className);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const cardRefs = useRef({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [students, records, units] = await Promise.all([
        getStudentsByClass(decoded),
        getRecordsByClass(decoded),
        getUnits(),
      ]);
      const recordById = Object.fromEntries(records.map(r => [r.student_id, r]));
      const unitsById = Object.fromEntries(units.map(u => [u.id, u]));
      setEntries(students.map(s => ({
        student: s,
        record: recordById[s.id] ?? null,
        unit: recordById[s.id] ? (unitsById[recordById[s.id].unit_id] ?? null) : null,
      })));
    } finally {
      setLoading(false);
    }
  }, [decoded]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCommentChange(recordId, value) {
    await updateRecordComment(recordId, value);
    setEntries(prev => prev.map(e =>
      e.record?.id === recordId ? { ...e, record: { ...e.record, manual_comment: value } } : e
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
      pdf.save(`${decoded}_평가서_${new Date().toISOString().slice(0, 10)}.pdf`);
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

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">채점 완료 {withRecords.length}명 · 미채점 {withoutRecords.length}명</div>
        <button onClick={handleExportPDF} disabled={exporting || !withRecords.length}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${exporting ? 'bg-gray-200 text-gray-400 cursor-wait' : !withRecords.length ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'}`}>
          {exporting ? '⏳ PDF 생성 중...' : '📄 PDF 다운로드'}
        </button>
      </div>

      {withoutRecords.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
          채점 기록 없음: {withoutRecords.map(e => e.student.name).join(', ')}
        </div>
      )}

      {withRecords.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">아직 채점 기록이 없습니다.</div>
      ) : (
        <div className="flex flex-wrap gap-6">
          {withRecords.map(entry => (
            <div key={entry.student.id} className="flex flex-col gap-2">
              <GradingCard
                ref={el => { cardRefs.current[entry.student.id] = el; }}
                record={entry.record}
                student={entry.student}
                unit={entry.unit}
                editable
                onCommentChange={handleCommentChange}
              />
              <p className="text-xs text-gray-400 text-center">코멘트 텍스트 박스에서 직접 수정 가능</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
