// KPI 자동 계산 및 유효성 검사

export function calcFirst({ total_count, not_attempted, gave_up, wrong_attempted }) {
  const correct = total_count - not_attempted - gave_up - wrong_attempted;
  const first_wrongs = not_attempted + gave_up + wrong_attempted;
  const safe = (n, d) => (d > 0 ? n / d : 0);

  return {
    correct,
    first_wrongs,
    completion_rate: safe(total_count - not_attempted, total_count),
    accuracy_rate: safe(correct, total_count - not_attempted),
    not_attempted_rate: safe(not_attempted, total_count),
    gave_up_rate: safe(gave_up, total_count),
    wrong_rate: safe(wrong_attempted, total_count),
  };
}

export function calcSecond({ retry_total, retry_correct, retry_wrong, retry_gave_up }, first_wrongs) {
  const safe = (n, d) => (d > 0 ? n / d : 0);
  return {
    retry_completion_rate: safe(retry_total, first_wrongs),
    understanding_rate: safe(retry_correct, first_wrongs),
    repeat_error_rate: safe(retry_wrong, first_wrongs),
    unresolved_rate: safe(retry_gave_up, first_wrongs),
  };
}

export function validate1st({ total_count, not_attempted, gave_up, wrong_attempted }) {
  const errors = [];
  const fields = { total_count, not_attempted, gave_up, wrong_attempted };
  for (const [k, v] of Object.entries(fields)) {
    if (!Number.isInteger(Number(v)) || Number(v) < 0)
      errors.push(`'${k}'은(는) 0 이상의 정수여야 합니다.`);
  }
  const sum = Number(not_attempted) + Number(gave_up) + Number(wrong_attempted);
  if (sum > Number(total_count))
    errors.push('안 푼 + 손 못 댄 + 풀고 틀린 합계가 전체 문항 수를 초과할 수 없습니다.');
  return errors;
}

export function validate2nd({ retry_total, retry_correct, retry_wrong, retry_gave_up }, first_wrongs) {
  const errors = [];
  const fields = { retry_total, retry_correct, retry_wrong, retry_gave_up };
  for (const [k, v] of Object.entries(fields)) {
    if (!Number.isInteger(Number(v)) || Number(v) < 0)
      errors.push(`'${k}'은(는) 0 이상의 정수여야 합니다.`);
  }
  if (Number(retry_total) > first_wrongs)
    errors.push('오답노트 작성 수가 1차 오답 수를 초과할 수 없습니다.');
  const retrySum = Number(retry_correct) + Number(retry_wrong) + Number(retry_gave_up);
  if (retrySum > first_wrongs)
    errors.push('재채점 합계(맞은+틀린+미해결)가 1차 오답 수를 초과할 수 없습니다.');
  return errors;
}

export function pct(rate) {
  return `${Math.round(rate * 100)}%`;
}
