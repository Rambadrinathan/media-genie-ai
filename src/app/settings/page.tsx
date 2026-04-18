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

  return (
    <div className="min-h-screen bg-stone-50">
      <Header variant="admin" page="settings" />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-stone-900">Settings</h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage folders and scenes used across your image library.
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-stone-200">
            <button
              onClick={() => setTab('folder')}
              className={`px-5 py-3 text-sm font-medium transition ${
                tab === 'folder'
                  ? 'text-stone-900 border-b-2 border-stone-900'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Folders {data && <span className="text-xs text-stone-400 ml-1">({data.folders.length})</span>}
            </button>
            <button
              onClick={() => setTab('scene')}
              className={`px-5 py-3 text-sm font-medium transition ${
                tab === 'scene'
                  ? 'text-stone-900 border-b-2 border-stone-900'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Scenes {data && <span className="text-xs text-stone-400 ml-1">({data.scenes.length})</span>}
            </button>
          </div>

          {/* Help text */}
          <div className="px-5 py-3 bg-stone-50 border-b border-stone-200 text-xs text-stone-600">
            {tab === 'folder'
              ? 'Folders are the top-level category for each image (e.g. "projects", "clients"). Renaming updates every image using that folder. Deleting clears the folder label from all images — the images themselves are untouched.'
              : 'Scenes describe the context within a folder (e.g. "exterior", "closeup"). Renaming updates every image using that scene. Deleting clears the scene label from all images — the images themselves are untouched.'}
          </div>

          {/* List */}
          <div>
            {loading && (
              <div className="px-5 py-8 text-center text-sm text-stone-500">Loading...</div>
            )}

            {!loading && (!items || items.length === 0) && (
              <div className="px-5 py-8 text-center text-sm text-stone-500">
                No {tab === 'folder' ? 'folders' : 'scenes'} yet. They'll appear here as you classify images.
              </div>
            )}

            {!loading && items && items.length > 0 && (
              <ul className="divide-y divide-stone-100">
                {items.map(item => (
                  <li key={item.name} className="flex items-center justify-between px-5 py-3 hover:bg-stone-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-medium text-stone-900 truncate">{item.name}</span>
                      <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                        {item.count} {item.count === 1 ? 'image' : 'images'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRenaming({ type: tab, oldName: item.name })
                          setRenameValue(item.name)
                        }}
                        className="text-xs text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-400 rounded px-2.5 py-1"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => setDeleting({ type: tab, name: item.name, count: item.count })}
                        className="text-xs text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded px-2.5 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p className="text-xs text-stone-400 mt-4 leading-relaxed">
          Note: folders and scenes are derived from your images &mdash; there are no standalone records. Adding a new folder or scene happens inline from an image&apos;s Edit Details screen.
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
