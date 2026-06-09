-- hw_unit_presets에 subject, sort_order 컬럼 추가
ALTER TABLE hw_unit_presets ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE hw_unit_presets ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 100;

-- 기존 데이터 초기화 (시드 포함)
DELETE FROM hw_unit_presets;

-- ── 공통수학1 ─────────────────────────────────────────────────────────────────
INSERT INTO hw_unit_presets (id, subject, sort_order, unit_name, preset_type, weight_completion, weight_accuracy, weight_process) VALUES
(gen_random_uuid(), '공통수학1', 1, '다항식 (연산 / 나머지정리·인수분해)',                  'calculation_accuracy', 'mid', 'high', 'low'),
(gen_random_uuid(), '공통수학1', 2, '방정식과 부등식 — 복소수',                              'default',             'mid_high', 'mid', 'mid'),
(gen_random_uuid(), '공통수학1', 3, '방정식과 부등식 — 이차방정식',                          'calculation_accuracy', 'mid', 'high', 'low'),
(gen_random_uuid(), '공통수학1', 4, '방정식과 부등식 — 이차방정식과 이차함수',               'graph_interpretation', 'mid', 'high', 'mid'),
(gen_random_uuid(), '공통수학1', 5, '방정식과 부등식 — 여러 가지 방정식 / 연립일차부등식',  'calculation_accuracy', 'mid', 'high', 'low'),
(gen_random_uuid(), '공통수학1', 6, '방정식과 부등식 — 이차부등식',                          'graph_interpretation', 'mid', 'high', 'mid'),
(gen_random_uuid(), '공통수학1', 7, '경우의 수 (순열 / 조합)',                               'application',          'mid', 'high', 'high'),
(gen_random_uuid(), '공통수학1', 8, '행렬 (행렬의 연산)',                                    'calculation_accuracy', 'mid', 'high', 'low');

-- ── 공통수학2 ─────────────────────────────────────────────────────────────────
INSERT INTO hw_unit_presets (id, subject, sort_order, unit_name, preset_type, weight_completion, weight_accuracy, weight_process) VALUES
(gen_random_uuid(), '공통수학2', 1, '도형의 방정식 (평면좌표 / 직선 / 원 / 도형의 이동)',   'graph_interpretation', 'mid', 'high', 'mid'),
(gen_random_uuid(), '공통수학2', 2, '집합과 명제 — 집합',                                    'default',             'mid_high', 'mid', 'mid'),
(gen_random_uuid(), '공통수학2', 3, '집합과 명제 — 명제',                                    'proof_description',   'mid', 'mid', 'high'),
(gen_random_uuid(), '공통수학2', 4, '함수와 그래프 (함수 / 유리·무리함수)',                  'graph_interpretation', 'mid', 'high', 'mid');

-- ── 대수 ─────────────────────────────────────────────────────────────────────
INSERT INTO hw_unit_presets (id, subject, sort_order, unit_name, preset_type, weight_completion, weight_accuracy, weight_process) VALUES
(gen_random_uuid(), '대수', 1, '지수함수와 로그함수 — 지수와 로그',              'calculation_accuracy', 'mid', 'high', 'low'),
(gen_random_uuid(), '대수', 2, '지수함수와 로그함수 — 지수·로그함수(그래프)',    'graph_interpretation', 'mid', 'high', 'mid'),
(gen_random_uuid(), '대수', 3, '삼각함수 — 삼각함수(호도법·그래프)',             'graph_interpretation', 'mid', 'high', 'mid'),
(gen_random_uuid(), '대수', 4, '삼각함수 — 삼각함수의 활용(사인·코사인 법칙)',   'application',          'mid', 'high', 'high'),
(gen_random_uuid(), '대수', 5, '수열 — 등차·등비수열 / 수열의 합',              'calculation_accuracy', 'mid', 'high', 'low'),
(gen_random_uuid(), '대수', 6, '수열 — 수학적 귀납법',                          'proof_description',   'mid', 'mid', 'high');

-- ── 미적분I ───────────────────────────────────────────────────────────────────
INSERT INTO hw_unit_presets (id, subject, sort_order, unit_name, preset_type, weight_completion, weight_accuracy, weight_process) VALUES
(gen_random_uuid(), '미적분I', 1, '함수의 극한과 연속 (극한 / 연속)',  'default',             'mid_high', 'mid', 'mid'),
(gen_random_uuid(), '미적분I', 2, '미분 — 미분계수와 도함수',          'calculation_accuracy', 'mid', 'high', 'low'),
(gen_random_uuid(), '미적분I', 3, '미분 — 도함수의 활용',              'application',          'mid', 'high', 'high'),
(gen_random_uuid(), '미적분I', 4, '적분 — 부정적분과 정적분',          'calculation_accuracy', 'mid', 'high', 'low'),
(gen_random_uuid(), '미적분I', 5, '적분 — 정적분의 활용',              'application',          'mid', 'high', 'high');
