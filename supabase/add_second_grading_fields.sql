-- 2차 채점 시점 분리를 위한 컬럼 추가
ALTER TABLE hw_homework_records
  ADD COLUMN IF NOT EXISTS second_session_date date,   -- 2차 채점을 한 날짜
  ADD COLUMN IF NOT EXISTS generated_comment_2 text,   -- Part C 전용 자동 코멘트
  ADD COLUMN IF NOT EXISTS manual_comment_2    text;   -- Part C 수동 편집본
