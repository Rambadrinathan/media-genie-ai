'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminGate } from '@/components/AdminGate'
import { Header } from '@/components/Header'
import type { ImageRecord, Portfolio } from '@/lib/types'

const PENDING_KEY = (id: string) => `media-genie:pending-add:${id}`

export default function AddImagesPage() {
  return (
    <AdminGate>
      <AddImagesContent />
    </AdminGate>
  )
}

function AddImagesContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [existingImageIds, setExistingImageIds] = useState<string[]>([])
  const [initialLoading, setInitialLoading] = useState(true)

  const [folders, setFolders] = useState<string[]>([])
  const [scenes, setScenes] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [minQuality, setMinQuality] = useState<number>(0)
  const [search, setSearch] = useState<string>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [limit, setLimit] = useState(30)

  const [available, setAvailable] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [totalApproved, setTotalApproved] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const [taxFolders, setTaxFolders] = useState<string[]>([])
  const [taxScenes, setTaxScenes] = useState<string[]>([])
  const [taxTags, setTaxTags] = useState<string[]>([])

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/portfolios/${id}`)
      if (res.ok) {
        const data = await res.json()
        setPortfolio(data.portfolio)
        setExistingImageIds((data.images as ImageRecord[]).map(img => img.id))
      }
      const taxRes = await fetch('/api/images/taxonomy?approvedOnly=true')
      if (taxRes.ok) {
        const t = await taxRes.json()
        setTaxFolders(t.folders || [])
        setTaxScenes(t.scenes || [])
        setTaxTags(t.tags || [])
      }
      setInitialLoading(false)
    })()
  }, [id])

  const fetchImages = useCallback(async () => {
    if (initialLoading) return
    setLoading(true)
    const res = await fetch('/api/images/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folders, scenes, tags, minQuality, search,
        excludeIds: existingImageIds,
        limit, offset: 0,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setAvailable(data.images || [])
      setTotal(data.total || 0)
      setTotalApproved(data.totalApproved || 0)
      setHasMore(data.hasMore || false)
    }
    setLoading(false)
  }, [folders, scenes, tags, minQuality, search, existingImageIds, limit, initialLoading])

  useEffect(() => {
    const t = setTimeout(() => { fetchImages() }, 250)
    return () => clearTimeout(t)
  }, [fetchImages])

  function toggle(imgId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(imgId)) next.delete(imgId)
      else next.add(imgId)
      return next
    })
  }

  function commitAndReturn() {
    if (selected.size === 0) {
      router.push(`/portfolio/${id}/edit`)
      return
    }
    const picked = available.filter(img => selected.has(img.id))
    sessionStorage.setItem(PENDING_KEY(id), JSON.stringify(picked))
    router.push(`/portfolio/${id}/edit`)
  }

  function cancelAndReturn() {
    router.push(`/portfolio/${id}/edit`)
  }

  const hasActiveFilters = folders.length > 0 || scenes.length > 0 || tags.length > 0 || minQuality > 0 || search.trim().length > 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <Header variant="admin" page="portfolios" />

      {/* Page head */}
      <div className="mx-auto px-7 pt-7 pb-4" style={{ maxWidth: 1360 }}>
        <div className="flex items-end justify-between gap-8">
          <div>
            <Link
              href={`/portfolio/${id}/edit`}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}
            >
              ← Back to editor
            </Link>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 36, lineHeight: 1.05, letterSpacing: '-0.01em', margin: '4px 0 0' }}>
              Add images to <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>{portfolio?.title || 'this portfolio'}</em>.
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
              {loading ? 'Loading…' : (
                <>
                  Showing {available.length} of {total} matching · {totalApproved} approved total · {existingImageIds.length} already in this portfolio
                </>
              )}
            </p>
          </div>
          <div className="flex gap-[10px]">
            <button
              onClick={cancelAndReturn}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={commitAndReturn}
              disabled={selected.size === 0}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, padding: '9px 18px', borderRadius: 8,
                border: '1px solid var(--ink)',
                background: selected.size === 0 ? 'var(--muted)' : 'var(--ink)',
                color: 'var(--paper)',
                cursor: selected.size === 0 ? 'default' : 'pointer',
                opacity: selected.size === 0 ? 0.7 : 1,
              }}
            >
              Add {selected.size > 0 ? `${selected.size} ` : ''}to portfolio
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="sticky top-[54px] z-10 mx-auto px-7 py-3"
        style={{ maxWidth: 1360, background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}
      >
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
          {taxFolders.length > 0 && (
            <FilterRow label="Folders" items={taxFolders} active={folders} onToggle={f => setFolders(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])} />
          )}
          {taxScenes.length > 0 && (
            <FilterRow label="Scenes" items={taxScenes} active={scenes} onToggle={s => setScenes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} />
          )}
          {taxTags.length > 0 && (
            <FilterRow label="Tags" items={taxTags} active={tags} onToggle={t => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} />
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2" style={{ borderTop: '1px dashed var(--line-soft)', marginTop: 6 }}>
            <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Min quality:</span>
              <input type="range" min="0" max="10" step="0.5" value={minQuality} onChange={e => setMinQuality(Number(e.target.value))} className="w-28" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', width: 28, textAlign: 'right' }}>{minQuality.toFixed(1)}</span>
            </div>
            <input
              type="text"
              placeholder="Search caption or filename…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[220px]"
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '7px 12px', fontSize: 13, background: '#fff' }}
            />
            {hasActiveFilters && (
              <button
                onClick={() => { setFolders([]); setScenes([]); setTags([]); setMinQuality(0); setSearch('') }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', background: 'transparent', border: 0, cursor: 'pointer' }}
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image grid */}
      <div className="mx-auto px-7 py-5" style={{ maxWidth: 1360 }}>
        {loading && available.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--muted)', fontSize: 13 }}>Loading images…</div>
        ) : available.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--muted)', fontSize: 13 }}>
            {total === 0 && totalApproved > 0
              ? 'No images match the current filters. Try clearing some.'
              : 'No more approved images available.'}
          </div>
        ) : (
          <>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {available.map(img => {
                const isSelected = selected.has(img.id)
                return (
                  <button
                    key={img.id}
                    onClick={() => toggle(img.id)}
                    className="group relative overflow-hidden"
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 10,
                      background: 'var(--sand-2)',
                      border: isSelected ? '2px solid var(--ink)' : '1px solid var(--line)',
                      boxShadow: isSelected ? '0 0 0 2px var(--ink) inset' : undefined,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.thumbnail_url || img.cdn_url || ''}
                      alt={img.ai_caption || ''}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {isSelected && (
                      <div
                        className="absolute top-2 left-2 flex items-center justify-center"
                        style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--ink)' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                          <path d="M4 10.5L8 14.5L16 6.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    {img.quality_score != null && (
                      <span
                        className="absolute top-2 right-2"
                        style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em',
                          padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(0,0,0,0.55)', color: '#fff',
                        }}
                      >
                        {img.quality_score.toFixed(1)}
                      </span>
                    )}
                    <div
                      className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition"
                      style={{ padding: '8px 10px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
                    >
                      <p style={{ color: '#fff', fontSize: 11, lineHeight: 1.3, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'left' }}>
                        {img.ai_caption || img.filename}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {hasMore && (
              <div className="text-center pt-6">
                <button
                  onClick={() => setLimit(prev => prev + 30)}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 13, padding: '9px 18px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', cursor: 'pointer' }}
                >
                  Load 30 more ({total - available.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky selection bar at the bottom — only if something is selected */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-0 inset-x-0 z-20"
          style={{ background: 'var(--ink)', color: 'var(--paper)', borderTop: '1px solid var(--bark)' }}
        >
          <div className="mx-auto flex items-center justify-between px-7 py-3" style={{ maxWidth: 1360 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {selected.size} image{selected.size === 1 ? '' : 's'} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(new Set())}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: 'var(--paper)', cursor: 'pointer' }}
              >
                Clear
              </button>
              <button
                onClick={commitAndReturn}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, padding: '7px 16px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
              >
                Add {selected.size} to portfolio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterRow({ label, items, active, onToggle }: { label: string; items: string[]; active: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span
        className="shrink-0"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', padding: '6px 0', width: 72 }}
      >
        {label}
      </span>
      <div className="flex flex-wrap gap-[6px]">
        {items.map(v => {
          const isOn = active.includes(v)
          return (
            <button
              key={v}
              onClick={() => onToggle(v)}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 999,
                border: `1px solid ${isOn ? 'var(--ink)' : 'var(--line)'}`,
                background: isOn ? 'var(--ink)' : '#fff',
                color: isOn ? 'var(--paper)' : 'var(--ink)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}
