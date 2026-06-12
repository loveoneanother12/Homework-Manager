-- 숙제에 교시 정보 추가 (1교시/2교시)
ALTER TABLE hw_homeworks ADD COLUMN IF NOT EXISTS period int;
