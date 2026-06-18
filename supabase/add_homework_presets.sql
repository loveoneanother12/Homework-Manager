-- 반별 숙제 프리셋 테이블
-- HomeworkList 진입 시 숙제가 없는 날에 자동으로 숙제 카드를 생성하기 위한 프리셋

CREATE TABLE IF NOT EXISTS hw_homework_presets (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id   uuid NOT NULL REFERENCES hw_classes(id) ON DELETE CASCADE,
  title      text NOT NULL,
  period     integer CHECK (period IN (1, 2)),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
