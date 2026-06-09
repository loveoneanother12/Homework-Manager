-- hw_homework_records에 session_date 컬럼 추가
ALTER TABLE hw_homework_records
  ADD COLUMN IF NOT EXISTS session_date date;

-- 기존 레코드: created_at 날짜로 채움 (한국 시간 기준)
UPDATE hw_homework_records
  SET session_date = (created_at AT TIME ZONE 'Asia/Seoul')::date
  WHERE session_date IS NULL;

-- 이후 기본값 설정 (앱에서 항상 명시적으로 넘기므로 fallback용)
ALTER TABLE hw_homework_records
  ALTER COLUMN session_date SET DEFAULT CURRENT_DATE;
