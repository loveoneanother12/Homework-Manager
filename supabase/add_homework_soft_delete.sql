-- 숙제도 휴지통(soft delete) 대상에 포함 — 기록이 있어도 통째로 휴지통 이동
ALTER TABLE hw_homeworks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
