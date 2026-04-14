import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status') || 'all'
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
  const minQuality = Number(searchParams.get('minQuality') || 0)
  const limit = Number(searchParams.get('limit') || 100)

  let query = supabase
    .from('images')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(limit)

  if (status !== 'all') {
    query = query.eq('status', status)
  }
  if (minQuality > 0) {
    query = query.gte('quality_score', minQuality)
  }
  if (tags.length > 0) {
    query = query.overlaps('tags', tags)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PATCH — approve images (status → approved)
export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()
  const { ids, status, reviewed_by } = body

  if (!ids || !Array.isArray(ids) || !status) {
    return NextResponse.json({ error: 'ids and status required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('images')
    .update({
      status,
      reviewed_by: reviewed_by || 'curator',
      reviewed_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ updated: ids.length })
}

// DELETE — reject images: remove from Supabase DB + Storage
// Google Drive files stay untouched (GDrive = permanent archive)
export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()
  const { ids } = body

  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  // 1. Fetch image IDs for thumbnail cleanup
  const { data: images, error: fetchError } = await supabase
    .from('images')
    .select('id')
    .in('id', ids)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // 2. Delete thumbnails from Supabase Storage
  const filesToRemove: string[] = []
  for (const img of images || []) {
    filesToRemove.push(`${img.id}/400.jpg`, `${img.id}/800.jpg`)
  }
  if (filesToRemove.length > 0) {
    await supabase.storage.from('thumbnails').remove(filesToRemove)
  }

  // 3. Delete rows from Supabase DB
  const { error: deleteError } = await supabase
    .from('images')
    .delete()
    .in('id', ids)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: ids.length })
}
