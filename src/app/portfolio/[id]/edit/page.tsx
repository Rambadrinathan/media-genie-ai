'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminGate } from '@/components/AdminGate'
import { Header } from '@/components/Header'
import { useToast } from '@/components/Toast'
import { ConfirmModal } from '@/components/ConfirmModal'
import { ShareBar } from '@/components/ShareBar'
import type { ImageRecord, Portfolio } from '@/lib/types'

export default function EditPortfolioPage() {
  return (
    <AdminGate>
      <EditPortfolioContent />
    </AdminGate>
  )
}

function EditPortfolioContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useToast()

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [images, setImages] = useState<ImageRecord[]>([])
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [title, setTitle] = useState('')
  const [coverImageId, setCoverImageId] = useState<string | null>(null)
  const [publishToWebsite, setPublishToWebsite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const fetchPortfolio = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/portfolios/${id}`)
    if (!res.ok) {
      showToast('Portfolio not found', 'error')
      router.push('/portfolio')
      return
    }
    const data = await res.json()
    setPortfolio(data.portfolio)
    setImages(data.images)
    setCaptions(data.portfolio.captions || {})
    setTitle(data.portfolio.title)
    setCoverImageId(data.portfolio.cover_image_id)
    setPublishToWebsite(data.portfolio.publish_to_website ?? false)
    setLoading(false)
  }, [id, router, showToast])

  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  // Merge pending additions from the Add Images page (sessionStorage handoff).
  // One-shot sync with an external source (sessionStorage) on mount — the
  // setState-in-effect rule's accepted pattern for syncing external state.
  useEffect(() => {
    if (loading) return
    const key = `media-genie:pending-add:${id}`
    const raw = sessionStorage.getItem(key)
    if (!raw) return
    try {
      const pending: ImageRecord[] = JSON.parse(raw)
      if (Array.isArray(pending) && pending.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setImages(prev => {
          const existing = new Set(prev.map(img => img.id))
          const add = pending.filter(img => !existing.has(img.id))
          return [...prev, ...add]
        })
        showToast(`Added ${pending.length} image${pending.length === 1 ? '' : 's'} — click Save to persist.`, 'success')
      }
    } catch {}
    sessionStorage.removeItem(key)
  }, [loading, id, showToast])

  function removeImage(imgId: string) {
    setImages(prev => prev.filter(img => img.id !== imgId))
    if (coverImageId === imgId && images.length > 1) {
      setCoverImageId(images.find(img => img.id !== imgId)?.id || null)
    }
  }

  function moveImage(fromIndex: number, toIndex: number) {
    setImages(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/portfolios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        image_ids: images.map(img => img.id),
        captions,
        cover_image_id: coverImageId || images[0]?.id,
      }),
    })
    setSaving(false)
    if (res.ok) {
      showToast('Portfolio saved', 'success')
    } else {
      showToast('Failed to save', 'error')
    }
  }

  async function togglePublish() {
    const newStatus = portfolio?.status === 'published' ? 'draft' : 'published'
    const res = await fetch(`/api/portfolios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setPortfolio(prev => prev ? { ...prev, status: newStatus } : null)
      showToast(newStatus === 'published' ? 'Portfolio published' : 'Portfolio unpublished', 'success')
    }
  }

  async function deletePortfolio() {
    const res = await fetch(`/api/portfolios/${id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Portfolio deleted', 'success')
      router.push('/portfolio')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
        <Header variant="admin" page="portfolios" />
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>Loading portfolio...</div>
      </div>
    )
  }

  const isDraft = portfolio?.status !== 'published'

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <Header variant="admin" page="portfolios" />

      <div className="mx-auto px-7 py-7" style={{ maxWidth: 1200 }}>
        {/* Page head */}
        <div className="flex items-end justify-between mb-6 gap-8">
          <div>
            <a
              href="/portfolio"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}
            >
              ← Back to portfolios
            </a>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32, lineHeight: 1.05, margin: '4px 0 0', letterSpacing: '-0.01em' }}>
              Editor
            </h1>
          </div>
          <div className="flex gap-[10px]">
            <button
              onClick={() => window.open(`/gallery/${id}`, '_blank')}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', cursor: 'pointer' }}
            >
              Preview
            </button>
            <button
              onClick={togglePublish}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 500,
                padding: '9px 16px',
                borderRadius: 8,
                border: `1px solid ${isDraft ? 'var(--accent)' : 'var(--line)'}`,
                background: isDraft ? 'var(--accent)' : 'transparent',
                color: isDraft ? '#fff' : 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              {portfolio?.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 500,
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid var(--ink)',
                background: saving ? 'var(--muted)' : 'var(--ink)',
                color: 'var(--paper)',
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Main editor card */}
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '24px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {portfolio?.template || 'custom'} template · {images.length} image{images.length === 1 ? '' : 's'}
          </div>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 36,
              lineHeight: 1.1,
              border: 0,
              outline: 0,
              width: '100%',
              background: 'transparent',
              color: 'var(--ink)',
              padding: '0 0 8px',
              borderBottom: '1px dashed transparent',
              marginTop: 4,
            }}
            onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--line)' }}
            onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent' }}
          />
          <div className="flex gap-4 items-center" style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            <span>Status · {portfolio?.status || 'draft'}</span>
            {portfolio?.prompt && <span>Prompt · &ldquo;{portfolio.prompt}&rdquo;</span>}
          </div>

          {/* Push to website toggle */}
          <div className="mt-6 flex items-center gap-3" style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <button
              onClick={async () => {
                const next = !publishToWebsite
                setPublishToWebsite(next)
                const res = await fetch(`/api/portfolios/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ publish_to_website: next }),
                })
                if (res.ok) {
                  showToast(next ? 'Will appear on Rosedale Vatika website' : 'Removed from Rosedale Vatika website', 'success')
                } else {
                  setPublishToWebsite(!next)
                  showToast('Failed to update', 'error')
                }
              }}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 0,
                padding: 2,
                cursor: 'pointer',
                background: publishToWebsite ? 'var(--accent)' : 'var(--line)',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  transition: 'transform 0.2s',
                  transform: publishToWebsite ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                Push to Rosedale Vatika website
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--muted)', marginTop: 1 }}>
                {publishToWebsite ? 'Live on vatika.ai' : 'Not shown on website'}
              </div>
            </div>
          </div>

          {/* Share panel — editor share row */}
          {portfolio?.status === 'published' && (
            <div className="mt-6" style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--paper)', border: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                Share
              </div>
              <ShareBar
                title={portfolio.title}
                url={typeof window !== 'undefined' ? `${window.location.origin}/gallery/${id}` : `/gallery/${id}`}
                variant="ghost"
              />
            </div>
          )}

        {/* Cover image selector */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Cover Image</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map(img => (
              <button
                key={img.id}
                onClick={() => setCoverImageId(img.id)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                  coverImageId === img.id ? 'border-stone-800 ring-2 ring-stone-800' : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                <img src={img.thumbnail_url || img.cdn_url || ''} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Image grid with captions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">
              Images ({images.length})
            </label>
            <Link
              href={`/portfolio/${id}/edit/add`}
              className="text-sm text-stone-600 hover:text-stone-800 border border-stone-300 rounded-md px-3 py-1"
              style={{ textDecoration: 'none' }}
            >
              + Add Images
            </Link>
          </div>

          <div className="space-y-3">
            {images.map((img, index) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== index) {
                    moveImage(dragIndex, index)
                  }
                  setDragIndex(null)
                }}
                className={`bg-white rounded-lg border border-stone-200 p-3 flex gap-4 items-start cursor-grab active:cursor-grabbing transition ${
                  dragIndex === index ? 'opacity-50' : ''
                }`}
              >
                {/* Drag handle + order */}
                <div className="flex flex-col items-center gap-1 pt-2">
                  <span className="text-xs text-stone-400">#{index + 1}</span>
                  <svg className="w-4 h-4 text-stone-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
                  </svg>
                </div>

                {/* Thumbnail */}
                <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-stone-100">
                  <img
                    src={img.thumbnail_url || img.cdn_url || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Caption */}
                <div className="flex-1 min-w-0">
                  <textarea
                    value={captions[img.id] || img.ai_caption || ''}
                    onChange={e => setCaptions(prev => ({ ...prev, [img.id]: e.target.value }))}
                    className="w-full text-sm text-stone-700 border border-stone-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-stone-400"
                    rows={3}
                    placeholder="Write a caption..."
                  />
                  <div className="flex gap-2 mt-1">
                    {(img.tags || []).slice(0, 4).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeImage(img.id)}
                  className="text-stone-300 hover:text-red-500 transition p-1"
                  title="Remove from portfolio"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        </div>

        {/* Danger zone */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
          >
            Delete this portfolio
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Portfolio"
          message="This portfolio will be archived and no longer visible. This can be undone by an admin."
          confirmLabel="Delete"
          confirmColor="red"
          onConfirm={deletePortfolio}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
