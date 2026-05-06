import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET — fetch single portfolio with its images
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: portfolio, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
  }

  // Fetch associated images
  let images: Record<string, unknown>[] = []
  if (portfolio.image_ids && portfolio.image_ids.length > 0) {
    const { data } = await supabase
      .from('images')
      .select('*')
      .in('id', portfolio.image_ids)

    if (data) {
      // Sort by portfolio order
      const imageMap = new Map(data.map((img: Record<string, unknown>) => [img.id, img]))
      images = portfolio.image_ids
        .map((imgId: string) => imageMap.get(imgId))
        .filter(Boolean)
    }
  }

  return NextResponse.json({ portfolio, images })
}

// PATCH — update portfolio
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const allowedFields = ['title', 'image_ids', 'image_order', 'captions', 'cover_image_id', 'template', 'status', 'publish_to_website']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  // If publishing, set the published_url
  if (body.status === 'published') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    updates.published_url = `${appUrl}/gallery/${id}`
  }

  const { error } = await supabase
    .from('portfolios')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit('edit_portfolio', 'portfolio', id, { fields: Object.keys(updates) })

  return NextResponse.json({ ok: true })
}

// DELETE — soft delete portfolio
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('portfolios')
    .update({ deleted_at: new Date().toISOString(), status: 'archived' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit('delete_portfolio', 'portfolio', id)

  return NextResponse.json({ ok: true })
}
