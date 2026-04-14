import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const { prompt, template, selectedImageIds } = await request.json()

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  // Fetch approved images
  let query = supabase
    .from('images')
    .select('id, filename, tags, quality_score, ai_caption, scene, classified_folder, thumbnail_url, cdn_url')
    .eq('status', 'approved')
    .order('quality_score', { ascending: false })

  if (selectedImageIds && selectedImageIds.length > 0) {
    query = query.in('id', selectedImageIds)
  }

  const { data: images, error } = await query.limit(100)
  if (error || !images || images.length === 0) {
    return NextResponse.json({ error: 'No approved images found' }, { status: 404 })
  }

  // Use Claude to select and arrange images for the portfolio
  const imageList = images.map((img, i) => (
    `${i + 1}. [${img.id}] Tags: ${(img.tags || []).join(', ')} | Quality: ${img.quality_score} | Caption: ${img.ai_caption} | Folder: ${img.classified_folder}`
  )).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a portfolio curator for KarmYog Vatika Gardens.

Given this prompt from the user: "${prompt}"
Template type: ${template}

Here are the available approved images:
${imageList}

Select 6-12 images that best match the prompt. Order them for visual storytelling impact.
For each selected image, write a polished caption suitable for investors/clients.
Suggest a portfolio title.

Return JSON only:
{
  "title": "Portfolio title",
  "selected_images": [
    { "id": "image-uuid", "caption": "Polished caption for this image", "order": 1 }
  ],
  "cover_image_id": "uuid of the best cover image"
}

Return ONLY the JSON, no markdown.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let portfolioData
  try {
    portfolioData = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'AI response parsing failed' }, { status: 500 })
  }

  // Create portfolio in DB
  const portfolioId = crypto.randomUUID()
  const imageIds = portfolioData.selected_images.map((s: { id: string }) => s.id)
  const imageOrder = portfolioData.selected_images.map((_: unknown, i: number) => i)
  const captions: Record<string, string> = {}
  portfolioData.selected_images.forEach((s: { id: string; caption: string }) => {
    captions[s.id] = s.caption
  })

  const { error: insertError } = await supabase.from('portfolios').insert({
    id: portfolioId,
    title: portfolioData.title,
    template,
    prompt,
    image_ids: imageIds,
    image_order: imageOrder,
    captions,
    cover_image_id: portfolioData.cover_image_id,
    created_by: 'curator',
    status: 'draft',
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    id: portfolioId,
    title: portfolioData.title,
    image_count: imageIds.length,
  })
}
