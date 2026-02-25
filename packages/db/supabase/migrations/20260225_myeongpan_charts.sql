-- myeongpan 2단계: 차트 + 해석 테이블
-- 사주/자미두수/서양점성술 3체계 통합 계산 결과 및 LLM 해석 저장

-- ============================================================
-- myeongpan_charts: 차트 계산 결과 저장
-- ============================================================

CREATE TABLE IF NOT EXISTS myeongpan_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_profile JSONB NOT NULL,
  chart JSONB NOT NULL,
  config_hash TEXT NOT NULL,
  place_name TEXT,
  gender TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- myeongpan_interpretations: LLM 해석 결과 저장
-- ============================================================

CREATE TABLE IF NOT EXISTS myeongpan_interpretations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES myeongpan_charts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interpretation JSONB NOT NULL,
  options JSONB NOT NULL,
  model TEXT NOT NULL,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS 정책 (본인만 접근)
-- ============================================================

ALTER TABLE myeongpan_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE myeongpan_interpretations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_charts" ON myeongpan_charts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_interpretations" ON myeongpan_interpretations
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 인덱스
-- ============================================================

CREATE INDEX idx_myeongpan_charts_user ON myeongpan_charts(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_myeongpan_charts_hash ON myeongpan_charts(user_id, config_hash);
CREATE INDEX idx_myeongpan_interps_chart ON myeongpan_interpretations(chart_id);

-- ============================================================
-- updated_at 트리거
-- ============================================================

CREATE TRIGGER update_myeongpan_charts_updated_at
  BEFORE UPDATE ON myeongpan_charts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
