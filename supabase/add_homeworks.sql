-- 반+날짜별 숙제(과제) 단위 — 한 날짜에 여러 숙제를 따로 채점
CREATE TABLE IF NOT EXISTS hw_homeworks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES hw_classes(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  title        text NOT NULL DEFAULT '숙제 1',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hw_homework_records
  ADD COLUMN IF NOT EXISTS homework_id uuid REFERENCES hw_homeworks(id) ON DELETE SET NULL;

-- 기존 기록 백필: (반, 날짜) 조합마다 '숙제 1' 카드를 만들고 기록을 연결
INSERT INTO hw_homeworks (class_id, session_date, title)
SELECT DISTINCT r.class_id, r.session_date, '숙제 1'
FROM hw_homework_records r
WHERE r.class_id IS NOT NULL
  AND r.homework_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hw_homeworks h
    WHERE h.class_id = r.class_id AND h.session_date = r.session_date
  );

UPDATE hw_homework_records r
SET homework_id = h.id
FROM hw_homeworks h
WHERE r.homework_id IS NULL
  AND r.class_id = h.class_id
  AND r.session_date = h.session_date;
