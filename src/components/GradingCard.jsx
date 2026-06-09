import { forwardRef } from 'react';
import { pct } from '../lib/kpi.js';

// 카드 고정 크기: 378px × 302px (≈10cm × 8cm @ 96dpi)
// html2canvas 캡처 대상 — 외부 스타일 의존 금지, 인라인 스타일 사용

const CARD_W = 378;
const CARD_H = 302;

function Bar({ rate, color = '#6366f1' }) {
  return (
    <div style={{ background: '#e5e7eb', borderRadius: 3, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(rate * 100, 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
    </div>
  );
}

function KpiRow({ label, rate, color }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
        <span style={{ color: '#6b7280' }}>{label}</span>
        <span style={{ fontWeight: 600, color: '#111827' }}>{pct(rate)}</span>
      </div>
      <Bar rate={rate} color={color} />
    </div>
  );
}

function ScorePill({ value }) {
  const map = { good: { label: '우수', bg: '#dcfce7', color: '#166534' }, needs_work: { label: '보통', bg: '#fef9c3', color: '#854d0e' }, poor: { label: '미흡', bg: '#fee2e2', color: '#991b1b' } };
  const { label, bg, color } = map[value] || { label: value, bg: '#f3f4f6', color: '#374151' };
  return <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9, background: bg, color, fontWeight: 600 }}>{label}</span>;
}

const GradingCard = forwardRef(function GradingCard({ record, student, unit, onCommentChange, editable = false }, ref) {
  if (!record || !student) return null;

  const kpi1 = record._kpi1;
  const kpi2 = record._kpi2 || null;
  const displayComment = record.manual_comment || record.generated_comment || '';
  const hasClinic = record.clinic_flag;
  const hasSecond = !!(record.retry_total != null && record.retry_total !== '');

  return (
    <div
      ref={ref}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: '#fff',
        border: '1.5px solid #d1d5db',
        borderRadius: 8,
        padding: 14,
        fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* 클리닉 플래그 */}
      {hasClinic && (
        <div style={{ position: 'absolute', top: 10, right: 10, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 9 }}>
          클리닉 대상
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8, borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{student.name}</span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>{unit?.unit_name ?? '—'}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af' }}>{record.created_at?.slice(0, 10)}</span>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {/* 좌: KPI */}
        <div style={{ flex: '0 0 140px' }}>
          <KpiRow label="이행률" rate={kpi1.completion_rate} color="#6366f1" />
          <KpiRow label="정답률" rate={kpi1.accuracy_rate} color="#10b981" />
          <div style={{ marginTop: 6, fontSize: 10, color: '#6b7280', marginBottom: 2 }}>오답 유형</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {kpi1.not_attempted_rate > 0 && <span style={{ fontSize: 9, padding: '1px 5px', background: '#fef3c7', color: '#92400e', borderRadius: 6 }}>안 푼 {pct(kpi1.not_attempted_rate)}</span>}
            {kpi1.gave_up_rate > 0 && <span style={{ fontSize: 9, padding: '1px 5px', background: '#fee2e2', color: '#991b1b', borderRadius: 6 }}>손 못 댐 {pct(kpi1.gave_up_rate)}</span>}
            {kpi1.wrong_rate > 0 && <span style={{ fontSize: 9, padding: '1px 5px', background: '#e0e7ff', color: '#3730a3', borderRadius: 6 }}>틀림 {pct(kpi1.wrong_rate)}</span>}
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b7280' }}>
            서술 <ScorePill value={record.process_score} />
          </div>
          {/* 2차 데이터 */}
          {hasSecond && kpi2 && (
            <div style={{ marginTop: 8, borderTop: '1px dashed #e5e7eb', paddingTop: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', marginBottom: 3 }}>2차 채점</div>
              <div style={{ fontSize: 9, color: '#374151' }}>이해도달 {pct(kpi2.understanding_rate)}</div>
              <div style={{ fontSize: 9, color: '#374151' }}>반복오류 {pct(kpi2.repeat_error_rate)}</div>
            </div>
          )}
        </div>

        {/* 우: 코멘트 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>강사 코멘트</div>
          {editable ? (
            <textarea
              value={displayComment}
              onChange={e => onCommentChange?.(record.id, e.target.value)}
              style={{
                flex: 1,
                fontSize: 11,
                lineHeight: 1.6,
                color: '#1f2937',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                padding: 6,
                resize: 'none',
                fontFamily: 'inherit',
                background: '#f9fafb',
              }}
            />
          ) : (
            <div style={{ flex: 1, fontSize: 11, lineHeight: 1.7, color: '#1f2937', background: '#f9fafb', borderRadius: 4, padding: 6, border: '1px solid #e5e7eb', wordBreak: 'keep-all' }}>
              {displayComment}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default GradingCard;
export { CARD_W, CARD_H };
