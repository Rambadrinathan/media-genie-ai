'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminGate } from '@/components/AdminGate'
import { Header } from '@/components/Header'
import { useToast } from '@/components/Toast'
import { ConfirmModal } from '@/components/ConfirmModal'
import { sanitizeLabel, LIMITS } from '@/lib/validation'

export default function SettingsPage() {
  return (
    <AdminGate>
      <SettingsContent />
    </AdminGate>
  )
}

type TaxonomyType = 'folder' | 'scene'

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '12px 20px',
    fontFamily: 'var(--font-serif)',
    fontSize: 18,
    fontStyle: 'italic',
    color: active ? 'var(--ink)' : 'var(--muted)',
    cursor: 'pointer',
    borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
    background: 'transparent',
    marginBottom: -1,
  }
}

const tabCount: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  marginLeft: 6,
  color: 'var(--muted)',
  fontStyle: 'normal',
}

const ghostBtn: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 500,
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--ink)',
  cursor: 'pointer',
}

const dangerBtn: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 500,
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--danger)',
  cursor: 'pointer',
}

type TaxonomyData = {
  folders: string[]
  scenes: string[]
  folderCounts: Record<string, number>
  sceneCounts: Record<string, number>
}

function SettingsContent() {
  const { showToast } = useToast()
  const [data, setData] = useState<TaxonomyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TaxonomyType>('folder')
  const [renaming, setRenaming] = useState<{ type: TaxonomyType; oldName: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleting, setDeleting] = useState<{ type: TaxonomyType; name: string; count: number } | null>(null)

  const fetchTaxonomy = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/images/taxonomy?counts=true')
    const json = await res.json()
    setData({
      folders: json.folders || [],
      scenes: json.scenes || [],
      folderCounts: json.folderCounts || {},
      sceneCounts: json.sceneCounts || {},
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTaxonomy()
  }, [fetchTaxonomy])

  async function handleRename() {
    if (!renaming) return
    const limit = renaming.type === 'folder' ? LIMITS.folder : LIMITS.scene
    const sanitized = sanitizeLabel(renameValue, limit)
    if (!sanitized) {
      showToast('Name cannot be empty', 'error')
      return
    }
    if (sanitized === renaming.oldName) {
      setRenaming(null)
      return
    }

    const res = await fetch('/api/images/taxonomy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: renaming.type,
        oldName: renaming.oldName,
        newName: sanitized,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      showToast(err.error || 'Rename failed', 'error')
      return
    }

    const result = await res.json()
    showToast(`Renamed: ${result.renamed} image(s) updated`, 'success')
    setRenaming(null)
    setRenameValue('')
    fetchTaxonomy()
  }

  async function handleDelete() {
    if (!deleting) return

    const res = await fetch('/api/images/taxonomy', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: deleting.type, name: deleting.name }),
    })

    if (!res.ok) {
      const err = await res.json()
      showToast(err.error || 'Delete failed', 'error')
      return
    }

    const result = await res.json()
    showToast(`Removed ${deleting.type}: ${result.cleared} image(s) un-labeled`, 'success')
    setDeleting(null)
    fetchTaxonomy()
  }

  const items = tab === 'folder'
    ? data?.folders.map(name => ({ name, count: data.folderCounts[name] || 0 }))
    : data?.scenes.map(name => ({ name, count: data.sceneCounts[name] || 0 }))

  const totalImagesCount = (data?.folders.reduce((acc, f) => acc + (data.folderCounts[f] || 0), 0)) || 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <Header variant="admin" page="settings" />

      <main className="mx-auto px-7 py-7" style={{ maxWidth: 1100 }}>
        {/* Page head */}
        <div className="flex items-end justify-between mb-6 gap-8">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Library · {totalImagesCount} image{totalImagesCount === 1 ? '' : 's'} · {data?.folders.length || 0} folder{data?.folders.length === 1 ? '' : 's'} · {data?.scenes.length || 0} scene{data?.scenes.length === 1 ? '' : 's'}
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 40, lineHeight: 1.05, letterSpacing: '-0.01em', margin: '4px 0 0' }}>
              Taxonomy &amp; <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>workspace</em>.
            </h1>
            <p style={{ color: 'var(--muted)', maxWidth: 620, marginTop: 6, fontSize: 14 }}>
              Folders are the top-level category (project, client). Scenes are the context within (aerial-view, exhibition). Edit either here and every image updates.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-[2px]" style={{ borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
          <button
            onClick={() => setTab('folder')}
            style={tabStyle(tab === 'folder')}
          >
            Folders {data && <span style={tabCount}>{data.folders.length}</span>}
          </button>
          <button
            onClick={() => setTab('scene')}
            style={tabStyle(tab === 'scene')}
          >
            Scenes {data && <span style={tabCount}>{data.scenes.length}</span>}
          </button>
        </div>

        {/* Help text */}
        <div className="px-1 pt-4 pb-5" style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 680, lineHeight: 1.55 }}>
          {tab === 'folder'
            ? 'Rename updates every image using that folder. Delete clears the label — the images themselves stay untouched.'
            : 'Rename updates every image using that scene. Delete clears the label — the images themselves stay untouched.'}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-8" style={{ color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
        ) : !items || items.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--muted)', fontSize: 13 }}>
            No {tab === 'folder' ? 'folders' : 'scenes'} yet. They&apos;ll appear here as you classify images.
          </div>
        ) : (
          <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
            {items.map((item, i) => (
              <div
                key={item.name}
                className="grid items-center gap-4 px-4 py-[14px]"
                style={{
                  gridTemplateColumns: '1fr auto auto',
                  background: '#fff',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                }}
              >
                <div className="flex items-baseline gap-3 min-w-0">
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink)' }} className="truncate">
                    {item.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      background: 'var(--sand)',
                      padding: '3px 8px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.count} {item.count === 1 ? 'image' : 'images'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setRenaming({ type: tab, oldName: item.name })
                    setRenameValue(item.name)
                  }}
                  style={ghostBtn}
                >
                  Rename
                </button>
                <button
                  onClick={() => setDeleting({ type: tab, name: item.name, count: item.count })}
                  style={dangerBtn}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4" style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.55, opacity: 0.8 }}>
          Note: folders and scenes are derived from your images — there are no standalone records. Adding a new folder or scene happens inline from an image&apos;s Edit Details screen.
        </p>
      </main>

      {/* Rename modal */}
      {renaming && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4" onClick={() => setRenaming(null)}>
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-stone-800 mb-2">
                Rename {renaming.type}
              </h3>
              <p className="text-sm text-stone-600 mb-4">
                Rename <span className="font-mono font-semibold text-stone-800">{renaming.oldName}</span>.
                Every image using this {renaming.type} will be updated.
              </p>
              <input
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value.slice(0, renaming.type === 'folder' ? LIMITS.folder : LIMITS.scene))}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm mb-2"
                autoFocus
                maxLength={renaming.type === 'folder' ? LIMITS.folder : LIMITS.scene}
              />
              <p className="text-xs text-stone-400 mb-4">
                Lowercase letters, numbers, and hyphens only. Max {renaming.type === 'folder' ? LIMITS.folder : LIMITS.scene} chars.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRenaming(null)}
                  className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 rounded-md border border-stone-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRename}
                  className="px-4 py-2 text-sm text-white rounded-md font-medium bg-stone-800 hover:bg-stone-900"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleting && (
        <ConfirmModal
          title={`Delete ${deleting.type} "${deleting.name}"?`}
          message={
            deleting.count === 0
              ? `No images currently use this ${deleting.type}. Safe to remove.`
              : `${deleting.count} image${deleting.count === 1 ? '' : 's'} currently labeled "${deleting.name}" will have their ${deleting.type} cleared. The images themselves are not deleted — only the ${deleting.type} label is removed. This cannot be undone.`
          }
          confirmLabel="Delete"
          confirmColor="red"
          requireType={deleting.count >= 5 ? 'delete' : undefined}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
