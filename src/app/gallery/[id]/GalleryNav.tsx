'use client'

import { ShareBar } from '@/components/ShareBar'

interface GalleryNavProps {
  title: string
  url: string
  portfolioId: string
}

// Renders the compact public-header share controls.
// Kept as a client component so ShareBar's clipboard + toast logic works;
// the outer page.tsx (server component) composes it into a static header.
export function GalleryNav({ title, url }: GalleryNavProps) {
  return (
    <div className="flex items-center gap-4">
      <a
        href="/portfolio"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}
      >
        All portfolios
      </a>
      <ShareBar title={title} url={url} />
    </div>
  )
}
