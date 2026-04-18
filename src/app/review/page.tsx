'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminGate } from '@/components/AdminGate'
import { Header } from '@/components/Header'
import { useToast } from '@/components/Toast'
import { ConfirmModal } from '@/components/ConfirmModal'
import { ImageUploader } from '@/components/ImageUploader'
import { sanitizeLabel, LIMITS } from '@/lib/validation'
import type { ImageRecord } from '@/lib/types'

type QualityOp = 'gte' | 'eq' | 'lt' | 'gt'

type FilterState = {
  status: string
  tags: string[]
  qualityOp: QualityOp
  qualityValue: number
  search: string
}

export default function ReviewPage() {
  return (
    <AdminGate>
      <ReviewContent />
    </AdminGate>
  )
}

function ReviewContent() {
  const { showToast } = useToast()
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalImage, setModalImage] = useState<ImageRecord | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    status: 'pending_approval',
    tags: [],
    qualityOp: 'gte',
    qualityValue: 0,
    search: '',
  })
  const [allTags, setAllTags] = useState<string[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, deleted: 0 })
  const [showUploader, setShowUploader] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject'
    ids: string[]
    thumbnails: string[]
  } | null>(null)

  const fetchImages = useCallback(async () => {
    setLoading(true)

    if (filters.status === 'deleted') {
      // Fetch soft-deleted images via API
      const res = await fetch('/api/images?deleted=true&limit=100')
      const data = await res.json()
      setImages(Array.isArray(data) ? data : [])
      setLoading(false)
      return
    }

    let query = supabase
      .from('images')
      .select('*')
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false })

    if (filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.qualityOp === 'eq') {
      query = query.eq('quality_score', filters.qualityValue)
    } else if (filters.qualityOp === 'lt') {
      query = query.lt('quality_score', filters.qualityValue)
    } else if (filters.qualityOp === 'gt') {
      query = query.gt('quality_score', filters.qualityValue)
    } else if (filters.qualityValue > 0) {
      // 'gte' default — only apply when value > 0 so 0 means "show all"
      query = query.gte('quality_score', filters.qualityValue)
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
    const [total, pending, approved, rejected, deleted] = await Promise.all([
      supabase.from('images').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('images').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval').is('deleted_at', null),
      supabase.from('images').select('id', { count: 'exact', head: true }).eq('status', 'approved').is('deleted_at', null),
      supabase.from('images').select('id', { count: 'exact', head: true }).eq('status', 'rejected').is('deleted_at', null),
      supabase.from('images').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null),
    ])
    setStats({
      total: total.count || 0,
      pending: pending.count || 0,
      approved: approved.count || 0,
      rejected: rejected.count || 0,
      deleted: deleted.count || 0,
    })
  }, [])

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from('images').select('tags').is('deleted_at', null)
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

  const bulkApprove = async () => {
    const ids = [...selected]
    const thumbnails = images.filter(img => ids.includes(img.id)).map(img => img.thumbnail_url || '').filter(Boolean)
    setConfirmAction({ type: 'approve', ids, thumbnails })
  }

  const bulkReject = async () => {
    const ids = [...selected]
    const thumbnails = images.filter(img => ids.includes(img.id)).map(img => img.thumbnail_url || '').filter(Boolean)
    setConfirmAction({ type: 'reject', ids, thumbnails })
  }

  const executeApprove = async (ids: string[]) => {
    const res = await fetch('/api/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status: 'approved', reviewed_by: 'admin' }),
    })
    if (res.ok) {
      setSelected(new Set())
      showToast(`${ids.length} image${ids.length > 1 ? 's' : ''} approved`, 'success')
      fetchImages()
      fetchStats()
    }
  }

  const executeReject = async (ids: string[]) => {
    const res = await fetch('/api/images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (res.ok) {
      setSelected(new Set())
      showToast(`${ids.length} image${ids.length > 1 ? 's' : ''} rejected`, 'warning', {
        label: 'Undo',
        onClick: () => restoreImages(ids),
      })
      fetchImages()
      fetchStats()
      fetchTags()
    }
  }

  const restoreImages = async (ids: string[]) => {
    const res = await fetch('/api/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action: 'restore' }),
    })
    if (res.ok) {
      showToast(`${ids.length} image${ids.length > 1 ? 's' : ''} restored`, 'success')
      fetchImages()
      fetchStats()
      fetchTags()
    }
  }

  const handleConfirm = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'approve') {
      executeApprove(confirmAction.ids)
    } else {
      executeReject(confirmAction.ids)
    }
    setConfirmAction(null)
  }

  const rejectSingleImage = async (id: string) => {
    setModalImage(null)
    executeReject([id])
  }

  const approveSingleImage = async (id: string) => {
    const res = await fetch('/api/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], status: 'approved', reviewed_by: 'admin' }),
    })
    if (res.ok) {
      setModalImage(null)
      showToast('Image approved', 'success')
      fetchImages()
      fetchStats()
    }
  }

  const isTrashView = filters.status === 'deleted'

  return (
    <div className="min-h-screen bg-stone-50">
      <Header variant="admin" page="review" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'bg-stone-100 text-stone-800' },
            { label: 'Pending', value: stats.pending, color: 'bg-amber-50 text-amber-700' },
            { label: 'Approved', value: stats.approved, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Rejected', value: stats.rejected, color: 'bg-stone-100 text-stone-500' },
            { label: 'Trash', value: stats.deleted, color: 'bg-red-50 text-red-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg px-4 py-3 ${s.color}`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm opacity-75">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Upload button */}
        {!showUploader && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowUploader(true)}
              className="bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Images
            </button>
          </div>
        )}

        {/* Image uploader */}
        {showUploader && (
          <ImageUploader
            onComplete={() => {
              fetchImages()
              fetchStats()
              fetchTags()
            }}
            onClose={() => setShowUploader(false)}
          />
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-stone-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="border border-stone-300 rounded-md px-3 py-1.5 text-sm bg-white"
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="pending_approval">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="deleted">Trash</option>
            </select>

            {!isTrashView && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-stone-500">Quality</span>
                  <select
                    value={filters.qualityOp}
                    onChange={e => setFilters(f => ({ ...f, qualityOp: e.target.value as QualityOp }))}
                    className="border border-stone-300 rounded-md px-2 py-1 text-sm bg-white"
                    title="Quality comparison operator"
                  >
                    <option value="gte">at least</option>
                    <option value="eq">exactly</option>
                    <option value="lt">less than</option>
                    <option value="gt">more than</option>
                  </select>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={filters.qualityValue}
                    onChange={e => setFilters(f => ({ ...f, qualityValue: Number(e.target.value) }))}
                    className="w-20"
                  />
                  <span className="text-stone-700 font-medium w-4 text-right">{filters.qualityValue}</span>
                </div>

                <input
                  type="text"
                  placeholder="Search filename or caption..."
                  className="border border-stone-300 rounded-md px-3 py-1.5 text-sm flex-1 min-w-48"
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                />

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
              </>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="bg-stone-800 text-white rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-sm">{selected.size} image{selected.size > 1 ? 's' : ''} selected</span>
            <div className="flex gap-2">
              {isTrashView ? (
                <button
                  onClick={() => restoreImages([...selected])}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-md text-sm font-medium"
                >
                  Restore Selected
                </button>
              ) : (
                <>
                  <button
                    onClick={bulkApprove}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-md text-sm font-medium"
                  >
                    Approve Selected
                  </button>
                  <button
                    onClick={bulkReject}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md text-sm font-medium"
                  >
                    Reject Selected
                  </button>
                </>
              )}
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
            <p className="text-stone-400 text-lg">
              {isTrashView ? 'Trash is empty' : 'No images found'}
            </p>
            <p className="text-stone-300 text-sm mt-1">
              {isTrashView ? 'Rejected images appear here and can be restored' : 'Drop images into your Google Drive _inbox folder'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map(img => (
              <div
                key={img.id}
                className={`group relative bg-white rounded-lg border overflow-hidden cursor-pointer transition ${
                  selected.has(img.id) ? 'border-stone-800 ring-2 ring-stone-800' : 'border-stone-200 hover:border-stone-400'
                } ${isTrashView ? 'opacity-75' : ''}`}
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
                  {isTrashView && img.deleted_at && (
                    <p className="text-[10px] text-red-400 mt-1">
                      Deleted {new Date(img.deleted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalImage && (
        <ImageDetailModal
          image={modalImage}
          isTrashView={isTrashView}
          onClose={() => setModalImage(null)}
          onApprove={() => approveSingleImage(modalImage.id)}
          onReject={() => rejectSingleImage(modalImage.id)}
          onRestore={() => { restoreImages([modalImage.id]); setModalImage(null) }}
          onSaved={() => { fetchImages(); fetchTags() }}
          showToast={showToast}
        />
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.type === 'approve' ? 'Approve Images' : 'Reject Images'}
          message={
            confirmAction.type === 'approve'
              ? `Approve ${confirmAction.ids.length} image${confirmAction.ids.length > 1 ? 's' : ''}? They will be available for portfolios.`
              : `Reject ${confirmAction.ids.length} image${confirmAction.ids.length > 1 ? 's' : ''}? They will move to trash. You can restore them later.`
          }
          confirmLabel={confirmAction.type === 'approve' ? 'Approve' : 'Reject'}
          confirmColor={confirmAction.type === 'approve' ? 'emerald' : 'red'}
          requireType={confirmAction.type === 'reject' && confirmAction.ids.length >= 5 ? 'reject' : undefined}
          thumbnails={confirmAction.thumbnails.slice(0, 12)}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}

// ---- Image Detail Modal with Edit Mode ----

const DEFAULT_FOLDERS = ['bamboo-structures','garden-installations','interior-design','exterior-views','drone-aerial','3d-renders','team-photos','events','marketing-brand','construction-progress','before-after','planters','nursery','landscapes','detail-shots','client-sites','misc']
const DEFAULT_SCENES = ['site-visit','workshop','exhibition','office','outdoor','studio','construction-site','nursery','event-venue','campus','residential','commercial','aerial-view','render-view']

function ImageDetailModal({
  image,
  isTrashView,
  onClose,
  onApprove,
  onReject,
  onRestore,
  onSaved,
  showToast,
}: {
  image: ImageRecord
  isTrashView: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onRestore: () => void
  onSaved: () => void
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editCaption, setEditCaption] = useState(image.ai_caption || '')
  const [editTags, setEditTags] = useState<string[]>(image.tags || [])
  const [editScene, setEditScene] = useState(image.scene || '')
  const [editFolder, setEditFolder] = useState(image.classified_folder || '')
  const [editQuality, setEditQuality] = useState(image.quality_score || 0)
  const [newTag, setNewTag] = useState('')

  // Dynamic taxonomy
  const [allFolders, setAllFolders] = useState<string[]>(DEFAULT_FOLDERS)
  const [allScenes, setAllScenes] = useState<string[]>(DEFAULT_SCENES)
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({})
  const [addingNewFolder, setAddingNewFolder] = useState(false)
  const [addingNewScene, setAddingNewScene] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newSceneName, setNewSceneName] = useState('')

  async function fetchTaxonomy() {
    const res = await fetch('/api/images/taxonomy')
    if (res.ok) {
      const data = await res.json()
      // Merge DB values with defaults (union)
      setAllFolders([...new Set([...DEFAULT_FOLDERS, ...data.folders])].sort())
      setAllScenes([...new Set([...DEFAULT_SCENES, ...data.scenes])].sort())
      setTaxonomy(data.taxonomy || {})
    }
  }

  function startEditing() {
    setEditCaption(image.ai_caption || '')
    setEditTags([...(image.tags || [])])
    setEditScene(image.scene || '')
    setEditFolder(image.classified_folder || '')
    setEditQuality(image.quality_score || 0)
    setAddingNewFolder(false)
    setAddingNewScene(false)
    setEditing(true)
    fetchTaxonomy()
  }

  function addTag() {
    const tag = sanitizeLabel(newTag, LIMITS.tag)
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag])
    }
    setNewTag('')
  }

  function removeTag(tag: string) {
    setEditTags(editTags.filter(t => t !== tag))
  }

  function addNewFolder() {
    const name = sanitizeLabel(newFolderName, LIMITS.folder)
    if (name) {
      if (!allFolders.includes(name)) {
        setAllFolders(prev => [...prev, name].sort())
      }
      setEditFolder(name)
      setAddingNewFolder(false)
      setNewFolderName('')
    }
  }

  function addNewScene() {
    const name = sanitizeLabel(newSceneName, LIMITS.scene)
    if (name) {
      if (!allScenes.includes(name)) {
        setAllScenes(prev => [...prev, name].sort())
      }
      setEditScene(name)
      setAddingNewScene(false)
      setNewSceneName('')
    }
  }

  // Get scenes relevant to the selected folder (shown first), then the rest
  function getScenesForFolder(): { related: string[]; other: string[] } {
    const related = taxonomy[editFolder] || []
    const other = allScenes.filter(s => !related.includes(s))
    return { related, other }
  }

  async function saveDetails() {
    setSaving(true)
    const res = await fetch('/api/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: [image.id],
        action: 'update_details',
        id: image.id,
        details: {
          ai_caption: editCaption,
          tags: editTags,
          scene: editScene,
          classified_folder: editFolder,
          quality_score: editQuality,
        },
      }),
    })
    setSaving(false)
    if (res.ok) {
      showToast('Details saved', 'success')
      setEditing(false)
      onSaved()
      onClose()
    } else {
      showToast('Failed to save', 'error')
    }
  }

  const { related: relatedScenes, other: otherScenes } = getScenesForFolder()

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image preview */}
          <div className="bg-stone-100 flex items-center justify-center min-h-80">
            {image.cdn_url ? (
              <img
                src={image.cdn_url}
                alt={image.ai_caption || image.filename}
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
              <div className="flex items-center gap-2">
                {!editing && !isTrashView && (
                  <button
                    onClick={startEditing}
                    className="text-xs text-stone-500 hover:text-stone-800 border border-stone-300 rounded px-2 py-1"
                  >
                    Edit Details
                  </button>
                )}
                <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl">
                  x
                </button>
              </div>
            </div>

            {editing ? (
              /* ---- EDIT MODE ---- */
              <div className="space-y-4">
                {/* Tags */}
                <div>
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {editTags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-stone-100 text-stone-600 rounded-md text-sm flex items-center gap-1"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-stone-400 hover:text-red-500 ml-0.5"
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                      placeholder={`Add a tag... (max ${LIMITS.tag} chars, no spaces)`}
                      maxLength={LIMITS.tag}
                      className="flex-1 border border-stone-300 rounded-md px-2 py-1 text-sm"
                    />
                    <button
                      onClick={addTag}
                      disabled={!newTag.trim()}
                      className="px-2 py-1 bg-stone-800 text-white rounded-md text-sm disabled:bg-stone-300"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Caption */}
                <div>
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Caption</h3>
                  <textarea
                    value={editCaption}
                    onChange={e => setEditCaption(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm resize-none"
                    rows={3}
                  />
                </div>

                {/* Quality */}
                <div>
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                    Quality Score: {editQuality.toFixed(1)}/10
                  </h3>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={editQuality}
                    onChange={e => setEditQuality(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Folder (Level 1) */}
                <div>
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                    Folder <span className="text-stone-300 normal-case">(Level 1 — category)</span>
                  </h3>
                  {addingNewFolder ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewFolder() } }}
                        placeholder={`new-folder-name (max ${LIMITS.folder} chars)`}
                        maxLength={LIMITS.folder}
                        className="flex-1 border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                        autoFocus
                      />
                      <button onClick={addNewFolder} disabled={!newFolderName.trim()} className="px-2 py-1 bg-stone-800 text-white rounded-md text-sm disabled:bg-stone-300">Add</button>
                      <button onClick={() => setAddingNewFolder(false)} className="px-2 py-1 text-sm text-stone-500 border border-stone-300 rounded-md">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <select
                        value={editFolder}
                        onChange={e => setEditFolder(e.target.value)}
                        className="flex-1 border border-stone-300 rounded-md px-3 py-1.5 text-sm bg-white"
                      >
                        {allFolders.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setAddingNewFolder(true)}
                        className="px-2 py-1 text-xs text-stone-500 border border-stone-300 rounded-md hover:bg-stone-50 whitespace-nowrap"
                      >
                        + New
                      </button>
                    </div>
                  )}
                </div>

                {/* Scene (Level 2 — filtered by folder) */}
                <div>
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                    Scene <span className="text-stone-300 normal-case">(Level 2 — context)</span>
                  </h3>
                  {addingNewScene ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newSceneName}
                        onChange={e => setNewSceneName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewScene() } }}
                        placeholder={`new-scene-name (max ${LIMITS.scene} chars)`}
                        maxLength={LIMITS.scene}
                        className="flex-1 border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                        autoFocus
                      />
                      <button onClick={addNewScene} disabled={!newSceneName.trim()} className="px-2 py-1 bg-stone-800 text-white rounded-md text-sm disabled:bg-stone-300">Add</button>
                      <button onClick={() => setAddingNewScene(false)} className="px-2 py-1 text-sm text-stone-500 border border-stone-300 rounded-md">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <select
                        value={editScene}
                        onChange={e => setEditScene(e.target.value)}
                        className="flex-1 border border-stone-300 rounded-md px-3 py-1.5 text-sm bg-white"
                      >
                        {relatedScenes.length > 0 && (
                          <optgroup label={`Used with ${editFolder}`}>
                            {relatedScenes.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label={relatedScenes.length > 0 ? 'All scenes' : 'Scenes'}>
                          {otherScenes.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </optgroup>
                      </select>
                      <button
                        onClick={() => setAddingNewScene(true)}
                        className="px-2 py-1 text-xs text-stone-500 border border-stone-300 rounded-md hover:bg-stone-50 whitespace-nowrap"
                      >
                        + New
                      </button>
                    </div>
                  )}
                </div>

                {/* Non-editable info */}
                <div className="text-xs text-stone-400 pt-2 border-t border-stone-100">
                  {image.width} x {image.height} | {image.filename} | {image.status}
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={saveDetails}
                    disabled={saving}
                    className="flex-1 bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 text-white py-2 rounded-md text-sm font-medium"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded-md hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ---- VIEW MODE ---- */
              <>
                {/* Tags */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {(image.tags || []).map(tag => (
                      <span key={tag} className="px-2 py-1 bg-stone-100 text-stone-600 rounded-md text-sm">
                        {tag}
                      </span>
                    ))}
                    {(!image.tags || image.tags.length === 0) && (
                      <span className="text-sm text-stone-400">No tags</span>
                    )}
                  </div>
                </div>

                {/* Caption */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Caption</h3>
                  <p className="text-sm text-stone-700">{image.ai_caption || 'No caption'}</p>
                </div>

                {/* Metadata */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Metadata</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-stone-400">Quality:</span>{' '}
                      <span className="font-medium">{image.quality_score?.toFixed(1)}/10</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Size:</span>{' '}
                      <span className="font-medium">{image.width} x {image.height}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Folder:</span>{' '}
                      <span className="font-medium">{image.classified_folder}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Scene:</span>{' '}
                      <span className="font-medium">{image.scene}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">File:</span>{' '}
                      <span className="font-medium truncate">{image.filename}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Status:</span>{' '}
                      <span className="font-medium">{image.status}</span>
                    </div>
                  </div>
                </div>

                {/* Colors */}
                {image.dominant_colors && image.dominant_colors.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Colors</h3>
                    <div className="flex gap-2">
                      {image.dominant_colors.map((color, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="w-6 h-6 rounded border border-stone-200" style={{ backgroundColor: color }} />
                          <span className="text-xs text-stone-400">{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-stone-200">
                  {isTrashView ? (
                    <button
                      onClick={onRestore}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md text-sm font-medium"
                    >
                      Restore
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={onApprove}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md text-sm font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={onReject}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm font-medium"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
