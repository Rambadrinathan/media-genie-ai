-- KarmYog Gallery v2 Migration
-- Soft delete support + updated RLS policies
-- Run via Supabase SQL Editor or MCP execute_sql

-- 1. Soft delete columns for images
ALTER TABLE images ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE images ADD COLUMN IF NOT EXISTS deleted_by text DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_images_deleted ON images(deleted_at) WHERE deleted_at IS NULL;

-- 2. Soft delete + updated_at for portfolios
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Update RLS: exclude soft-deleted records from public reads
DROP POLICY IF EXISTS "Allow anon read approved images" ON images;
CREATE POLICY "Allow anon read approved images" ON images
  FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Allow anon read published portfolios" ON portfolios;
CREATE POLICY "Allow anon read published portfolios" ON portfolios
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);
