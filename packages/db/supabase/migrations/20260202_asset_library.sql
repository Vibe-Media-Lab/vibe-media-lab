-- Asset Library 기능을 위한 media_generations 테이블 확장
-- 파일 메타데이터 및 즐겨찾기 기능 추가

-- media_generations 테이블에 새 컬럼 추가
ALTER TABLE media_generations ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE media_generations ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE media_generations ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE media_generations ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;
ALTER TABLE media_generations ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE media_generations ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- 성능 최적화를 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_media_gen_user_created
  ON media_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_gen_media_type
  ON media_generations(media_type);
CREATE INDEX IF NOT EXISTS idx_media_gen_is_favorite
  ON media_generations(user_id, is_favorite) WHERE is_favorite = true;

-- 삭제 정책 추가 (유저는 자신의 generation 삭제 가능)
-- DROP 먼저 시도 후 CREATE (멱등성 보장)
DROP POLICY IF EXISTS "Users can delete own generations" ON public.media_generations;
CREATE POLICY "Users can delete own generations" ON public.media_generations
  FOR DELETE USING (auth.uid() = user_id);
