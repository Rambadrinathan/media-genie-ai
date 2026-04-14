'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImageRecord, Portfolio } from '@/lib/types'

const TEMPLATES = [
  { id: 'investor', name: 'Investor Pitch', desc: 'Hero image + 6-8 curated shots with captions' },
  { id: 'project', name: 'Project Gallery', desc: 'Grid layout, project-specific' },
  { id: 'social', name: 'Social Grid', desc: 'Square crops, optimized for sharing' },
  { id: 'before-after', name: 'Before-After', desc: 'Side-by-side comparison showcase' },
  { id: 'custom', name: 'Custom', desc: 'Free-form prompt, AI decides layout' },
]

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [template, setTemplate] = useState('investor')
  const [generating, setGenerating] = useState(false)
  const [approvedImages, setApprovedImages] = useState<ImageRecord[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPortfolios()
    fetchApprovedImages()
  }, [])

  async function fetchPortfolios() {
    const { data } = await supabase
      .from('portfolios')
      .select('*')
      .order('created_at', { ascending: false })
    setPortfolios(data || [])
  }

  async function fetchApprovedImages() {
    const { data } = await supabase
      .from('images')
      .select('*')
      .eq('status', 'approved')
      .order('quality_score', { ascending: false })
      .limit(200)
    setApprovedImages(data || [])
  }

  async function generatePortfolio() {
    if (!prompt.trim()) return
    setGenerating(true)

    try {
      const res = await fetch('/api/portfolios/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          template,
          selectedImageIds: selectedImages.size > 0 ? [...selectedImages] : undefined,
        }),
      })

      if (res.ok) {
        setShowBuilder(false)
        setPrompt('')
        setSelectedImages(new Set())
        fetchPortfolios()
      }
    } catch (err) {
      console.error('Generate error:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-stone-800">KarmYog Gallery</h1>
            <span className="text-sm text-stone-500">Portfolios</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/review" className="text-stone-500 hover:text-stone-800">Review</a>
            <a href="/portfolio" className="text-stone-800 font-medium">Portfolios</a>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Create button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-stone-800">Your Portfolios</h2>
          <button
            onClick={() => setShowBuilder(true)}
            className="bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Create Portfolio
          </button>
        </div>

        {/* Portfolio list */}
        {portfolios.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-lg">No portfolios yet</p>
            <p className="text-stone-300 text-sm mt-1">Create your first portfolio with a prompt</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolios.map(p => (
              <div key={p.id} className="bg-white rounded-lg border border-stone-200 overflow-hidden hover:shadow-md transition">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-stone-800">{p.title}</h3>
                      <p className="text-sm text-stone-400 mt-1">{p.template} template</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  {p.prompt && (
                    <p className="text-sm text-stone-500 mt-2 line-clamp-2">&ldquo;{p.prompt}&rdquo;</p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
                    <span className="text-xs text-stone-400">
                      {p.image_ids?.length || 0} images
                    </span>
                    <div className="flex gap-2">
                      {p.published_url && (
                        <a
                          href={p.published_url}
                          target="_blank"
                          className="text-xs text-stone-600 hover:text-stone-800 underline"
                        >
                          View
                        </a>
                      )}
                      <a
                        href={`/gallery/${p.id}`}
                        className="text-xs text-stone-600 hover:text-stone-800 underline"
                      >
                        Edit
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-stone-800">Create Portfolio</h2>
                <button
                  onClick={() => setShowBuilder(false)}
                  className="text-stone-400 hover:text-stone-600 text-xl"
                >
                  x
                </button>
              </div>

              {/* Prompt */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  What do you need?
                </label>
                <textarea
                  className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm resize-none"
                  rows={3}
                  placeholder="Best bamboo installations showing scale and craftsmanship, for CII investor meeting..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              </div>

              {/* Template */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">Template</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition ${
                        template === t.id
                          ? 'border-stone-800 bg-stone-50'
                          : 'border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <div className="font-medium text-stone-800">{t.name}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional: pick specific images */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Or pick specific images ({selectedImages.size} selected)
                </label>
                <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-lg p-2">
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
                    {approvedImages.map(img => (
                      <div
                        key={img.id}
                        onClick={() => {
                          setSelectedImages(prev => {
                            const next = new Set(prev)
                            if (next.has(img.id)) next.delete(img.id)
                            else next.add(img.id)
                            return next
                          })
                        }}
                        className={`aspect-square rounded cursor-pointer overflow-hidden border-2 transition ${
                          selectedImages.has(img.id) ? 'border-stone-800' : 'border-transparent hover:border-stone-300'
                        }`}
                      >
                        {img.thumbnail_url ? (
                          <img src={img.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-stone-100" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate */}
              <button
                onClick={generatePortfolio}
                disabled={!prompt.trim() || generating}
                className="w-full bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 text-white py-3 rounded-lg text-sm font-medium transition"
              >
                {generating ? 'Generating...' : 'Generate Portfolio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
