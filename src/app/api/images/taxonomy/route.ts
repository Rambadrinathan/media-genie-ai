import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sanitizeLabel, LIMITS } from '@/lib/validation'

// GET — returns all unique folders, scenes, tags (optionally with counts).
// Query params:
//   ?approvedOnly=true — restricts to approved, non-deleted images
//   ?counts=true       — returns counts per folder/scene (non-deleted images)
export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const approvedOnly = searchParams.get('approvedOnly') === 'true'
  const withCounts = searchParams.get('counts') === 'true'

  let q = supabase
    .from('images')
    .select('classified_folder, scene, tags')
    .is('deleted_at', null)

  if (approvedOnly) {
    q = q.eq('status', 'approved')
  }

  const { data, error } = await q

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const folderScenes: Record<string, Set<string>> = {}
  const folderCounts: Record<string, number> = {}
  const sceneCounts: Record<string, number> = {}
  const allFolders = new Set<string>()
  const allScenes = new Set<string>()
  const allTags = new Set<string>()

  for (const row of data || []) {
    if (row.classified_folder) {
      allFolders.add(row.classified_folder)
      folderCounts[row.classified_folder] = (folderCounts[row.classified_folder] || 0) + 1
      if (!folderScenes[row.classified_folder]) {
        folderScenes[row.classified_folder] = new Set()
      }
      if (row.scene) {
        folderScenes[row.classified_folder].add(row.scene)
      }
    }
    if (row.scene) {
      allScenes.add(row.scene)
      sceneCounts[row.scene] = (sceneCounts[row.scene] || 0) + 1
    }
    ;(row.tags || []).forEach((t: string) => allTags.add(t))
  }

  const taxonomy: Record<string, string[]> = {}
  for (const [folder, scenes] of Object.entries(folderScenes)) {
    taxonomy[folder] = [...scenes].sort()
  }

  return NextResponse.json({
    folders: [...allFolders].sort(),
    scenes: [...allScenes].sort(),
    tags: [...allTags].sort(),
    taxonomy,
    ...(withCounts ? { folderCounts, sceneCounts } : {}),
  })
}

// PATCH — rename a folder or scene across all non-deleted images.
// Body: { type: 'folder'|'scene', oldName, newName }
export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient()
  const { type, oldName, newName } = await request.json()

  if (type !== 'folder' && type !== 'scene') {
    return NextResponse.json({ error: 'type must be folder or scene' }, { status: 400 })
  }
  if (!oldName || !newName) {
    return NextResponse.json({ error: 'oldName and newName required' }, { status: 400 })
  }

  const column = type === 'folder' ? 'classified_folder' : 'scene'
  const limit = type === 'folder' ? LIMITS.folder : LIMITS.scene
  const sanitized = sanitizeLabel(newName, limit)

  if (!sanitized) {
    return NextResponse.json({ error: 'New name is empty after sanitization' }, { status: 400 })
  }
  if (sanitized === oldName) {
    return NextResponse.json({ renamed: 0, note: 'same name' })
  }

  const { data, error } = await supabase
    .from('images')
    .update({ [column]: sanitized })
    .eq(column, oldName)
    .is('deleted_at', null)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ renamed: data?.length || 0, newName: sanitized })
}

// DELETE — remove a folder or scene label from all non-deleted images (sets column to null).
// Body: { type: 'folder'|'scene', name }
export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient()
  const { type, name } = await request.json()

  if (type !== 'folder' && type !== 'scene') {
    return NextResponse.json({ error: 'type must be folder or scene' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const column = type === 'folder' ? 'classified_folder' : 'scene'

  const { data, error } = await supabase
    .from('images')
    .update({ [column]: null })
    .eq(column, name)
    .is('deleted_at', null)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cleared: data?.length || 0 })
}
