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

  // Image picker filters
  const [pickerFilterFolder, setPickerFilterFolder] = useState<string>('all')
  const [pickerFilterScene, setPickerFilterScene] = useState<string>('all')
  const [pickerFilterTags, setPickerFilterTags] = useState<string[]>([])
  const [pickerMinQuality, setPickerMinQuality] = useState<number>(0)
  const [pickerSearch, setPickerSearch] = useState<string>('')
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set())

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
      .limit(500)
    const currentIds = new Set(images.map(img => img.id))
    setAvailableImages((data || []).filter(img => !currentIds.has(img.id)))
    // Reset filters
    setPickerFilterFolder('all')
    setPickerFilterScene('all')
    setPickerFilterTags([])
    setPickerMinQuality(0)
    setPickerSearch('')
    setPickerSelected(new Set())
    setShowImagePicker(true)
  }

  function togglePickerSelect(id: string) {
    setPickerSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addSelectedImages() {
    const toAdd = availableImages.filter(img => pickerSelected.has(img.id))
    setImages(prev => [...prev, ...toAdd])
    setAvailableImages(prev => prev.filter(img => !pickerSelected.has(img.id)))
    setPickerSelected(new Set())
  }

  // Compute filter options from available images
  const pickerFolders = Array.from(new Set(availableImages.map(img => img.classified_folder).filter(Boolean))).sort() as string[]
  const pickerScenes = Array.from(new Set(availableImages.map(img => img.scene).filter(Boolean))).sort() as string[]
  const pickerAllTags = Array.from(new Set(availableImages.flatMap(img => img.tags || []))).sort()

  // Apply filters
  const filteredPickerImages = availableImages.filter(img => {
    if (pickerFilterFolder !== 'all' && img.classified_folder !== pickerFilterFolder) return false
    if (pickerFilterScene !== 'all' && img.scene !== pickerFilterScene) return false
    if (pickerMinQuality > 0 && (img.quality_score || 0) < pickerMinQuality) return false
    if (pickerFilterTags.length > 0) {
      const imgTags = new Set(img.tags || [])
      if (!pickerFilterTags.every(t => imgTags.has(t))) return false
    }
    if (pickerSearch) {
      const q = pickerSearch.toLowerCase()
      const matchFilename = img.filename?.toLowerCase().includes(q)
      const matchCaption = img.ai_caption?.toLowerCase().includes(q)
      if (!matchFilename && !matchCaption) return false
    }
    return true
  })

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
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div>
                <h3 className="text-lg font-semibold text-stone-800">Add Images</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Showing {filteredPickerImages.length} of {availableImages.length} approved images
                  {pickerSelected.size > 0 && <span className="text-stone-800 font-medium"> — {pickerSelected.size} selected</span>}
                </p>
              </div>
              <button onClick={() => setShowImagePicker(false)} className="text-stone-400 hover:text-stone-600 text-xl">x</button>
            </div>

            {/* Filters */}
            <div className="p-4 bg-stone-50 border-b border-stone-200 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Folder */}
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-stone-500">Folder:</span>
                  <select
                    value={pickerFilterFolder}
                    onChange={e => setPickerFilterFolder(e.target.value)}
                    className="border border-stone-300 rounded-md px-2 py-1 text-sm bg-white"
                  >
                    <option value="all">All folders</option>
                    {pickerFolders.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                {/* Scene */}
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-stone-500">Scene:</span>
                  <select
                    value={pickerFilterScene}
                    onChange={e => setPickerFilterScene(e.target.value)}
                    className="border border-stone-300 rounded-md px-2 py-1 text-sm bg-white"
                  >
                    <option value="all">All scenes</option>
                    {pickerScenes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Min Quality */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-stone-500">Min Quality:</span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={pickerMinQuality}
                    onChange={e => setPickerMinQuality(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-stone-700 font-medium w-6 text-right">{pickerMinQuality.toFixed(1)}</span>
                </div>

                {/* Search */}
                <input
                  type="text"
                  placeholder="Search caption or filename..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="flex-1 min-w-32 border border-stone-300 rounded-md px-3 py-1 text-sm"
                />

                {/* Clear filters */}
                {(pickerFilterFolder !== 'all' || pickerFilterScene !== 'all' || pickerFilterTags.length > 0 || pickerMinQuality > 0 || pickerSearch) && (
                  <button
                    onClick={() => {
                      setPickerFilterFolder('all')
                      setPickerFilterScene('all')
                      setPickerFilterTags([])
                      setPickerMinQuality(0)
                      setPickerSearch('')
                    }}
                    className="text-xs text-stone-500 hover:text-stone-800 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Tag chips */}
              {pickerAllTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-stone-500 mr-1 self-center">Tags:</span>
                  {pickerAllTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setPickerFilterTags(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      )}
                      className={`px-2 py-0.5 rounded-full text-xs border transition ${
                        pickerFilterTags.includes(tag)
                          ? 'bg-stone-800 text-white border-stone-800'
                          : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {availableImages.length === 0 ? (
                <p className="text-stone-400 text-center py-8">No more approved images available</p>
              ) : filteredPickerImages.length === 0 ? (
                <p className="text-stone-400 text-center py-8">No images match the current filters. Try clearing some filters.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {filteredPickerImages.map(img => (
                    <button
                      key={img.id}
                      onClick={() => togglePickerSelect(img.id)}
                      className={`group relative aspect-square rounded-lg overflow-hidden bg-stone-100 border-2 transition ${
                        pickerSelected.has(img.id)
                          ? 'border-stone-800 ring-2 ring-stone-800'
                          : 'border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <img
                        src={img.thumbnail_url || img.cdn_url || ''}
                        alt={img.ai_caption || ''}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {pickerSelected.has(img.id) && (
                        <div className="absolute top-1 left-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {img.quality_score && (
                        <span className="absolute top-1 right-1 text-[10px] px-1 py-0.5 bg-black/50 text-white rounded">
                          {img.quality_score.toFixed(1)}
                        </span>
                      )}
                      {/* Caption on hover */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
                        <p className="text-white text-[10px] leading-tight line-clamp-2">
                          {img.ai_caption || img.filename}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with bulk add */}
            <div className="p-4 border-t border-stone-200 flex items-center justify-between bg-white rounded-b-xl">
              <p className="text-xs text-stone-500">
                Click images to select. {pickerSelected.size > 0 ? `${pickerSelected.size} selected` : 'None selected'}.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImagePicker(false)}
                  className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-md hover:bg-stone-50"
                >
                  Close
                </button>
                <button
                  onClick={() => { addSelectedImages(); setShowImagePicker(false) }}
                  disabled={pickerSelected.size === 0}
                  className="bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Add {pickerSelected.size > 0 ? pickerSelected.size : ''} to Portfolio
                </button>
              </div>
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
