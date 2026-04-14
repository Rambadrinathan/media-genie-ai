/**
 * Autonomous Image Processing Pipeline
 *
 * Watches the Google Drive _inbox folder, processes new images:
 * 1. Extract EXIF/metadata
 * 2. Classify via Claude Vision API
 * 3. Move to classified folder in Google Drive
 * 4. Generate thumbnails
 * 5. Upload thumbnails to Supabase Storage
 * 6. Store record in Supabase DB
 * 7. Send Telegram notification (lightweight, text only)
 *
 * Usage: npx tsx scripts/process-inbox.ts
 * Or with watch mode: npx tsx scripts/process-inbox.ts --watch
 */

import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'
import exifr from 'exifr'
import { createClient } from '@supabase/supabase-js'
import { classifyImage } from '../src/lib/classify'

// Load env from .env.local (Next.js convention)
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const INBOX_PATH = process.env.GDRIVE_INBOX_PATH || 'E:/RamKarmYogGooglDrivee/My Drive/KarmYog Images/_inbox'
const BASE_PATH = process.env.GDRIVE_BASE_PATH || 'E:/RamKarmYogGooglDrivee/My Drive/KarmYog Images'
const REJECTED_PATH = path.join(BASE_PATH, '_rejected')

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'])

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`📁 Created folder: ${path.basename(dirPath)}/`)
  }
}

async function extractMetadata(filePath: string) {
  const stats = fs.statSync(filePath)
  const metadata = await sharp(filePath).metadata()

  let exif = null
  try {
    exif = await exifr.parse(filePath)
  } catch {
    // No EXIF data available
  }

  return {
    width: metadata.width || null,
    height: metadata.height || null,
    mime: `image/${metadata.format}` || null,
    file_size: stats.size,
    exif: exif ? JSON.parse(JSON.stringify(exif)) : null,
    uploaded_at: stats.birthtime.toISOString(),
  }
}

async function generateThumbnails(filePath: string, imageId: string) {
  const thumbDir = path.join(BASE_PATH, '_thumbnails')
  await ensureDir(thumbDir)

  const thumb400Path = path.join(thumbDir, `${imageId}_400.jpg`)
  const thumb800Path = path.join(thumbDir, `${imageId}_800.jpg`)

  await sharp(filePath)
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumb400Path)

  await sharp(filePath)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(thumb800Path)

  // Upload to Supabase Storage
  const thumb400Buffer = fs.readFileSync(thumb400Path)
  const thumb800Buffer = fs.readFileSync(thumb800Path)

  await supabase.storage
    .from('thumbnails')
    .upload(`${imageId}/400.jpg`, thumb400Buffer, { contentType: 'image/jpeg', upsert: true })

  await supabase.storage
    .from('thumbnails')
    .upload(`${imageId}/800.jpg`, thumb800Buffer, { contentType: 'image/jpeg', upsert: true })

  const { data: urlData400 } = supabase.storage
    .from('thumbnails')
    .getPublicUrl(`${imageId}/400.jpg`)

  const { data: urlData800 } = supabase.storage
    .from('thumbnails')
    .getPublicUrl(`${imageId}/800.jpg`)

  // Clean up local thumbnails
  fs.unlinkSync(thumb400Path)
  fs.unlinkSync(thumb800Path)

  return {
    thumbnail_url: urlData400.publicUrl,
    cdn_url: urlData800.publicUrl,
  }
}

async function moveToClassifiedFolder(filePath: string, folderName: string): Promise<string> {
  const targetDir = path.join(BASE_PATH, folderName)
  await ensureDir(targetDir)

  const filename = path.basename(filePath)
  let targetPath = path.join(targetDir, filename)

  // Handle filename collision
  if (fs.existsSync(targetPath)) {
    const ext = path.extname(filename)
    const base = path.basename(filename, ext)
    const timestamp = Date.now()
    targetPath = path.join(targetDir, `${base}_${timestamp}${ext}`)
  }

  fs.renameSync(filePath, targetPath)
  console.log(`  📂 Moved to ${folderName}/${path.basename(targetPath)}`)

  return targetPath
}

async function sendTelegramNotification(summary: { total: number; approved: number; flagged: number; folders: string[] }) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) return

  const message = [
    `📸 ${summary.total} new image${summary.total > 1 ? 's' : ''} processed`,
    `✅ ${summary.approved} high quality | ⚠️ ${summary.flagged} flagged`,
    `📁 Sorted into: ${summary.folders.join(', ')}`,
    ``,
    `👉 Review: ${process.env.NEXT_PUBLIC_APP_URL || 'https://karmyog-gallery.vercel.app'}/review`,
  ].join('\n')

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    })
  } catch (err) {
    console.error('Telegram notification failed:', err)
  }
}

async function processImage(filePath: string): Promise<{ folder: string; flagged: boolean } | null> {
  const filename = path.basename(filePath)
  console.log(`\n🔍 Processing: ${filename}`)

  try {
    // 1. Extract metadata
    console.log('  📊 Extracting metadata...')
    const meta = await extractMetadata(filePath)

    // 2. Classify with Claude Vision
    console.log('  🤖 Classifying with AI...')
    const analysis = await classifyImage(filePath)
    console.log(`  🏷️  Tags: ${analysis.tags.join(', ')}`)
    console.log(`  ⭐ Quality: ${analysis.quality_score}/10`)
    console.log(`  📝 "${analysis.caption}"`)
    console.log(`  📁 → ${analysis.suggested_folder}/`)

    // 3. Move to classified folder
    const newPath = await moveToClassifiedFolder(filePath, analysis.suggested_folder)

    // 4. Generate a unique ID
    const imageId = crypto.randomUUID()

    // 5. Generate thumbnails and upload to Supabase Storage
    console.log('  🖼️  Generating thumbnails...')
    const thumbnails = await generateThumbnails(newPath, imageId)

    // 6. Store in Supabase DB
    console.log('  💾 Storing in database...')
    const { error } = await supabase.from('images').insert({
      id: imageId,
      filename,
      filepath: newPath.replace(/\\/g, '/'),
      uploaded_at: meta.uploaded_at,
      processed_at: new Date().toISOString(),
      width: meta.width,
      height: meta.height,
      mime: meta.mime,
      exif: meta.exif,
      file_size: meta.file_size,
      quality_score: analysis.quality_score,
      tags: analysis.tags,
      scene: analysis.scene,
      dominant_colors: analysis.dominant_colors,
      orientation: analysis.orientation,
      ai_caption: analysis.caption,
      classified_folder: analysis.suggested_folder,
      status: 'pending_approval',
      thumbnail_url: thumbnails.thumbnail_url,
      cdn_url: thumbnails.cdn_url,
    })

    if (error) {
      console.error('  ❌ DB error:', error.message)
      return null
    }

    const flagged = analysis.quality_score < 5 || analysis.quality_flags.length > 0
    if (flagged) {
      console.log(`  ⚠️  Flagged: ${analysis.quality_flags.join(', ') || 'low quality score'}`)
    } else {
      console.log('  ✅ Processed successfully')
    }

    return { folder: analysis.suggested_folder, flagged }
  } catch (err) {
    console.error(`  ❌ Error processing ${filename}:`, err)
    return null
  }
}

async function scanInbox() {
  await ensureDir(INBOX_PATH)
  await ensureDir(REJECTED_PATH)

  const files = fs.readdirSync(INBOX_PATH)
  const imageFiles = files.filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))

  if (imageFiles.length === 0) {
    console.log('📭 Inbox empty — nothing to process')
    return
  }

  console.log(`\n📬 Found ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} in inbox`)

  const results: { folder: string; flagged: boolean }[] = []

  for (const file of imageFiles) {
    const filePath = path.join(INBOX_PATH, file)
    const result = await processImage(filePath)
    if (result) results.push(result)
  }

  // Summary
  const folders = [...new Set(results.map(r => r.folder))]
  const flagged = results.filter(r => r.flagged).length
  const approved = results.length - flagged

  console.log(`\n📊 Summary: ${results.length} processed | ✅ ${approved} good | ⚠️ ${flagged} flagged`)
  console.log(`📁 Folders: ${folders.join(', ')}`)

  // Send Telegram notification
  if (results.length > 0) {
    await sendTelegramNotification({
      total: results.length,
      approved,
      flagged,
      folders,
    })
  }
}

async function watchMode() {
  console.log('👁️  Watch mode — monitoring inbox for new images...')
  console.log(`📂 Watching: ${INBOX_PATH}`)

  const chokidar = await import('chokidar')

  // Process existing files first
  await scanInbox()

  // Watch for new files
  const watcher = chokidar.watch(INBOX_PATH, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000, // wait 2s after last write
      pollInterval: 500,
    },
  })

  watcher.on('add', async (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase()
    if (!IMAGE_EXTENSIONS.has(ext)) return

    console.log(`\n📥 New image detected: ${path.basename(filePath)}`)
    const result = await processImage(filePath)

    if (result) {
      await sendTelegramNotification({
        total: 1,
        approved: result.flagged ? 0 : 1,
        flagged: result.flagged ? 1 : 0,
        folders: [result.folder],
      })
    }
  })

  console.log('\n⏳ Waiting for new images... (Ctrl+C to stop)')
}

// Main
const isWatch = process.argv.includes('--watch')
if (isWatch) {
  watchMode()
} else {
  scanInbox().then(() => {
    console.log('\n✅ Done.')
    process.exit(0)
  })
}
