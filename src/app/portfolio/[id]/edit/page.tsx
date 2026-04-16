'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AdminGate } from '@/components/AdminGate'
import { Header } from '@/components/Header'
import { useToast } from '@/components/Toast'
import { ConfirmModal } from '@/components/ConfirmModal'
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [availableImages, setAvailableImages] = useState<ImageRecord[]>([])
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
    setLoading(false)
  }, [id, router, showToast])

  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  async function fetchAvailableImages() {
    const { data } = await supabase
      .from('images')
      .select('*')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('quality_score', { ascending: false })
      .limit(200)
    const currentIds = new Set(images.map(img => img.id))
    setAvailableImages((data || []).filter(img => !currentIds.has(img.id)))
    setShowImagePicker(true)
  }

  function addImage(img: ImageRecord) {
    setImages(prev => [...prev, img])
    setAvailableImages(prev => prev.filter(a => a.id !== img.id))
  }

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
      <div className="min-h-screen bg-stone-50">
        <Header variant="admin" page="portfolios" />
        <div className="text-center py-20 text-stone-400">Loading portfolio...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header variant="admin" page="portfolios" />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Top actions */}
        <div className="flex items-center justify-between mb-6">
          <a href="/portfolio" className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1">
            <span>&larr;</span> Back to Portfolios
          </a>
          <div className="flex gap-2">
            <button
              onClick={() => window.open(`/gallery/${id}`, '_blank')}
              className="px-3 py-1.5 text-sm text-stone-600 border border-stone-300 rounded-md hover:bg-stone-100"
            >
              Preview
            </button>
            <button
              onClick={togglePublish}
              className={`px-3 py-1.5 text-sm rounded-md font-medium ${
                portfolio?.status === 'published'
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {portfolio?.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 text-white px-4 py-1.5 rounded-md text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Portfolio Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-2xl font-semibold text-stone-800 bg-transparent border-b-2 border-stone-200 focus:border-stone-800 outline-none pb-2 transition"
          />
        </div>

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
            <button
              onClick={fetchAvailableImages}
              className="text-sm text-stone-600 hover:text-stone-800 border border-stone-300 rounded-md px-3 py-1"
            >
              + Add Images
            </button>
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

        {/* Danger zone */}
        <div className="border-t border-stone-200 pt-6 mt-8">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Delete this portfolio
          </button>
        </div>
      </div>

      {/* Image picker modal */}
      {showImagePicker && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowImagePicker(false)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-stone-800">Add Images</h3>
                <button onClick={() => setShowImagePicker(false)} className="text-stone-400 hover:text-stone-600 text-xl">x</button>
              </div>
              {availableImages.length === 0 ? (
                <p className="text-stone-400 text-center py-8">No more approved images available</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {availableImages.map(img => (
                    <button
                      key={img.id}
                      onClick={() => addImage(img)}
                      className="group relative aspect-square rounded-lg overflow-hidden bg-stone-100 border border-stone-200 hover:border-stone-400 transition"
                    >
                      <img
                        src={img.thumbnail_url || img.cdn_url || ''}
                        alt={img.ai_caption || ''}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">+ Add</span>
                      </div>
                      {img.quality_score && (
                        <span className="absolute top-1 right-1 text-[10px] px-1 py-0.5 bg-black/50 text-white rounded">
                          {img.quality_score.toFixed(1)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
