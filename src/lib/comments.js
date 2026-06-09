// 알고리즘 기반 코멘트 생성 — AI API 미사용

import { DEFAULT_SENTENCES } from './sentences.js';

function pick(list, condition_key) {
  const match = list.find(s => s.condition_key === condition_key && s.is_active !== false);
  if (match) return match.sentence_text;
  const fallback = list.find(s => s.condition_key === 'default' && s.is_active !== false);
  return fallback?.sentence_text ?? list.at(-1)?.sentence_text ?? '';
}

function byPart(sentences, part) {
  const pool = sentences.filter(s => s.part === part);
  return pool.length > 0 ? pool : DEFAULT_SENTENCES.filter(s => s.part === part);
}

/**
 * @param {object} opts
 * @param {object} opts.kpi1   - calcFirst() 결과
 * @param {object|null} opts.kpi2   - calcSecond() 결과 or null
 * @param {string} opts.preset_type - calculation_accuracy|proof_description|graph_interpretation|application|default
 * @param {string} opts.process_score - good|needs_work|poor
 * @param {Array}  opts.sentences - hw_sentence_blocks 전체 배열
 */
export function generateComment({ kpi1, kpi2, preset_type, process_score, sentences = [] }) {
  const A = byPart(sentences, 'A');
  const B = byPart(sentences, 'B');
  const C = byPart(sentences, 'C');

  // Part A — 이행 총평
  let partA;
  if (kpi1.completion_rate >= 0.9) partA = pick(A, 'completion_high');
  else if (kpi1.completion_rate >= 0.7) partA = pick(A, 'completion_mid');
  else partA = pick(A, 'completion_low');

  // Part B — 오답 유형 진단 (단원 가중치 반영)
  let partB;
  const wrongHigh      = kpi1.wrong_rate >= 0.3;
  const gaveupHigh     = kpi1.gave_up_rate >= 0.2;
  const notAttemptHigh = kpi1.not_attempted_rate >= 0.2;
  const calcType  = preset_type === 'calculation_accuracy' || preset_type === 'graph_interpretation';
  const proofType = preset_type === 'proof_description'    || preset_type === 'application';

  if (calcType && wrongHigh) {
    partB = pick(B, 'calculation_wrong');
  } else if (proofType && process_score === 'poor') {
    partB = pick(B, 'proof_poor_process');
  } else if (proofType && wrongHigh) {
    partB = pick(B, 'calculation_wrong');
  } else if (gaveupHigh) {
    partB = pick(B, 'gaveup_high');
  } else if (notAttemptHigh) {
    partB = pick(B, 'not_attempted_high');
  } else if (wrongHigh) {
    partB = pick(B, 'calculation_wrong');
  } else {
    partB = pick(B, 'default');
  }

  // Part C — 2차 개선 여부 (데이터 있을 때만)
  let partC = null;
  if (kpi2) {
    if (kpi2.understanding_rate >= 0.7) partC = pick(C, 'understanding_high');
    else if (kpi2.understanding_rate >= 0.4) partC = pick(C, 'understanding_mid');
    else partC = pick(C, 'understanding_low');
  }

  return [partA, partB, ...(partC ? [partC] : [])].join(' ');
}

export function shouldFlagClinic({ kpi1, kpi2 }) {
  if (kpi2) return kpi2.unresolved_rate >= 0.3 || kpi2.repeat_error_rate > 0;
  return kpi1.gave_up_rate >= 0.3;
}
