// 알고리즘 기반 코멘트 생성 — AI API 미사용

import { DEFAULT_SENTENCES } from './sentences.js';

function pick(list, condition_key) {
  const m = list.find(s => s.condition_key === condition_key && s.is_active !== false);
  return m?.sentence_text ?? null;
}

function fallback(list) {
  const f = list.find(s => s.condition_key === 'fallback' && s.is_active !== false);
  return f?.sentence_text ?? list.at(-1)?.sentence_text ?? '';
}

function byPart(sentences, part) {
  const pool = sentences.filter(s => s.part === part);
  return pool.length > 0 ? pool : DEFAULT_SENTENCES.filter(s => s.part === part);
}

// ── 1차 코멘트 (파트 1 + 2 + 3) ──────────────────────────────────────────────

export function generateComment1st({ kpi1, preset_type, process_score, sentences = [] }) {
  const P1 = byPart(sentences, '1');
  const P2 = byPart(sentences, '2');
  const P3 = byPart(sentences, '3');

  // 파트 1 — 이행 총평 (항상)
  let part1;
  if (kpi1.completion_rate >= 0.9)      part1 = pick(P1, 'completion_high');
  else if (kpi1.completion_rate >= 0.7) part1 = pick(P1, 'completion_mid');
  else                                   part1 = pick(P1, 'completion_low');
  if (!part1) part1 = fallback(P1);

  // 파트 2 — 오답 유형 진단 (항상)
  const calcType = preset_type === 'calculation_accuracy' || preset_type === 'graph_interpretation';
  const { gave_up_rate, not_attempted_rate, wrong_rate } = kpi1;
  const maxRate = Math.max(gave_up_rate, not_attempted_rate, wrong_rate);

  let part2;
  if (maxRate < 0.15) {
    part2 = pick(P2, 'no_issue');
  } else if (gave_up_rate >= not_attempted_rate && gave_up_rate >= wrong_rate) {
    part2 = pick(P2, 'gave_up_dominant');
  } else if (not_attempted_rate >= wrong_rate) {
    part2 = pick(P2, 'not_attempted_dominant');
  } else {
    part2 = pick(P2, calcType ? 'wrong_dominant_calc' : 'wrong_dominant_general');
  }
  if (!part2) part2 = fallback(P2);

  // 파트 3 — 풀이 서술 평가 (조건부: process_score 있을 때만)
  let part3 = null;
  if (process_score) {
    const logicType = preset_type === 'proof_description' || preset_type === 'application';
    if (process_score === 'good')
      part3 = pick(P3, logicType ? 'good_logic' : 'good_general');
    else if (process_score === 'needs_work')
      part3 = pick(P3, logicType ? 'needs_work_logic' : 'needs_work_general');
    else if (process_score === 'poor')
      part3 = pick(P3, 'poor');
  }

  return [part1, part2, part3].filter(Boolean).join(' ');
}

// ── 2차 코멘트 (파트 4 + 5 + 6) ──────────────────────────────────────────────

export function generateComment2nd({ kpi2, retry_wrong = 0, retry_gave_up = 0, note_quality = null, sentences = [] }) {
  if (!kpi2) return null;
  const P4 = byPart(sentences, '4');
  const P5 = byPart(sentences, '5');
  const P6 = byPart(sentences, '6');

  // 파트 4 — 오답 교정 결과 (항상)
  let part4;
  if (kpi2.understanding_rate >= 0.7)      part4 = pick(P4, 'understanding_high');
  else if (kpi2.understanding_rate >= 0.4) part4 = pick(P4, 'understanding_mid');
  else                                      part4 = pick(P4, 'understanding_low');
  if (!part4) part4 = fallback(P4);

  // 파트 5 — 반복 오류·미해결 경고 (조건부)
  const hasRepeat = retry_wrong > 0;
  const hasUnresolved = retry_gave_up > 0;
  let part5 = null;
  if (hasRepeat && hasUnresolved) part5 = pick(P5, 'both');
  else if (hasRepeat)             part5 = pick(P5, 'repeat_error_only');
  else if (hasUnresolved)         part5 = pick(P5, 'unresolved_only');

  // 파트 6 — 오답노트 서술 (조건부)
  let part6 = null;
  if (note_quality === 'good')       part6 = pick(P6, 'note_good');
  else if (note_quality === 'needs_work') part6 = pick(P6, 'note_needs_work');
  else if (note_quality === 'poor')  part6 = pick(P6, 'note_poor');

  return [part4, part5, part6].filter(Boolean).join(' ') || null;
}

// ── clinic 판정 ──────────────────────────────────────────────────────────────

export function shouldFlagClinic({ kpi1, kpi2 }) {
  if (kpi2) return kpi2.unresolved_rate >= 0.3 || kpi2.repeat_error_rate > 0;
  return kpi1.gave_up_rate >= 0.3;
}
