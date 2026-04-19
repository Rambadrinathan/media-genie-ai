'use client'

import { ShareBar } from '@/components/ShareBar'

interface GalleryNavProps {
  title: string
  url: string
  portfolioId: string
  /** when inline in hero, render compact pill buttons; when in the top bar, render ghost buttons */
  variant?: 'compact' | 'ghost'
}

/**
 * Share row for public galleries. Kept as a client component so ShareBar's
 * clipboard + QR modal can run. Imported by the server-rendered public gallery.
 */
export function GalleryNav({ title, url, variant = 'ghost' }: GalleryNavProps) {
  return (
    <div className="flex items-center gap-4">
      <a
        href="/portfolio"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: variant === 'compact' ? 'rgba(255,255,255,0.8)' : 'var(--muted)', textDecoration: 'none' }}
      >
        All portfolios
      </a>
      <ShareBar title={title} url={url} variant={variant} />
    </div>
  )
}
