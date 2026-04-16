import sharp from 'sharp'
import { type SupabaseClient } from '@supabase/supabase-js'

export async function generateAndUploadThumbnails(
  imageBuffer: Buffer,
  imageId: string,
  supabase: SupabaseClient
): Promise<{ thumbnail_url: string; cdn_url: string }> {
  const thumb400 = await sharp(imageBuffer)
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()

  const thumb800 = await sharp(imageBuffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()

  await supabase.storage
    .from('thumbnails')
    .upload(`${imageId}/400.jpg`, thumb400, { contentType: 'image/jpeg', upsert: true })

  await supabase.storage
    .from('thumbnails')
    .upload(`${imageId}/800.jpg`, thumb800, { contentType: 'image/jpeg', upsert: true })

  const { data: url400 } = supabase.storage.from('thumbnails').getPublicUrl(`${imageId}/400.jpg`)
  const { data: url800 } = supabase.storage.from('thumbnails').getPublicUrl(`${imageId}/800.jpg`)

  return {
    thumbnail_url: url400.publicUrl,
    cdn_url: url800.publicUrl,
  }
}

export async function getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imageBuffer).metadata()
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  }
}
