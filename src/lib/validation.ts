// Character limits for metadata labels — prevents garbage at scale
export const LIMITS = {
  tag: 30,
  folder: 40,
  scene: 40,
  caption: 500,
} as const

// Sanitize a label: lowercase, alphanumeric + hyphens only, collapse spaces to hyphens
export function sanitizeLabel(raw: string, maxLength: number): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
}

export function isValidLabel(value: string, maxLength: number): boolean {
  const sanitized = sanitizeLabel(value, maxLength)
  return sanitized.length > 0 && sanitized.length <= maxLength && sanitized === value.toLowerCase().trim()
}
