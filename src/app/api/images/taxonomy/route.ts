import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Returns all unique folders, scenes, tags, and their co-occurrence.
// Query params: ?approvedOnly=true — restricts to approved, non-deleted images
export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const approvedOnly = searchParams.get('approvedOnly') === 'true'

  let q = supabase
    .from('images')
    .select('classified_folder, scene, tags')
    .not('classified_folder', 'is', null)
    .not('scene', 'is', null)

  if (approvedOnly) {
    q = q.eq('status', 'approved').is('deleted_at', null)
  }

  const { data, error } = await q

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build taxonomy: folder → [scenes]
  const folderScenes: Record<string, Set<string>> = {}
  const allFolders = new Set<string>()
  const allScenes = new Set<string>()
  const allTags = new Set<string>()

  for (const row of data || []) {
    if (row.classified_folder) {
      allFolders.add(row.classified_folder)
      if (!folderScenes[row.classified_folder]) {
        folderScenes[row.classified_folder] = new Set()
      }
      if (row.scene) {
        folderScenes[row.classified_folder].add(row.scene)
      }
    }
    if (row.scene) {
      allScenes.add(row.scene)
    }
    ;(row.tags || []).forEach((t: string) => allTags.add(t))
  }

  // Convert sets to arrays
  const taxonomy: Record<string, string[]> = {}
  for (const [folder, scenes] of Object.entries(folderScenes)) {
    taxonomy[folder] = [...scenes].sort()
  }

  return NextResponse.json({
    folders: [...allFolders].sort(),
    scenes: [...allScenes].sort(),
    tags: [...allTags].sort(),
    taxonomy, // folder → scenes mapping
  })
}
