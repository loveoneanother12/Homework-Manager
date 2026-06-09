// 코멘트 문장 풀 — 하드코딩 백업 (DB 초기화/오삭제 대비)

export const DEFAULT_SENTENCES = [
  // Part A — 이행 총평
  { id: 'a1', part: 'A', condition_key: 'completion_high', sentence_text: '이번 과제를 성실하게 완수하였습니다.', is_active: true },
  { id: 'a2', part: 'A', condition_key: 'completion_mid',  sentence_text: '대부분의 문제를 시도하였으나 일부 미완성 문항이 있습니다.', is_active: true },
  { id: 'a3', part: 'A', condition_key: 'completion_low',  sentence_text: '전반적인 과제 이행률이 낮아 성실도 점검이 필요합니다.', is_active: true },
  { id: 'a0', part: 'A', condition_key: 'default',         sentence_text: '과제를 제출하였습니다.', is_active: true },

  // Part B — 오답 유형 진단
  { id: 'b1', part: 'B', condition_key: 'calculation_wrong',  sentence_text: '계산 과정에서 반복적인 실수가 나타나고 있어 검산 습관 형성이 필요합니다.', is_active: true },
  { id: 'b2', part: 'B', condition_key: 'gaveup_high',         sentence_text: '개념 이해 자체에 어려움이 있는 문항이 다수 확인됩니다. 클리닉이 권장됩니다.', is_active: true },
  { id: 'b3', part: 'B', condition_key: 'not_attempted_high',  sentence_text: '시도조차 하지 않은 문항이 많아 과제 태도 점검이 필요합니다.', is_active: true },
  { id: 'b4', part: 'B', condition_key: 'proof_poor_process',  sentence_text: '풀이 과정 서술이 미흡하여 논리적 흐름을 확인하기 어렵습니다.', is_active: true },
  { id: 'b0', part: 'B', condition_key: 'default',             sentence_text: '특이 오답 패턴 없이 안정적으로 해결하였습니다.', is_active: true },

  // Part C — 2차 개선 여부
  { id: 'c1', part: 'C', condition_key: 'understanding_high', sentence_text: '오답노트를 통해 대부분의 오류를 스스로 교정하였습니다.', is_active: true },
  { id: 'c2', part: 'C', condition_key: 'understanding_mid',  sentence_text: '오답 일부를 해결하였으나 반복 오류 문항에 대한 추가 확인이 필요합니다.', is_active: true },
  { id: 'c3', part: 'C', condition_key: 'understanding_low',  sentence_text: '오답노트 후에도 해결되지 않은 문항이 많아 개별 클리닉을 권장합니다.', is_active: true },
  { id: 'c0', part: 'C', condition_key: 'default',            sentence_text: '오답노트를 확인하였습니다.', is_active: true },
];
