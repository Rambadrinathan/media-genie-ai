import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Returns all unique folders, scenes, and their co-occurrence (which scenes appear under which folders)
export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('images')
    .select('classified_folder, scene')
    .not('classified_folder', 'is', null)
    .not('scene', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build taxonomy: folder → [scenes]
  const folderScenes: Record<string, Set<string>> = {}
  const allFolders = new Set<string>()
  const allScenes = new Set<string>()

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
  }

  // Convert sets to arrays
  const taxonomy: Record<string, string[]> = {}
  for (const [folder, scenes] of Object.entries(folderScenes)) {
    taxonomy[folder] = [...scenes].sort()
  }

  return NextResponse.json({
    folders: [...allFolders].sort(),
    scenes: [...allScenes].sort(),
    taxonomy, // folder → scenes mapping
  })
}
