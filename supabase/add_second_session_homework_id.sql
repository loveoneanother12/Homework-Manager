-- 2차 채점을 기록한 시점의 현재 숙제 ID 저장 (숙제별 평가서 구분용)
ALTER TABLE hw_homework_records
  ADD COLUMN IF NOT EXISTS second_session_homework_id uuid REFERENCES hw_homeworks(id) ON DELETE SET NULL;
