'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImageRecord } from '@/lib/types'

type FilterState = {
  status: string
  tags: string[]
  minQuality: number
  search: string
}

export default function ReviewPage() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalImage, setModalImage] = useState<ImageRecord | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    status: 'pending_approval',
    tags: [],
    minQuality: 0,
    search: '',
  })
  const [allTags, setAllTags] = useState<string[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })

  const fetchImages = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('images')
      .select('*')
      .order('uploaded_at', { ascending: false })

    if (filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.minQuality > 0) {
      query = query.gte('quality_score', filters.minQuality)
    }
    if (filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }
    if (filters.search) {
      query = query.or(`filename.ilike.%${filters.search}%,ai_caption.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.limit(100)
    if (error) {
      console.error('Fetch error:', error)
    } else {
      setImages(data || [])
    }
    setLoading(false)
  }, [filters])

  const fetchStats = useCallback(async () => {
    const [total, pending, approved, rejected] = await Promise.all([
      supabase.from('images').select('id', { count: 'exact', head: true }),
      supabase.from('images').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      supabase.from('images').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('images').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    ])
    setStats({
      total: total.count || 0,
      pending: pending.count || 0,
      approved: approved.count || 0,
      rejected: rejected.count || 0,
    })
  }, [])

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from('images').select('tags')
    if (data) {
      const tagSet = new Set<string>()
      data.forEach(row => (row.tags || []).forEach((t: string) => tagSet.add(t)))
      setAllTags([...tagSet].sort())
    }
  }, [])

  useEffect(() => {
    fetchImages()
    fetchStats()
    fetchTags()
  }, [fetchImages, fetchStats, fetchTags])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === images.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(images.map(i => i.id)))
    }
  }

  const bulkUpdateStatus = async (status: 'approved' | 'rejected') => {
    if (selected.size === 0) return
    const ids = [...selected]
    const { error } = await supabase
      .from('images')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: 'curator' })
      .in('id', ids)

    if (!error) {
      setSelected(new Set())
      fetchImages()
      fetchStats()
    }
  }

  const updateSingleImage = async (id: string, updates: Partial<ImageRecord>) => {
    const { error } = await supabase.from('images').update(updates).eq('id', id)
    if (!error) {
      fetchImages()
      fetchStats()
      if (modalImage?.id === id) {
        setModalImage({ ...modalImage, ...updates } as ImageRecord)
      }
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-stone-800">KarmYog Gallery</h1>
            <span className="text-sm text-stone-500">Image Management</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/review" className="text-stone-800 font-medium">Review</a>
            <a href="/portfolio" className="text-stone-500 hover:text-stone-800">Portfolios</a>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'bg-stone-100 text-stone-800' },
            { label: 'Pending', value: stats.pending, color: 'bg-amber-50 text-amber-700' },
            { label: 'Approved', value: stats.approved, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Rejected', value: stats.rejected, color: 'bg-red-50 text-red-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg px-4 py-3 ${s.color}`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm opacity-75">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-stone-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status filter */}
            <select
              className="border border-stone-300 rounded-md px-3 py-1.5 text-sm bg-white"
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            >
              <option value="all">All Status</option>
              <option value="pending_approval">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Quality filter */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-stone-500">Min Quality:</span>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={filters.minQuality}
                onChange={e => setFilters(f => ({ ...f, minQuality: Number(e.target.value) }))}
                className="w-24"
              />
              <span className="text-stone-700 font-medium w-4">{filters.minQuality}</span>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search filename or caption..."
              className="border border-stone-300 rounded-md px-3 py-1.5 text-sm flex-1 min-w-48"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            />

            {/* Tag filter */}
            <div className="flex flex-wrap gap-1">
              {allTags.slice(0, 10).map(tag => (
                <button
                  key={tag}
                  onClick={() =>
                    setFilters(f => ({
                      ...f,
                      tags: f.tags.includes(tag)
                        ? f.tags.filter(t => t !== tag)
                        : [...f.tags, tag],
                    }))
                  }
                  className={`px-2 py-0.5 rounded-full text-xs border transition ${
                    filters.tags.includes(tag)
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="bg-stone-800 text-white rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-sm">{selected.size} image{selected.size > 1 ? 's' : ''} selected</span>
            <div className="flex gap-2">
              <button
                onClick={() => bulkUpdateStatus('approved')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-md text-sm font-medium"
              >
                Approve Selected
              </button>
              <button
                onClick={() => bulkUpdateStatus('rejected')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md text-sm font-medium"
              >
                Reject Selected
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-stone-300 hover:text-white px-3 py-1.5 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Select All */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={selectAll} className="text-sm text-stone-500 hover:text-stone-700">
            {selected.size === images.length && images.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-sm text-stone-400">{images.length} images</span>
        </div>

        {/* Image Grid */}
        {loading ? (
          <div className="text-center py-20 text-stone-400">Loading images...</div>
        ) : images.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-lg">No images found</p>
            <p className="text-stone-300 text-sm mt-1">Drop images into your Google Drive _inbox folder</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map(img => (
              <div
                key={img.id}
                className={`group relative bg-white rounded-lg border overflow-hidden cursor-pointer transition ${
                  selected.has(img.id) ? 'border-stone-800 ring-2 ring-stone-800' : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                {/* Checkbox */}
                <div
                  className="absolute top-2 left-2 z-10"
                  onClick={e => {
                    e.stopPropagation()
                    toggleSelect(img.id)
                  }}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                      selected.has(img.id)
                        ? 'bg-stone-800 border-stone-800'
                        : 'bg-white/80 border-stone-300 group-hover:border-stone-500'
                    }`}
                  >
                    {selected.has(img.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Quality badge */}
                <div className="absolute top-2 right-2 z-10">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      (img.quality_score || 0) >= 7
                        ? 'bg-emerald-100 text-emerald-700'
                        : (img.quality_score || 0) >= 5
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {img.quality_score?.toFixed(1)}
                  </span>
                </div>

                {/* Image */}
                <div
                  className="aspect-square bg-stone-100"
                  onClick={() => setModalImage(img)}
                >
                  {img.thumbnail_url ? (
                    <img
                      src={img.thumbnail_url}
                      alt={img.ai_caption || img.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300 text-3xl">
                      ?
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs text-stone-600 truncate">{img.ai_caption || img.filename}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(img.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image preview */}
              <div className="bg-stone-100 flex items-center justify-center min-h-80">
                {modalImage.cdn_url ? (
                  <img
                    src={modalImage.cdn_url}
                    alt={modalImage.ai_caption || modalImage.filename}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                ) : (
                  <div className="text-stone-300 text-6xl">?</div>
                )}
              </div>

              {/* Details */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-stone-800">Image Details</h2>
                  <button
                    onClick={() => setModalImage(null)}
                    className="text-stone-400 hover:text-stone-600 text-xl"
                  >
                    x
                  </button>
                </div>

                {/* Tags */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {(modalImage.tags || []).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-stone-100 text-stone-600 rounded-md text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Caption */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Caption</h3>
                  <p className="text-sm text-stone-700">{modalImage.ai_caption || 'No caption'}</p>
                </div>

                {/* Metadata */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Metadata</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-stone-400">Quality:</span>{' '}
                      <span className="font-medium">{modalImage.quality_score?.toFixed(1)}/10</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Size:</span>{' '}
                      <span className="font-medium">
                        {modalImage.width} x {modalImage.height}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400">Folder:</span>{' '}
                      <span className="font-medium">{modalImage.classified_folder}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Scene:</span>{' '}
                      <span className="font-medium">{modalImage.scene}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">File:</span>{' '}
                      <span className="font-medium truncate">{modalImage.filename}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Status:</span>{' '}
                      <span className="font-medium">{modalImage.status}</span>
                    </div>
                  </div>
                </div>

                {/* Colors */}
                {modalImage.dominant_colors && modalImage.dominant_colors.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Colors</h3>
                    <div className="flex gap-2">
                      {modalImage.dominant_colors.map((color, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div
                            className="w-6 h-6 rounded border border-stone-200"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-stone-400">{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-stone-200">
                  <button
                    onClick={() =>
                      updateSingleImage(modalImage.id, {
                        status: 'approved',
                        reviewed_at: new Date().toISOString(),
                        reviewed_by: 'curator',
                      })
                    }
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md text-sm font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      updateSingleImage(modalImage.id, {
                        status: 'rejected',
                        reviewed_at: new Date().toISOString(),
                        reviewed_by: 'curator',
                      })
                    }
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm font-medium"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
