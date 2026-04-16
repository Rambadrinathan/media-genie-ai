'use client'

import { ShareBar } from '@/components/ShareBar'

interface GalleryNavProps {
  title: string
  url: string
  portfolioId: string
}

export function GalleryNav({ title, url, portfolioId }: GalleryNavProps) {
  return (
    <div className="bg-white/90 backdrop-blur border-b border-stone-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <a
          href="/portfolio"
          className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1"
        >
          <span>&larr;</span> Back to Portfolios
        </a>
        <ShareBar title={title} url={url} />
      </div>
    </div>
  )
}
