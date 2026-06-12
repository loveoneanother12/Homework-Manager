-- 수업일별 반 상태: 숙제 없음 플래그
CREATE TABLE IF NOT EXISTS hw_class_sessions (
  class_id     uuid NOT NULL REFERENCES hw_classes(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  no_homework  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (class_id, session_date)
);

-- 수업일별 학생 결석
CREATE TABLE IF NOT EXISTS hw_absences (
  class_id     uuid NOT NULL REFERENCES hw_classes(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES hw_students(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  PRIMARY KEY (class_id, student_id, session_date)
);
