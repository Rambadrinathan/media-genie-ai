-- KarmYog Gallery - Database Schema
-- Run this in Supabase SQL Editor after creating the project

-- Images table
CREATE TABLE images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id text UNIQUE,
  filename text NOT NULL,
  filepath text,
  uploader text,
  uploaded_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  -- metadata
  width int,
  height int,
  mime text,
  exif jsonb,
  file_size bigint,
  -- AI outputs
  quality_score float,
  tags text[] DEFAULT '{}',
  scene text,
  dominant_colors text[] DEFAULT '{}',
  orientation text,
  ai_caption text,
  -- agent-assigned
  classified_folder text,
  -- workflow
  status text DEFAULT 'staged' CHECK (status IN ('staged', 'pending_approval', 'approved', 'rejected', 'archived')),
  reviewed_by text,
  reviewed_at timestamptz,
  -- storage
  thumbnail_url text,
  cdn_url text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast filtering
CREATE INDEX idx_images_status ON images(status);
CREATE INDEX idx_images_tags ON images USING GIN(tags);
CREATE INDEX idx_images_quality ON images(quality_score);
CREATE INDEX idx_images_uploaded ON images(uploaded_at DESC);
CREATE INDEX idx_images_folder ON images(classified_folder);

-- Portfolios table
CREATE TABLE portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  template text,
  prompt text,
  image_ids uuid[] DEFAULT '{}',
  image_order int[] DEFAULT '{}',
  captions jsonb DEFAULT '{}',
  cover_image_id uuid REFERENCES images(id),
  created_by text,
  published_url text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_portfolios_status ON portfolios(status);

-- Audit log
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- For now, allow all access via service role (will tighten with auth later)
CREATE POLICY "Allow all for service role" ON images FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON portfolios FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON audit_log FOR ALL USING (true);

-- Allow anon read for public galleries
CREATE POLICY "Allow anon read approved images" ON images FOR SELECT USING (status = 'approved');
CREATE POLICY "Allow anon read published portfolios" ON portfolios FOR SELECT USING (status = 'published');

-- Storage bucket (run this separately or via dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);
