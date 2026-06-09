-- ============================================================
-- HomeworkManager — Supabase 초기 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- ============================================================

-- ── 테이블 생성 ──────────────────────────────────────────────

create table if not exists hw_students (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  class_name text not null
);

create table if not exists hw_unit_presets (
  id                uuid primary key default gen_random_uuid(),
  unit_name         text not null,
  preset_type       text not null,            -- proof | calculation | mixed | default
  weight_completion text not null default 'mid',  -- low | mid | high
  weight_accuracy   text not null default 'mid',
  weight_process    text not null default 'mid',
  created_at        timestamptz default now()
);

create table if not exists hw_homework_records (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid references hw_students(id) on delete cascade,
  unit_id          uuid references hw_unit_presets(id),
  round            integer not null default 1,    -- 1 | 2
  total_count      integer not null,
  not_attempted    integer not null default 0,
  gave_up          integer not null default 0,
  wrong_attempted  integer not null default 0,
  process_score    text not null,                 -- good | needs_work | poor
  retry_total      integer,
  retry_correct    integer,
  retry_wrong      integer,
  retry_gave_up    integer,
  note_quality     text,                          -- good | needs_work | poor (nullable)
  generated_comment text,
  manual_comment   text,
  clinic_flag      boolean default false,
  created_at       timestamptz default now()
);

create table if not exists hw_sentence_blocks (
  id             text primary key default gen_random_uuid()::text,
  part           text not null,           -- A | B | C
  condition_key  text not null,
  sentence_text  text not null,
  is_active      boolean default true,
  updated_at     timestamptz default now()
);

-- ── RLS 비활성화 (내부 학원 도구 — 필요 시 정책 추가) ─────────

alter table hw_students         disable row level security;
alter table hw_unit_presets     disable row level security;
alter table hw_homework_records disable row level security;
alter table hw_sentence_blocks  disable row level security;

-- ── 기본 단원 프리셋 시드 ──────────────────────────────────────

insert into hw_unit_presets (unit_name, preset_type, weight_completion, weight_accuracy, weight_process)
select * from (values
  ('증명형 단원 (기본)', 'proof',       'mid', 'mid',  'high'),
  ('계산형 단원 (기본)', 'calculation', 'mid', 'high', 'low'),
  ('혼합형 단원 (기본)', 'mixed',       'mid', 'mid',  'mid'),
  ('기본 단원',          'default',     'mid', 'mid',  'mid')
) as v(unit_name, preset_type, weight_completion, weight_accuracy, weight_process)
where not exists (select 1 from hw_unit_presets limit 1);

-- ── 기본 문장 풀 시드 ─────────────────────────────────────────

insert into hw_sentence_blocks (id, part, condition_key, sentence_text, is_active) values
  ('a1', 'A', 'completion_high',    '이번 과제를 성실하게 완수하였습니다.',                                        true),
  ('a2', 'A', 'completion_mid',     '대부분의 문제를 시도하였으나 일부 미완성 문항이 있습니다.',                   true),
  ('a3', 'A', 'completion_low',     '전반적인 과제 이행률이 낮아 성실도 점검이 필요합니다.',                       true),
  ('a0', 'A', 'default',            '과제를 제출하였습니다.',                                                      true),
  ('b1', 'B', 'calculation_wrong',  '계산 과정에서 반복적인 실수가 나타나고 있어 검산 습관 형성이 필요합니다.',    true),
  ('b2', 'B', 'gaveup_high',        '개념 이해 자체에 어려움이 있는 문항이 다수 확인됩니다. 클리닉이 권장됩니다.', true),
  ('b3', 'B', 'not_attempted_high', '시도조차 하지 않은 문항이 많아 과제 태도 점검이 필요합니다.',                 true),
  ('b4', 'B', 'proof_poor_process', '풀이 과정 서술이 미흡하여 논리적 흐름을 확인하기 어렵습니다.',               true),
  ('b0', 'B', 'default',            '특이 오답 패턴 없이 안정적으로 해결하였습니다.',                             true),
  ('c1', 'C', 'understanding_high', '오답노트를 통해 대부분의 오류를 스스로 교정하였습니다.',                     true),
  ('c2', 'C', 'understanding_mid',  '오답 일부를 해결하였으나 반복 오류 문항에 대한 추가 확인이 필요합니다.',     true),
  ('c3', 'C', 'understanding_low',  '오답노트 후에도 해결되지 않은 문항이 많아 개별 클리닉을 권장합니다.',       true),
  ('c0', 'C', 'default',            '오답노트를 확인하였습니다.',                                                  true)
on conflict (id) do nothing;

-- ── 테스트 학생 시드 (필요 없으면 아래 블록 삭제) ─────────────

insert into hw_students (name, class_name)
select * from (values
  ('김민준', '중2-A반'), ('이서연', '중2-A반'), ('박지우', '중2-A반'),
  ('최아린', '중2-A반'), ('정하은', '중2-A반'), ('강도현', '중2-A반'),
  ('윤서준', '중3-B반'), ('임수아', '중3-B반'), ('한지호', '중3-B반'), ('송민서', '중3-B반')
) as v(name, class_name)
where not exists (select 1 from hw_students limit 1);
