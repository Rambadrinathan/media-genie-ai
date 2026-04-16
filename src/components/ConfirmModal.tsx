'use client'

import { useState } from 'react'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  confirmColor?: 'red' | 'emerald' | 'stone'
  requireType?: string // If set, user must type this to confirm
  thumbnails?: string[] // Optional image thumbnails to show
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  confirmColor = 'red',
  requireType,
  thumbnails,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState('')

  const canConfirm = requireType ? typed.toLowerCase() === requireType.toLowerCase() : true

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700 disabled:bg-red-300',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300',
    stone: 'bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300',
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-stone-800 mb-2">{title}</h3>
          <p className="text-sm text-stone-600 mb-4">{message}</p>

          {thumbnails && thumbnails.length > 0 && (
            <div className="grid grid-cols-6 gap-1 mb-4 max-h-32 overflow-y-auto">
              {thumbnails.map((url, i) => (
                <div key={i} className="aspect-square rounded overflow-hidden bg-stone-100">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {requireType && (
            <div className="mb-4">
              <p className="text-xs text-stone-500 mb-2">
                Type <span className="font-mono font-semibold text-stone-800">{requireType}</span> to confirm
              </p>
              <input
                type="text"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm"
                placeholder={requireType}
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 rounded-md border border-stone-300"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              className={`px-4 py-2 text-sm text-white rounded-md font-medium transition ${colorClasses[confirmColor]}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
