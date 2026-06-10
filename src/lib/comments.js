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

// ── 1차 코멘트 (Part A + B) ─────────────────────────────────────────────────

export function generateComment1st({ kpi1, preset_type, process_score, sentences = [] }) {
  const A = byPart(sentences, 'A');
  const B = byPart(sentences, 'B');

  // Part A — 이행 총평
  let partA;
  if (kpi1.completion_rate >= 0.9)      partA = pick(A, 'completion_high');
  else if (kpi1.completion_rate >= 0.7) partA = pick(A, 'completion_mid');
  else                                   partA = pick(A, 'completion_low');

  // Part B — 오답 유형 진단
  const wrongHigh      = kpi1.wrong_rate >= 0.3;
  const gaveupHigh     = kpi1.gave_up_rate >= 0.2;
  const notAttemptHigh = kpi1.not_attempted_rate >= 0.2;
  const calcType  = preset_type === 'calculation_accuracy' || preset_type === 'graph_interpretation';
  const proofType = preset_type === 'proof_description'    || preset_type === 'application';

  let partB;
  if (calcType && wrongHigh)                   partB = pick(B, 'calculation_wrong');
  else if (proofType && process_score === 'poor') partB = pick(B, 'proof_poor_process');
  else if (proofType && wrongHigh)              partB = pick(B, 'calculation_wrong');
  else if (gaveupHigh)                          partB = pick(B, 'gaveup_high');
  else if (notAttemptHigh)                      partB = pick(B, 'not_attempted_high');
  else if (wrongHigh)                           partB = pick(B, 'calculation_wrong');
  else                                          partB = pick(B, 'default');

  return [partA, partB].join(' ');
}

// ── 2차 코멘트 (Part C) ──────────────────────────────────────────────────────

export function generateComment2nd({ kpi2, sentences = [] }) {
  if (!kpi2) return null;
  const C = byPart(sentences, 'C');
  if (kpi2.understanding_rate >= 0.7)      return pick(C, 'understanding_high');
  else if (kpi2.understanding_rate >= 0.4) return pick(C, 'understanding_mid');
  else                                      return pick(C, 'understanding_low');
}

// ── clinic 판정 ──────────────────────────────────────────────────────────────

export function shouldFlagClinic({ kpi1, kpi2 }) {
  if (kpi2) return kpi2.unresolved_rate >= 0.3 || kpi2.repeat_error_rate > 0;
  return kpi1.gave_up_rate >= 0.3;
}
