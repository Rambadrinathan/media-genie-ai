'use client'

import { useState, useRef, useCallback } from 'react'

interface UploadResult {
  filename: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  quality_score?: number
  tags?: string[]
  caption?: string
  error?: string
}

interface ImageUploaderProps {
  onComplete: () => void // Called when all uploads finish — triggers grid refresh
  onClose: () => void
}

export function ImageUploader({ onComplete, onClose }: ImageUploaderProps) {
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<UploadResult[]>([])
  const [processing, setProcessing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    setFiles(prev => [...prev, ...imageFiles])
    setResults(prev => [
      ...prev,
      ...imageFiles.map(f => ({ filename: f.name, status: 'pending' as const })),
    ])
  }, [])

  const removeFile = (index: number) => {
    if (processing) return
    setFiles(prev => prev.filter((_, i) => i !== index))
    setResults(prev => prev.filter((_, i) => i !== index))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const processAll = async () => {
    if (files.length === 0) return
    setProcessing(true)

    // Process one at a time to show progress and avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i)
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'uploading' } : r))

      const formData = new FormData()
      formData.append('files', files[i])

      try {
        const res = await fetch('/api/images/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (res.ok && data.results?.[0]?.status === 'success') {
          const r = data.results[0]
          setResults(prev => prev.map((result, idx) =>
            idx === i ? {
              ...result,
              status: 'success',
              quality_score: r.quality_score,
              tags: r.tags,
              caption: r.caption,
            } : result
          ))
        } else {
          const errMsg = data.results?.[0]?.error || data.error || 'Upload failed'
          setResults(prev => prev.map((result, idx) =>
            idx === i ? { ...result, status: 'error', error: errMsg } : result
          ))
        }
      } catch {
        setResults(prev => prev.map((result, idx) =>
          idx === i ? { ...result, status: 'error', error: 'Network error' } : result
        ))
      }
    }

    setProcessing(false)
    onComplete()
  }

  const succeeded = results.filter(r => r.status === 'success').length
  const failed = results.filter(r => r.status === 'error').length
  const done = succeeded + failed === files.length && files.length > 0

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-stone-800">Upload Images</h3>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg">x</button>
      </div>

      {/* Drop zone */}
      {!processing && !done && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition mb-4 ${
            dragging
              ? 'border-stone-800 bg-stone-100'
              : 'border-stone-300 hover:border-stone-500 bg-stone-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
          <div className="text-stone-400 text-4xl mb-2">+</div>
          <p className="text-stone-600 font-medium">Drop images here or click to browse</p>
          <p className="text-stone-400 text-sm mt-1">JPEG, PNG, WebP, GIF — up to 20 MB each</p>
        </div>
      )}

      {/* File list */}
      {results.length > 0 && (
        <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
          {results.map((result, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                result.status === 'success'
                  ? 'bg-emerald-50'
                  : result.status === 'error'
                  ? 'bg-red-50'
                  : result.status === 'uploading'
                  ? 'bg-amber-50'
                  : 'bg-stone-50'
              }`}
            >
              {/* Status indicator */}
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {result.status === 'pending' && (
                  <div className="w-2 h-2 rounded-full bg-stone-300" />
                )}
                {result.status === 'uploading' && (
                  <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin" />
                )}
                {result.status === 'success' && (
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {result.status === 'error' && (
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Filename */}
              <span className="font-medium text-stone-700 truncate flex-shrink min-w-0">
                {result.filename}
              </span>

              {/* Size */}
              <span className="text-stone-400 text-xs flex-shrink-0">
                {files[i] ? `${(files[i].size / 1024 / 1024).toFixed(1)} MB` : ''}
              </span>

              {/* Result info */}
              <div className="flex-1 text-right text-xs flex-shrink-0">
                {result.status === 'uploading' && (
                  <span className="text-amber-700">Classifying with AI...</span>
                )}
                {result.status === 'success' && (
                  <span className="text-emerald-700">
                    Quality: {result.quality_score?.toFixed(1)}/10
                    {result.tags && ` — ${result.tags.slice(0, 3).join(', ')}`}
                  </span>
                )}
                {result.status === 'error' && (
                  <span className="text-red-600">{result.error}</span>
                )}
              </div>

              {/* Remove button (only before processing) */}
              {!processing && result.status === 'pending' && (
                <button
                  onClick={() => removeFile(i)}
                  className="text-stone-300 hover:text-stone-500 flex-shrink-0"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progress summary */}
      {processing && (
        <div className="bg-stone-50 rounded-lg p-3 mb-4 text-sm text-stone-600">
          Processing {currentIndex + 1} of {files.length}...
          {succeeded > 0 && <span className="text-emerald-600 ml-2">{succeeded} done</span>}
          {failed > 0 && <span className="text-red-500 ml-2">{failed} failed</span>}
        </div>
      )}

      {/* Done summary */}
      {done && (
        <div className="bg-emerald-50 rounded-lg p-3 mb-4 text-sm text-emerald-700">
          Done! {succeeded} image{succeeded !== 1 ? 's' : ''} processed.
          {failed > 0 && <span className="text-red-600 ml-1">{failed} failed.</span>}
          {' '}Images are now in the review grid below.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {!processing && !done && files.length > 0 && (
          <button
            onClick={processAll}
            className="bg-stone-800 hover:bg-stone-900 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            Upload & Classify {files.length} image{files.length !== 1 ? 's' : ''}
          </button>
        )}
        {done && (
          <button
            onClick={onClose}
            className="bg-stone-800 hover:bg-stone-900 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            Done
          </button>
        )}
      </div>
    </div>
  )
}
