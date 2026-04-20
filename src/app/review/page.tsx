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
  folders: string[]
  scenes: string[]
  qualityOp: QualityOp
  qualityValue: number
  search: string
}

type BulkEditField = 'quality' | 'folder' | 'scene' | null

const filterLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  minWidth: 60,
}

const selectStyle: React.CSSProperties = {
  background: 'var(--sand)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 13,
  color: 'var(--ink)',
  fontFamily: 'inherit',
}

function chipStyle(active: boolean, kind: 'folder' | 'scene' | 'tag'): React.CSSProperties {
  const activeBg = kind === 'scene' ? 'var(--leaf)' : kind === 'tag' ? 'var(--accent)' : 'var(--ink)'
  const activeColor = kind === 'folder' ? 'var(--paper)' : '#fff'
  return {
    background: active ? activeBg : 'var(--sand)',
    border: `1px solid ${active ? activeBg : 'transparent'}`,
    borderRadius: 999,
    padding: '4px 11px',
    fontSize: 12,
    color: active ? activeColor : 'var(--ink-soft)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    lineHeight: 1.4,
  }
}

function darkBarBtn(kind: 'accent' | 'danger' | 'ghost'): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 500,
    padding: '9px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    lineHeight: 1.2,
  }
  if (kind === 'accent') {
    return { ...base, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }
  }
  if (kind === 'danger') {
    return { ...base, background: 'transparent', color: 'var(--paper)', border: '1px solid rgba(247,241,227,0.25)' }
  }
  return { ...base, background: 'transparent', color: 'var(--paper)', border: '1px solid rgba(247,241,227,0.2)' }
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#fff',
  border: '1px solid var(--line)',
  borderBottomWidth: 2,
  padding: '2px 7px',
  borderRadius: 4,
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: 'var(--ink)',
  margin: '0 4px',
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
    folders: [],
    scenes: [],
    qualityOp: 'gte',
    qualityValue: 0,
    search: '',
  })
  const [allTags, setAllTags] = useState<string[]>([])
  const [allFolders, setAllFolders] = useState<string[]>([])
  const [allScenes, setAllScenes] = useState<string[]>([])
  const [bulkEdit, setBulkEdit] = useState<BulkEditField>(null)
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
    if (filters.folders.length > 0) {
      query = query.in('classified_folder', filters.folders)
    }
    if (filters.scenes.length > 0) {
      query = query.in('scene', filters.scenes)
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

  const fetchTaxonomy = useCallback(async () => {
    const res = await fetch('/api/images/taxonomy')
    if (!res.ok) return
    const json = await res.json()
    setAllTags(json.tags || [])
    setAllFolders(json.folders || [])
    setAllScenes(json.scenes || [])
  }, [])

  useEffect(() => {
    fetchImages()
    fetchStats()
    fetchTaxonomy()
  }, [fetchImages, fetchStats, fetchTaxonomy])

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
      fetchTaxonomy()
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
      fetchTaxonomy()
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

  const statsCells: Array<{ label: string; value: number; tone?: 'pending' | 'approved' | 'rejected' | 'trash' }> = [
    { label: 'Total', value: stats.total },
    { label: 'Pending', value: stats.pending, tone: 'pending' },
    { label: 'Approved', value: stats.approved, tone: 'approved' },
    { label: 'Rejected', value: stats.rejected, tone: 'rejected' },
    { label: 'Trash', value: stats.deleted, tone: 'trash' },
  ]

  const toneColor = (tone?: string) => {
    if (tone === 'pending') return 'var(--warn)'
    if (tone === 'approved') return 'var(--leaf)'
    if (tone === 'rejected') return 'var(--muted)'
    if (tone === 'trash') return 'var(--danger)'
    return 'var(--ink)'
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <Header variant="admin" page="review" />

      <div className="mx-auto px-7 py-7" style={{ maxWidth: 1360 }}>
        {/* Page head */}
        <div className="flex items-end justify-between mb-6 gap-8">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Library · {stats.total} image{stats.total === 1 ? '' : 's'}
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 40, lineHeight: 1.05, letterSpacing: '-0.01em', margin: '4px 0 0' }}>
              Today&apos;s <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
                {isTrashView ? 'trash' : filters.status === 'approved' ? 'approved' : 'pending'}
              </em> review.
            </h1>
            <p style={{ color: 'var(--muted)', maxWidth: 540, marginTop: 6, fontSize: 14 }}>
              {stats.pending} image{stats.pending === 1 ? '' : 's'} waiting for your eye. Approve the keepers, skip the rest.
            </p>
          </div>
          <div className="flex gap-[10px]">
            {!showUploader && (
              <button
                onClick={() => setShowUploader(true)}
                className="inline-flex items-center gap-2 cursor-pointer transition-all"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)' }}
              >
                ＋ Upload images
              </button>
            )}
          </div>
        </div>

        {/* Image uploader */}
        {showUploader && (
          <div className="mb-4">
            <ImageUploader
              onComplete={() => {
                fetchImages()
                fetchStats()
                fetchTaxonomy()
              }}
              onClose={() => setShowUploader(false)}
            />
          </div>
        )}

        {/* Stat strip */}
        <div
          className="grid grid-cols-5 mb-6 overflow-hidden"
          style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14 }}
        >
          {statsCells.map((s, i) => (
            <div
              key={s.label}
              className="px-6 py-[18px]"
              style={{ borderRight: i < statsCells.length - 1 ? '1px solid var(--line-soft)' : 'none' }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {s.label}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 34, lineHeight: 1, marginTop: 6, color: toneColor(s.tone) }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-5" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 20px' }}>
          {/* Row 1: show / quality / search */}
          <div className="flex items-center gap-3 py-[6px] flex-wrap">
            <span style={filterLabelStyle}>Show</span>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              style={selectStyle}
            >
              <option value="all">All</option>
              <option value="pending_approval">Pending review</option>
              <option value="approved">Approved</option>
              <option value="deleted">Trash</option>
            </select>

            {!isTrashView && (
              <>
                <div className="flex items-center gap-[10px]">
                  <span style={{ ...filterLabelStyle, minWidth: 'auto' }}>Quality</span>
                  <select
                    value={filters.qualityOp}
                    onChange={e => setFilters(f => ({ ...f, qualityOp: e.target.value as QualityOp }))}
                    style={selectStyle}
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
                    className="a-range"
                    style={{ width: 140, background: 'var(--line)', height: 2, borderRadius: 2, WebkitAppearance: 'none', appearance: 'none' }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', minWidth: 20 }}>
                    {filters.qualityValue}
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Search filename, caption, tag…"
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                  style={{ flex: 1, background: 'var(--sand)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)', minWidth: 200 }}
                />
              </>
            )}
          </div>

          {/* Folders chips */}
          {!isTrashView && allFolders.length > 0 && (
            <div className="flex items-start gap-3 pt-3 mt-[6px]" style={{ borderTop: '1px dashed var(--line-soft)' }}>
              <span style={{ ...filterLabelStyle, paddingTop: 6 }}>Folders</span>
              <div className="flex flex-wrap gap-[6px]">
                {allFolders.map(folder => (
                  <button
                    key={folder}
                    onClick={() =>
                      setFilters(f => ({
                        ...f,
                        folders: f.folders.includes(folder)
                          ? f.folders.filter(x => x !== folder)
                          : [...f.folders, folder],
                      }))
                    }
                    style={chipStyle(filters.folders.includes(folder), 'folder')}
                  >
                    {folder}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scenes chips */}
          {!isTrashView && allScenes.length > 0 && (
            <div className="flex items-start gap-3 pt-3 mt-[6px]" style={{ borderTop: '1px dashed var(--line-soft)' }}>
              <span style={{ ...filterLabelStyle, paddingTop: 6 }}>Scenes</span>
              <div className="flex flex-wrap gap-[6px]">
                {allScenes.map(scene => (
                  <button
                    key={scene}
                    onClick={() =>
                      setFilters(f => ({
                        ...f,
                        scenes: f.scenes.includes(scene)
                          ? f.scenes.filter(x => x !== scene)
                          : [...f.scenes, scene],
                      }))
                    }
                    style={chipStyle(filters.scenes.includes(scene), 'scene')}
                  >
                    {scene}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags chips */}
          {!isTrashView && allTags.length > 0 && (
            <div className="flex items-start gap-3 pt-3 mt-[6px]" style={{ borderTop: '1px dashed var(--line-soft)' }}>
              <span style={{ ...filterLabelStyle, paddingTop: 6 }}>Tags</span>
              <div className="flex flex-wrap gap-[6px]">
                {allTags.slice(0, 20).map(tag => (
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
                    style={chipStyle(filters.tags.includes(tag), 'tag')}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isTrashView && (filters.folders.length > 0 || filters.scenes.length > 0 || filters.tags.length > 0) && (
            <div className="pt-3 mt-[6px]">
              <button
                onClick={() => setFilters(f => ({ ...f, folders: [], scenes: [], tags: [] }))}
                style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'underline', background: 'transparent', border: 0, cursor: 'pointer' }}
              >
                Clear chip filters
              </button>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div
            className="sticky flex items-center justify-between mb-[14px]"
            style={{ top: 68, background: 'var(--ink)', color: 'var(--paper)', borderRadius: 14, padding: '12px 18px', zIndex: 10, boxShadow: '0 6px 20px -6px rgba(0,0,0,0.35)' }}
          >
            <div className="flex items-center gap-[14px]">
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>
                {selected.size} selected
              </span>
            </div>
            <div className="flex gap-2">
              {isTrashView ? (
                <button
                  onClick={() => restoreImages([...selected])}
                  style={darkBarBtn('accent')}
                >
                  ✓ Restore selected
                </button>
              ) : (
                <>
                  <button onClick={bulkApprove} style={darkBarBtn('accent')}>
                    ✓ Approve
                  </button>
                  <button onClick={bulkReject} style={darkBarBtn('danger')}>
                    ✕ Reject
                  </button>
                  <button onClick={() => setBulkEdit('quality')} style={darkBarBtn('ghost')}>
                    Set quality
                  </button>
                  <button onClick={() => setBulkEdit('folder')} style={darkBarBtn('ghost')}>
                    Change folder
                  </button>
                  <button onClick={() => setBulkEdit('scene')} style={darkBarBtn('ghost')}>
                    Change scene
                  </button>
                </>
              )}
              <button
                onClick={() => setSelected(new Set())}
                style={{ background: 'transparent', color: 'var(--paper)', opacity: 0.6, padding: '6px 10px', fontSize: 13, border: 0, cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Select All / Count row */}
        <div className="flex items-center justify-between mt-2 mb-[14px] mx-[2px]">
          <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: 'var(--muted)' }}>
            <input
              type="checkbox"
              checked={selected.size === images.length && images.length > 0}
              onChange={selectAll}
            />
            Select all on page
          </label>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {images.length} image{images.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Image Grid */}
        {loading ? (
          <div className="text-center py-20" style={{ color: 'var(--muted)' }}>Loading images...</div>
        ) : images.length === 0 ? (
          <div className="text-center py-20">
            <p style={{ color: 'var(--muted)', fontSize: 18 }}>
              {isTrashView ? 'Trash is empty' : 'No images found'}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4, opacity: 0.7 }}>
              {isTrashView ? 'Rejected images appear here and can be restored' : 'Upload images or adjust your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[14px]">
            {images.map(img => {
              const isSel = selected.has(img.id)
              return (
                <div
                  key={img.id}
                  className="group relative overflow-hidden cursor-pointer transition-all"
                  style={{
                    background: '#fff',
                    border: `1px solid ${isSel ? 'var(--accent)' : 'var(--line)'}`,
                    borderRadius: 10,
                    boxShadow: isSel ? '0 0 0 3px var(--accent-soft)' : undefined,
                    opacity: isTrashView ? 0.75 : 1,
                  }}
                >
                  {/* Image area */}
                  <div
                    className="relative overflow-hidden"
                    style={{ aspectRatio: '4/3', background: 'var(--sand-2)' }}
                    onClick={() => setModalImage(img)}
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
                        className="flex items-center justify-center"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          background: isSel ? 'var(--accent)' : 'rgba(255,255,255,0.92)',
                          border: `1px solid ${isSel ? 'var(--accent)' : 'var(--line)'}`,
                          color: isSel ? '#fff' : 'var(--muted)',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {isSel ? '✓' : ''}
                      </div>
                    </div>

                    {/* Quality badge */}
                    {img.quality_score !== null && img.quality_score !== undefined && (
                      <div
                        className="absolute top-2 right-2 z-10"
                        style={{
                          background: 'rgba(31, 29, 24, 0.78)',
                          color: '#fff',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 7px',
                          borderRadius: 4,
                        }}
                      >
                        {img.quality_score.toFixed(1)}
                      </div>
                    )}

                    {img.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.thumbnail_url}
                        alt={img.ai_caption || img.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--muted)', fontSize: 28 }}>
                        ?
                      </div>
                    )}
                  </div>

                  {/* Meta: folder + scene */}
                  <div className="flex items-center justify-between gap-2" style={{ padding: '10px 12px' }}>
                    <span
                      className="truncate"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}
                    >
                      {img.classified_folder || '—'}
                    </span>
                    <span
                      style={{ fontSize: 11, color: 'var(--leaf)', fontWeight: 500, flexShrink: 0 }}
                    >
                      {img.scene || ''}
                    </span>
                  </div>

                  {isTrashView && img.deleted_at && (
                    <div className="px-3 pb-2" style={{ fontSize: 10, color: 'var(--danger)' }}>
                      Deleted {new Date(img.deleted_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Keyboard hint footer */}
        {!loading && images.length > 0 && !isTrashView && (
          <div className="flex justify-center gap-[18px] items-center pt-5" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--muted)' }}>
            <span><kbd style={kbdStyle}>E</kbd> edit details</span>
            <span><kbd style={kbdStyle}>A</kbd> approve</span>
            <span><kbd style={kbdStyle}>R</kbd> reject</span>
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
          onSaved={() => { fetchImages(); fetchTaxonomy() }}
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

      {/* Bulk Edit Modal */}
      {bulkEdit && (
        <BulkEditModal
          field={bulkEdit}
          selectedCount={selected.size}
          allFolders={allFolders}
          allScenes={allScenes}
          onClose={() => setBulkEdit(null)}
          onApply={async (details) => {
            const ids = [...selected]
            const res = await fetch('/api/images', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids, action: 'update_details', details }),
            })
            if (res.ok) {
              const result = await res.json()
              showToast(`Updated ${result.updated || ids.length} image${ids.length > 1 ? 's' : ''}`, 'success')
              setBulkEdit(null)
              setSelected(new Set())
              fetchImages()
              fetchTaxonomy()
            } else {
              const err = await res.json()
              showToast(err.error || 'Bulk update failed', 'error')
            }
          }}
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

interface BulkEditModalProps {
  field: 'quality' | 'folder' | 'scene'
  selectedCount: number
  allFolders: string[]
  allScenes: string[]
  onClose: () => void
  onApply: (details: Record<string, unknown>) => Promise<void>
}

function BulkEditModal({ field, selectedCount, allFolders, allScenes, onClose, onApply }: BulkEditModalProps) {
  const [quality, setQuality] = useState(5)
  const [folder, setFolder] = useState('')
  const [scene, setScene] = useState('')
  const [newFolder, setNewFolder] = useState('')
  const [newScene, setNewScene] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleApply() {
    setSaving(true)
    if (field === 'quality') {
      await onApply({ quality_score: quality })
    } else if (field === 'folder') {
      const value = addingNew ? sanitizeLabel(newFolder, LIMITS.folder) : folder
      if (!value) { setSaving(false); return }
      await onApply({ classified_folder: value })
    } else {
      const value = addingNew ? sanitizeLabel(newScene, LIMITS.scene) : scene
      if (!value) { setSaving(false); return }
      await onApply({ scene: value })
    }
    setSaving(false)
  }

  const title = field === 'quality' ? 'Set Quality Score' : field === 'folder' ? 'Set Folder' : 'Set Scene'
  const helpText = `This will apply the same value to all ${selectedCount} selected image${selectedCount > 1 ? 's' : ''}, overwriting any existing value.`

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-stone-800 mb-1">{title}</h3>
          <p className="text-xs text-stone-500 mb-4">{helpText}</p>

          {field === 'quality' && (
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={quality}
                  onChange={e => setQuality(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-stone-900 w-10 text-right">{quality}</span>
                <span className="text-xs text-stone-500">/ 10</span>
              </div>
            </div>
          )}

          {field === 'folder' && (
            <div className="mb-4">
              {!addingNew && (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-3 max-h-40 overflow-y-auto">
                    {allFolders.map(f => (
                      <button
                        key={f}
                        onClick={() => setFolder(f)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition ${
                          folder === f
                            ? 'bg-stone-800 text-white border-stone-800'
                            : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                    {allFolders.length === 0 && (
                      <span className="text-xs text-stone-400">No folders yet.</span>
                    )}
                  </div>
                  <button onClick={() => setAddingNew(true)} className="text-xs text-stone-600 hover:text-stone-900 underline">
                    + Add new folder
                  </button>
                </>
              )}
              {addingNew && (
                <div>
                  <input
                    type="text"
                    value={newFolder}
                    onChange={e => setNewFolder(e.target.value.slice(0, LIMITS.folder))}
                    placeholder="new-folder-name"
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm mb-1"
                    autoFocus
                    maxLength={LIMITS.folder}
                  />
                  <p className="text-xs text-stone-400 mb-2">Lowercase, hyphens only. Max {LIMITS.folder} chars.</p>
                  <button onClick={() => setAddingNew(false)} className="text-xs text-stone-500 hover:text-stone-800 underline">
                    Pick existing instead
                  </button>
                </div>
              )}
            </div>
          )}

          {field === 'scene' && (
            <div className="mb-4">
              {!addingNew && (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-3 max-h-40 overflow-y-auto">
                    {allScenes.map(s => (
                      <button
                        key={s}
                        onClick={() => setScene(s)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition ${
                          scene === s
                            ? 'bg-stone-800 text-white border-stone-800'
                            : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                    {allScenes.length === 0 && (
                      <span className="text-xs text-stone-400">No scenes yet.</span>
                    )}
                  </div>
                  <button onClick={() => setAddingNew(true)} className="text-xs text-stone-600 hover:text-stone-900 underline">
                    + Add new scene
                  </button>
                </>
              )}
              {addingNew && (
                <div>
                  <input
                    type="text"
                    value={newScene}
                    onChange={e => setNewScene(e.target.value.slice(0, LIMITS.scene))}
                    placeholder="new-scene-name"
                    className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm mb-1"
                    autoFocus
                    maxLength={LIMITS.scene}
                  />
                  <p className="text-xs text-stone-400 mb-2">Lowercase, hyphens only. Max {LIMITS.scene} chars.</p>
                  <button onClick={() => setAddingNew(false)} className="text-xs text-stone-500 hover:text-stone-800 underline">
                    Pick existing instead
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 rounded-md border border-stone-300"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={
                saving ||
                (field === 'folder' && !addingNew && !folder) ||
                (field === 'folder' && addingNew && !newFolder.trim()) ||
                (field === 'scene' && !addingNew && !scene) ||
                (field === 'scene' && addingNew && !newScene.trim())
              }
              className="px-4 py-2 text-sm text-white rounded-md font-medium bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300"
            >
              {saving ? 'Applying...' : `Apply to ${selectedCount}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
