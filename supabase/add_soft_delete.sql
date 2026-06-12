-- 휴지통(soft delete) 지원: 삭제 시 행을 지우지 않고 deleted_at만 기록
ALTER TABLE hw_classes          ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE hw_students         ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE hw_homework_records ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
