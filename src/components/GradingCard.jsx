import { forwardRef } from 'react';
import { pct } from '../lib/kpi.js';

// 카드 고정 크기: 378px × 302px (≈10cm × 5cm @ 96dpi)
// html2canvas 캡처 대상 — 외부 스타일 의존 금지, 인라인 스타일 사용

const CARD_W = 378;
const CARD_H = 302;

// PDF 캡처(html2canvas) 시 텍스트가 1px가량 내려앉는 보정.
// 박스·바·하이라이트 배경은 그대로 두고 텍스트만 위로 올린다.
const LIFT = { position: 'relative', top: -1 };
const lift = pdfMode => (pdfMode ? LIFT : null);
// 배경이 글자와 같은 요소에 있는 pill은 요소를 움직이면 배경도 움직이므로,
// 위 패딩을 줄이고 아래 패딩을 늘려 박스 크기는 유지한 채 글자만 올린다.
const pillPad = (pdfMode, v, h) => (pdfMode ? `${v - 1}px ${h}px ${v + 1}px` : `${v}px ${h}px`);

function Bar({ rate, color = '#6366f1' }) {
  return (
    <div style={{ background: '#e5e7eb', borderRadius: 3, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(rate * 100, 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
    </div>
  );
}

function KpiRow({ label, rate, color, pdfMode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
        <span style={{ color: '#6b7280', ...lift(pdfMode) }}>{label}</span>
        <span style={{ fontWeight: 600, color: '#111827', ...lift(pdfMode) }}>{pct(rate)}</span>
      </div>
      <Bar rate={rate} color={color} />
    </div>
  );
}

function ScorePill({ value, pdfMode }) {
  if (!value) return null;
  const map = { good: { label: '우수', bg: '#dcfce7', color: '#166534' }, needs_work: { label: '보통', bg: '#fef9c3', color: '#854d0e' }, poor: { label: '미흡', bg: '#fee2e2', color: '#991b1b' } };
  const { label, bg, color } = map[value] || { label: value, bg: '#f3f4f6', color: '#374151' };
  return <span style={{ fontSize: 9, padding: pillPad(pdfMode, 1, 6), borderRadius: 9, background: bg, color, fontWeight: 600 }}>{label}</span>;
}

function CommentLabel({ text, showReset, onReset, pdfMode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
      <span style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', ...lift(pdfMode) }}>{text}</span>
      {showReset && (
        <button type="button" onClick={onReset}
          style={{ fontSize: 9, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          ↺ 자동 코멘트로
        </button>
      )}
    </div>
  );
}

const GradingCard = forwardRef(function GradingCard({
  record, student, unit, secondRecord, classLabel,
  onCommentChange, onCommentChange2, onCommentReset, onCommentReset2, onFlush,
  editable = false, pdfMode = false,
}, ref) {
  if (!record || !student) return null;

  const kpi1 = record._kpi1;
  // secondRecord: 이번 회차에 2차 채점이 완료된 이전 회차 레코드
  const kpi2 = secondRecord?._kpi2 || null;
  const displayComment = record.manual_comment || record.generated_comment || '';
  const displayComment2 = secondRecord
    ? (secondRecord.manual_comment_2 || secondRecord.generated_comment_2 || '')
    : '';
  const hasClinic = record.clinic_flag;
  const hasSecond = !!secondRecord;

  // 코멘트 본문은 배경이 같은 요소에 있으므로 패딩 재배분으로 글자만 올림
  const commentBodyPad = pdfMode ? '4px 5px 6px' : 5;

  return (
    <div
      ref={ref}
      style={{
        width: CARD_W,
        minHeight: 160,
        background: '#fff',
        border: '1.5px solid #d1d5db',
        borderRadius: 8,
        padding: 14,
        fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* 클리닉 플래그 */}
      {hasClinic && (
        <div style={{ position: 'absolute', top: 10, right: 10, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, padding: pillPad(pdfMode, 2, 7), borderRadius: 9 }}>
          클리닉 대상
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8, borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#111827', ...lift(pdfMode) }}>{student.name}</span>
        {student.grade && <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, ...lift(pdfMode) }}>{student.grade}</span>}
        <span style={{ fontSize: 9, color: '#6b7280', ...lift(pdfMode) }}>{unit?.subject ?? '—'}</span>
        {classLabel && (
          <>
            <span style={{ width: 1, height: 10, background: '#d1d5db', alignSelf: 'center' }} />
            <span style={{ fontSize: 9, color: '#6b7280', ...lift(pdfMode) }}>{classLabel}</span>
          </>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af', ...lift(pdfMode) }}>{record.created_at?.slice(0, 10)}</span>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {/* 좌: KPI */}
        <div style={{ flex: '0 0 140px' }}>
          <KpiRow label="이행률" rate={kpi1.completion_rate} color="#6366f1" pdfMode={pdfMode} />
          <KpiRow label="정답률" rate={kpi1.accuracy_rate} color="#10b981" pdfMode={pdfMode} />
          <div style={{ marginTop: 6, fontSize: 9, color: '#6b7280', marginBottom: 2, ...lift(pdfMode) }}>오답 유형</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {kpi1.gave_up_rate > 0 && <span style={{ fontSize: 9, padding: pillPad(pdfMode, 1, 5), background: '#fee2e2', color: '#991b1b', borderRadius: 6 }}>미완결 {pct(kpi1.gave_up_rate)}</span>}
            {kpi1.wrong_rate > 0 && <span style={{ fontSize: 9, padding: pillPad(pdfMode, 1, 5), background: '#e0e7ff', color: '#3730a3', borderRadius: 6 }}>오답 {pct(kpi1.wrong_rate)}</span>}
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: '#6b7280' }}>
            <span style={lift(pdfMode) ?? undefined}>서술</span> <ScorePill value={record.process_score} pdfMode={pdfMode} />
          </div>
          {/* 2차 데이터 */}
          {hasSecond && kpi2 && (
            <div style={{ marginTop: 8, borderTop: '1px dashed #e5e7eb', paddingTop: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', marginBottom: 3, ...lift(pdfMode) }}>2차 채점</div>
              <div style={{ fontSize: 9, color: '#374151', ...lift(pdfMode) }}>이해도달 {pct(kpi2.understanding_rate)}</div>
              <div style={{ fontSize: 9, color: '#374151', ...lift(pdfMode) }}>반복오류 {pct(kpi2.repeat_error_rate)}</div>
            </div>
          )}
        </div>

        {/* 우: 코멘트 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {hasSecond ? (
            <>
              <CommentLabel text="이번 과제 코멘트"
                showReset={editable && !!record.manual_comment}
                onReset={() => onCommentReset?.(record.id)}
                pdfMode={pdfMode} />
              {editable ? (
                <textarea
                  value={displayComment}
                  onChange={e => onCommentChange?.(record.id, e.target.value)}
                  onBlur={() => onFlush?.()}
                  style={{ height: 80, fontSize: 10, lineHeight: 1.6, color: '#1f2937', border: '1px solid #d1d5db', borderRadius: 4, padding: 5, resize: 'none', fontFamily: 'inherit', background: '#f9fafb' }}
                />
              ) : (
                <div style={{ fontSize: 9, lineHeight: 1.55, color: '#1f2937', background: '#f9fafb', borderRadius: 4, padding: commentBodyPad, border: '1px solid #e5e7eb', overflowWrap: 'break-word' }}>
                  {displayComment}
                </div>
              )}
              <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />
              <CommentLabel text="오답노트 피드백"
                showReset={editable && !!secondRecord.manual_comment_2}
                onReset={() => onCommentReset2?.(secondRecord.id)}
                pdfMode={pdfMode} />
              {editable ? (
                <textarea
                  value={displayComment2}
                  onChange={e => onCommentChange2?.(secondRecord.id, e.target.value)}
                  onBlur={() => onFlush?.()}
                  style={{ height: 72, fontSize: 10, lineHeight: 1.6, color: '#1f2937', border: '1px solid #d1d5db', borderRadius: 4, padding: 5, resize: 'none', fontFamily: 'inherit', background: '#f9fafb' }}
                />
              ) : (
                <div style={{ fontSize: 9, lineHeight: 1.55, color: '#1f2937', background: '#f9fafb', borderRadius: 4, padding: commentBodyPad, border: '1px solid #e5e7eb', overflowWrap: 'break-word' }}>
                  {displayComment2}
                </div>
              )}
            </>
          ) : (
            <>
              <CommentLabel text="강사 코멘트"
                showReset={editable && !!record.manual_comment}
                onReset={() => onCommentReset?.(record.id)}
                pdfMode={pdfMode} />
              {editable ? (
                <textarea
                  value={displayComment}
                  onChange={e => onCommentChange?.(record.id, e.target.value)}
                  onBlur={() => onFlush?.()}
                  style={{ flex: 1, minHeight: 80, fontSize: 10, lineHeight: 1.6, color: '#1f2937', border: '1px solid #d1d5db', borderRadius: 4, padding: 5, resize: 'none', fontFamily: 'inherit', background: '#f9fafb' }}
                />
              ) : (
                <div style={{ fontSize: 9, lineHeight: 1.55, color: '#1f2937', background: '#f9fafb', borderRadius: 4, padding: commentBodyPad, border: '1px solid #e5e7eb', overflowWrap: 'break-word' }}>
                  {displayComment}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default GradingCard;
export { CARD_W, CARD_H };
