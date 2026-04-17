import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Picker endpoint — server-side filtering for portfolio image selection.
// Designed to scale to thousands of approved images without client-side overload.
export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  const body = await request.json().catch(() => ({}))
  const {
    folders = [],        // string[]
    scenes = [],         // string[]
    tags = [],           // string[] — AND semantics (must have all)
    minQuality = 0,      // number
    search = '',         // string — caption or filename
    excludeIds = [],     // string[] — images already in portfolio
    limit = 15,          // number — default small
    offset = 0,          // pagination
  } = body

  // Count total approved images (for UI context)
  const { count: totalApproved } = await supabase
    .from('images')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')
    .is('deleted_at', null)

  let query = supabase
    .from('images')
    .select('*', { count: 'exact' })
    .eq('status', 'approved')
    .is('deleted_at', null)

  if (folders.length > 0) {
    query = query.in('classified_folder', folders)
  }
  if (scenes.length > 0) {
    query = query.in('scene', scenes)
  }
  if (tags.length > 0) {
    // tags column is array — use contains (&&) for overlap; for AND semantics, use cs (contains)
    // Supabase array contains: @> (all specified tags must be present)
    query = query.contains('tags', tags)
  }
  if (minQuality > 0) {
    query = query.gte('quality_score', minQuality)
  }
  if (search) {
    query = query.or(`filename.ilike.%${search}%,ai_caption.ilike.%${search}%`)
  }
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error, count } = await query
    .order('quality_score', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    images: data || [],
    total: count || 0,           // total matching filters
    totalApproved: totalApproved || 0, // total approved in library
    hasMore: (count || 0) > offset + (data?.length || 0),
    limit,
    offset,
  })
}
