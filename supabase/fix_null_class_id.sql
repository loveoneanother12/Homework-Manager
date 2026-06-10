-- class_id가 NULL인 레코드를 복구
-- 학생이 정확히 1개의 반에만 속한 경우 자동 설정
UPDATE hw_homework_records r
SET class_id = cs.class_id
FROM hw_class_students cs
WHERE r.student_id = cs.student_id
  AND r.class_id IS NULL
  AND (
    SELECT COUNT(*) FROM hw_class_students cs2
    WHERE cs2.student_id = cs.student_id
  ) = 1;
