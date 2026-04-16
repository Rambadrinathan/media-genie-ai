import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase'
import { classifyImageBuffer } from '@/lib/classify'
import { generateAndUploadThumbnails, getImageDimensions } from '@/lib/thumbnails'
import { logAudit } from '@/lib/audit'

// Allow large uploads (20MB per request)
export const runtime = 'nodejs'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const results: Array<{
      filename: string
      status: 'success' | 'error'
      id?: string
      quality_score?: number
      tags?: string[]
      caption?: string
      error?: string
    }> = []

    for (const file of files) {
      const filename = file.name

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        results.push({ filename, status: 'error', error: `Unsupported type: ${file.type}` })
        continue
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        results.push({ filename, status: 'error', error: `Too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 20MB)` })
        continue
      }

      try {
        const arrayBuffer = await file.arrayBuffer()
        const originalBuffer = Buffer.from(arrayBuffer)

        // Get original dimensions
        const { width, height } = await getImageDimensions(originalBuffer)

        // Resize for AI classification (1500px max — Claude doesn't need full resolution)
        const classifyBuffer = await sharp(originalBuffer)
          .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer()

        // Determine media type for Claude
        const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

        // Generate unique ID
        const imageId = crypto.randomUUID()

        // Run classification and thumbnail generation in parallel
        const [analysis, thumbnails] = await Promise.all([
          classifyImageBuffer(classifyBuffer, mediaType),
          generateAndUploadThumbnails(originalBuffer, imageId, supabase),
        ])

        // Determine orientation
        const orientation = width > height ? 'landscape' : width < height ? 'portrait' : 'square'

        // Store in database
        const { error: dbError } = await supabase.from('images').insert({
          id: imageId,
          filename,
          filepath: `upload/${filename}`,
          uploaded_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          width,
          height,
          mime: file.type,
          file_size: file.size,
          quality_score: analysis.quality_score,
          tags: analysis.tags,
          scene: analysis.scene,
          dominant_colors: analysis.dominant_colors,
          orientation,
          ai_caption: analysis.caption,
          classified_folder: analysis.suggested_folder,
          status: 'pending_approval',
          thumbnail_url: thumbnails.thumbnail_url,
          cdn_url: thumbnails.cdn_url,
        })

        if (dbError) {
          results.push({ filename, status: 'error', error: dbError.message })
          continue
        }

        await logAudit('upload', 'image', imageId, { filename })

        results.push({
          filename,
          status: 'success',
          id: imageId,
          quality_score: analysis.quality_score,
          tags: analysis.tags,
          caption: analysis.caption,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Processing failed'
        results.push({ filename, status: 'error', error: message })
      }
    }

    const succeeded = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      total: files.length,
      succeeded,
      failed,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
