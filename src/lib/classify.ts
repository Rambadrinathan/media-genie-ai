import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import type { ImageAnalysis } from './types'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

const CLASSIFICATION_PROMPT = `You are an image classification agent for KarmYog Vatika Gardens — a company that builds bamboo structures, biophilic gardens, modular planters, and sustainable installations.

Analyze this image and return a JSON object with these fields:

{
  "tags": string[] — Multi-label tags from this vocabulary: bamboo, structure, garden, interior, exterior, drone, 3d-render, team-photo, event, construction, before-after, planter, installation, branding, social-media, aerial, landscape, detail-shot, client-meeting, workshop, signage, nursery, plant, water-feature, lighting, furniture, pavilion, canopy, pergola, walkway, facade, rooftop, courtyard, office, campus, residential, commercial, public-space. Use 2-6 tags.

  "scene": string — One of: site-visit, workshop, exhibition, office, outdoor, studio, construction-site, nursery, event-venue, campus, residential, commercial, aerial-view, render-view

  "quality_score": number — 0 to 10. Consider: sharpness, exposure, composition, lighting, resolution, noise. 8+ = excellent, 5-7 = acceptable, <5 = poor.

  "quality_flags": string[] — Any issues: "blurry", "dark", "overexposed", "noisy", "watermarked", "screenshot", "low-resolution", "cropped-badly", "lens-flare". Empty array if no issues.

  "caption": string — A concise, descriptive caption (1-2 sentences) suitable for an investor or portfolio. Be specific about what's shown.

  "dominant_colors": string[] — 3-5 hex color codes of the dominant colors in the image.

  "orientation": "landscape" | "portrait" | "square"

  "suggested_folder": string — The best folder for this image. Choose from: bamboo-structures, garden-installations, interior-design, exterior-views, drone-aerial, 3d-renders, team-photos, events, marketing-brand, construction-progress, before-after, planters, nursery, landscapes, detail-shots, client-sites, misc. If none fit well, use "misc".

  "is_duplicate_likely": boolean — false (you can't detect duplicates from a single image, this is handled separately)
}

Return ONLY the JSON object, no markdown formatting, no explanation.`

export async function classifyImageBuffer(
  buffer: Buffer,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
): Promise<ImageAnalysis> {
  const base64 = buffer.toString('base64')

  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: CLASSIFICATION_PROMPT },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function classifyImage(imagePath: string): Promise<ImageAnalysis> {
  const imageBuffer = fs.readFileSync(imagePath)
  const base64 = imageBuffer.toString('base64')

  const ext = path.extname(imagePath).toLowerCase()
  const mediaTypeMap: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }
  const mediaType = mediaTypeMap[ext] || 'image/jpeg'

  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: CLASSIFICATION_PROMPT,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  const analysis: ImageAnalysis = JSON.parse(cleaned)
  return analysis
}
