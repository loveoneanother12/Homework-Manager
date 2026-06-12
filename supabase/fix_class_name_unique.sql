-- 휴지통(soft delete)에 있는 반과 같은 이름으로 새 반을 만들 수 있도록,
-- class_name 유니크 제약을 '살아있는 반'에만 적용되는 부분 인덱스로 교체

-- 1) hw_classes의 기존 유니크 제약 제거 (이름과 무관하게 모두)
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'hw_classes'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE hw_classes DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- 2) 살아있는 반끼리만 이름 중복 금지
CREATE UNIQUE INDEX IF NOT EXISTS hw_classes_class_name_live_key
  ON hw_classes (class_name) WHERE deleted_at IS NULL;
