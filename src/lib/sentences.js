// 코멘트 문장 풀 — 하드코딩 백업 (DB 초기화/오삭제 대비)

export const DEFAULT_SENTENCES = [
  // 파트 1 — 이행 총평 (1차, 항상)
  { id: 'p1_high', part: '1', condition_key: 'completion_high', sentence_text: '부여된 과제를 빠짐없이 완수하였습니다. 꾸준한 학습 태도가 잘 자리잡고 있습니다.', is_active: true },
  { id: 'p1_mid',  part: '1', condition_key: 'completion_mid',  sentence_text: '과제 대부분을 충실히 시도하였습니다. 일부 미완성된 문항은 마무리 학습으로 클리닉 지도하겠습니다.', is_active: true },
  { id: 'p1_low',  part: '1', condition_key: 'completion_low',  sentence_text: '과제를 잘 시도하였으나, 이행률에서 다소 보완이 필요합니다. 학습 분량을 끝까지 완성할 수 있도록 추가 지도하겠습니다.', is_active: true },
  { id: 'p1_fb',   part: '1', condition_key: 'fallback',        sentence_text: '과제 제출을 잘 확인하였습니다.', is_active: true },

  // 파트 2 — 오답 유형 진단 (1차, 항상)
  { id: 'p2_gaveup',  part: '2', condition_key: 'gave_up_dominant',       sentence_text: '개념을 처음 적용하는 문항에서 어려움을 느낀 부분이 있어, 해당 개념의 기본 문제를 다시 짚어보면 도움될 것으로 생각됩니다.', is_active: true },
  { id: 'p2_notatmp', part: '2', condition_key: 'not_attempted_dominant', sentence_text: '남아있는 미시도 문항에 대해서는 안 풀리는 문제더라도 끝까지 시도하는 연습이 더해지면 좋겠습니다.', is_active: true },
  { id: 'p2_wrong_g', part: '2', condition_key: 'wrong_dominant_general', sentence_text: '전 문항에 적극적으로 풀이를 시도하였습니다. 마무리 단계의 정확도를 높이는 부분에서 보완이 필요합니다.', is_active: true },
  { id: 'p2_wrong_c', part: '2', condition_key: 'wrong_dominant_calc',    sentence_text: '풀이 접근은 좋으나, 계산 마무리와 검산 습관을 더하면 정확도가 한층 올라갈 것으로 생각됩니다.', is_active: true },
  { id: 'p2_noissue', part: '2', condition_key: 'no_issue',               sentence_text: '오답 유형은 특이 경향 없이 안정적으로 문제를 잘 해결하였습니다.', is_active: true },
  { id: 'p2_fb',      part: '2', condition_key: 'fallback',               sentence_text: '문항별 채점을 잘 확인하였습니다.', is_active: true },

  // 파트 3 — 풀이 서술 평가 (1차, 조건부: process_score 있을 때만)
  { id: 'p3_good_l', part: '3', condition_key: 'good_logic',        sentence_text: '문제풀이와 함께 풀이과정의 논리 전개가 짜임새 있게 서술되었습니다.', is_active: true },
  { id: 'p3_good_g', part: '3', condition_key: 'good_general',      sentence_text: '문제풀이와 함께 풀이과정을 깔끔하게 잘 서술하였습니다.', is_active: true },
  { id: 'p3_nw_l',   part: '3', condition_key: 'needs_work_logic',  sentence_text: '문제풀이와 함께 풀이과정에서 논리 전개를 한 단계씩 나누어 꼼꼼히 서술하는 연습이 있으면 좋겠습니다.', is_active: true },
  { id: 'p3_nw_g',   part: '3', condition_key: 'needs_work_general', sentence_text: '문제풀이와 함께 풀이과정의 줄맞춤, 표기법 준수, 단락화를 신경써서 꼼꼼히 서술하는 연습이 있으면 좋겠습니다.', is_active: true },
  { id: 'p3_poor',   part: '3', condition_key: 'poor',              sentence_text: '문제풀이와 함께 사고 흐름이 드러나도록 풀이과정을 차근차근 적어가는 연습도 더해지면 좋겠습니다.', is_active: true },

  // 파트 4 — 오답 교정 결과 (2차, 항상)
  { id: 'p4_high', part: '4', condition_key: 'understanding_high', sentence_text: '오답노트 재채점 결과 지난 과제가 잘 교정되었습니다. 자기주도 복습이 잘 이루어지고 있습니다.', is_active: true },
  { id: 'p4_mid',  part: '4', condition_key: 'understanding_mid',  sentence_text: '오답노트 재채점 결과 상당수 문항이 교정되었습니다. 남은 문항은 개별 클리닉으로 재검하겠습니다.', is_active: true },
  { id: 'p4_low',  part: '4', condition_key: 'understanding_low',  sentence_text: '오답노트 재채점 결과 다시 공부할 문항이 확인되었습니다. 남은 문항은 개별 클리닉으로 재검하겠습니다.', is_active: true },
  { id: 'p4_fb',   part: '4', condition_key: 'fallback',           sentence_text: '오답노트 재채점을 잘 확인하였습니다.', is_active: true },

  // 파트 5 — 반복 오류·미해결 경고 (2차, 조건부: retry_wrong > 0 또는 retry_gave_up > 0)
  { id: 'p5_repeat',   part: '5', condition_key: 'repeat_error_only', sentence_text: '오답노트에서도 반복적으로 틀린 문항은 개별 클리닉 지도하겠습니다.', is_active: true },
  { id: 'p5_unresolved', part: '5', condition_key: 'unresolved_only', sentence_text: '오답노트에서도 반복적으로 미해결된 문항은 개별 클리닉 지도하겠습니다.', is_active: true },
  { id: 'p5_both',     part: '5', condition_key: 'both',              sentence_text: '오답노트에서 추가적인 지도가 필요한 문항은 개별 클리닉 지도하겠습니다.', is_active: true },

  // 파트 6 — 오답노트 서술 (2차, 조건부: note_quality 있을 때만)
  { id: 'p6_good', part: '6', condition_key: 'note_good',       sentence_text: '풀이과정도 꼼꼼히 잘 정리하였습니다.', is_active: true },
  { id: 'p6_nw',   part: '6', condition_key: 'note_needs_work', sentence_text: '풀이과정을 잘 작성하였고, 줄맞춤이나 표기 방식을 추가로 꼼꼼히 신경쓰면 더 좋겠습니다.', is_active: true },
  { id: 'p6_poor', part: '6', condition_key: 'note_poor',       sentence_text: '풀이과정 서술을 더 꼼꼼히 신경쓰면 좋겠습니다.', is_active: true },
];
