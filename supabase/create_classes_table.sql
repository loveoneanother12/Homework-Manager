-- hw_classes 테이블 생성
CREATE TABLE IF NOT EXISTS hw_classes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name  text NOT NULL UNIQUE,
  days_of_week text,   -- 콤마 구분: "월,수,금"
  instructor  text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE hw_classes DISABLE ROW LEVEL SECURITY;

-- 기존 학생 데이터에서 반 이름 추출하여 hw_classes에 삽입
INSERT INTO hw_classes (class_name)
SELECT DISTINCT class_name FROM hw_students WHERE class_name IS NOT NULL
ON CONFLICT (class_name) DO NOTHING;
