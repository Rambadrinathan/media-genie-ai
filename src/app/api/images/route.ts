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
