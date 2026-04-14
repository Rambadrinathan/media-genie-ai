export interface ImageAnalysis {
  tags: string[]
  scene: string
  quality_score: number
  quality_flags: string[]
  caption: string
  dominant_colors: string[]
  orientation: 'landscape' | 'portrait' | 'square'
  suggested_folder: string
  is_duplicate_likely: boolean
}

export interface ImageRecord {
  id: string
  drive_file_id: string | null
  filename: string
  filepath: string
  uploader: string | null
  uploaded_at: string
  processed_at: string | null
  width: number | null
  height: number | null
  mime: string | null
  exif: Record<string, unknown> | null
  file_size: number | null
  quality_score: number | null
  tags: string[]
  scene: string | null
  dominant_colors: string[]
  orientation: string | null
  ai_caption: string | null
  classified_folder: string | null
  status: 'staged' | 'pending_approval' | 'approved' | 'rejected' | 'archived'
  reviewed_by: string | null
  reviewed_at: string | null
  thumbnail_url: string | null
  cdn_url: string | null
  created_at: string
}

export interface Portfolio {
  id: string
  title: string
  template: string | null
  prompt: string | null
  image_ids: string[]
  image_order: number[]
  captions: Record<string, string> | null
  cover_image_id: string | null
  created_by: string | null
  published_url: string | null
  status: 'draft' | 'published' | 'archived'
  created_at: string
}
