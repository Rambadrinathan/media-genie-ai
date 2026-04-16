import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status') || 'all'
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
  const minQuality = Number(searchParams.get('minQuality') || 0)
  const limit = Number(searchParams.get('limit') || 100)
  const includeDeleted = searchParams.get('deleted') === 'true'

  let query = supabase
    .from('images')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(limit)

  if (includeDeleted) {
    query = query.not('deleted_at', 'is', null)
  } else {
    query = query.is('deleted_at', null)
    if (status !== 'all') {
      query = query.eq('status', status)
    }
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

// PATCH — approve images or restore deleted images
export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()
  const { ids, status, reviewed_by, action } = body

  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  // Update details action — edit metadata for a single image
  if (action === 'update_details') {
    const { id, details } = body
    if (!id || !details) {
      return NextResponse.json({ error: 'id and details required' }, { status: 400 })
    }

    const allowedFields = ['ai_caption', 'tags', 'quality_score', 'scene', 'classified_folder']
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (details[field] !== undefined) {
        updates[field] = details[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { error } = await supabase
      .from('images')
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit('edit_details', 'image', [id], { fields: Object.keys(updates) })
    return NextResponse.json({ updated: true })
  }

  // Restore action — undo soft delete
  if (action === 'restore') {
    const { error } = await supabase
      .from('images')
      .update({
        deleted_at: null,
        deleted_by: null,
        status: 'pending_approval',
      })
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit('restore', 'image', ids, { reviewed_by: reviewed_by || 'admin' })
    return NextResponse.json({ restored: ids.length })
  }

  // Normal status update (approve etc.)
  if (!status) {
    return NextResponse.json({ error: 'status required' }, { status: 400 })
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

  await logAudit('approve', 'image', ids, { reviewed_by: reviewed_by || 'curator' })
  return NextResponse.json({ updated: ids.length })
}

// DELETE — soft delete (set deleted_at, keep thumbnails)
export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()
  const { ids } = body

  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('images')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: 'admin',
      status: 'rejected',
    })
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit('reject', 'image', ids)
  return NextResponse.json({ deleted: ids.length })
}
