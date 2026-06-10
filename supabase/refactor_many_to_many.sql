-- 학생-반 N:M 관계 리팩토링
-- 실행 전: Supabase Dashboard > SQL Editor

-- 1. 반-학생 조인 테이블 생성
CREATE TABLE IF NOT EXISTS hw_class_students (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id   uuid NOT NULL REFERENCES hw_classes(id)  ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- 2. 기존 학생-반 관계 마이그레이션 (hw_students.class_name 기준)
INSERT INTO hw_class_students (class_id, student_id)
SELECT c.id, s.id
FROM hw_students s
JOIN hw_classes c ON c.class_name = s.class_name
WHERE s.class_name IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. hw_homework_records에 class_id 컬럼 추가
ALTER TABLE hw_homework_records
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES hw_classes(id) ON DELETE CASCADE;

-- 4. 기존 레코드에 class_id 채우기 (학생의 기존 class_name 기준)
UPDATE hw_homework_records r
SET class_id = c.id
FROM hw_students s
JOIN hw_classes c ON c.class_name = s.class_name
WHERE r.student_id = s.id
  AND s.class_name IS NOT NULL
  AND r.class_id IS NULL;

-- 5. hw_students에서 class_name 컬럼 제거
ALTER TABLE hw_students DROP COLUMN IF EXISTS class_name;
