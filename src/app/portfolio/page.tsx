'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminGate } from '@/components/AdminGate'
import { Header } from '@/components/Header'
import { useToast } from '@/components/Toast'
import type { ImageRecord, Portfolio } from '@/lib/types'

const TEMPLATES = [
  { id: 'investor', name: 'Investor Pitch', desc: 'Hero image + 6-8 curated shots with captions', icon: '---' },
  { id: 'project', name: 'Project Gallery', desc: 'Grid layout, project-specific', icon: '###' },
  { id: 'social', name: 'Social Grid', desc: 'Square crops, optimized for sharing', icon: '::.' },
  { id: 'before-after', name: 'Before-After', desc: 'Side-by-side comparison showcase', icon: '|/|' },
  { id: 'custom', name: 'Custom', desc: 'Free-form prompt, AI decides layout', icon: '~*~' },
]

const PROGRESS_STEPS = [
  'Analyzing your images...',
  'Selecting the best matches...',
  'Arranging the composition...',
  'Writing captions...',
  'Building your portfolio...',
]

export default function PortfolioPage() {
  return (
    <AdminGate>
      <PortfolioContent />
    </AdminGate>
  )
}

function PortfolioContent() {
  const { showToast } = useToast()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [prompt, setPrompt] = useState('')
  const [template, setTemplate] = useState('investor')
  const [generating, setGenerating] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [approvedImages, setApprovedImages] = useState<ImageRecord[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [letAiChoose, setLetAiChoose] = useState(true)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [imageTags, setImageTags] = useState<string[]>([])

  useEffect(() => {
    fetchPortfolios()
    fetchApprovedImages()
  }, [])

  async function fetchPortfolios() {
    const { data } = await supabase
      .from('portfolios')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setPortfolios(data || [])
  }

  async function fetchApprovedImages() {
    const { data } = await supabase
      .from('images')
      .select('*')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('quality_score', { ascending: false })
      .limit(200)
    setApprovedImages(data || [])
    // Extract tags
    const tagSet = new Set<string>()
    ;(data || []).forEach(img => (img.tags || []).forEach((t: string) => tagSet.add(t)))
    setImageTags([...tagSet].sort())
  }

  async function generatePortfolio() {
    if (!prompt.trim()) return
    setGenerating(true)
    setProgressStep(0)

    // Cycle progress messages
    const interval = setInterval(() => {
      setProgressStep(prev => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev))
    }, 2500)

    try {
      const res = await fetch('/api/portfolios/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          template,
          selectedImageIds: !letAiChoose && selectedImages.size > 0 ? [...selectedImages] : undefined,
        }),
      })

      clearInterval(interval)

      if (res.ok) {
        const data = await res.json()
        setGeneratedId(data.id)
        setWizardStep(4) // Success step
        fetchPortfolios()
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed to generate portfolio', 'error')
      }
    } catch {
      clearInterval(interval)
      showToast('Failed to generate portfolio. Please try again.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  function resetBuilder() {
    setShowBuilder(false)
    setWizardStep(1)
    setPrompt('')
    setTemplate('investor')
    setSelectedImages(new Set())
    setLetAiChoose(true)
    setGeneratedId(null)
    setFilterTag(null)
  }

  const filteredImages = filterTag
    ? approvedImages.filter(img => (img.tags || []).includes(filterTag))
    : approvedImages

  return (
    <div className="min-h-screen bg-stone-50">
      <Header variant="admin" page="portfolios" />

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
                    <div className="flex gap-3">
                      <a
                        href={`/gallery/${p.id}`}
                        className="text-xs text-stone-600 hover:text-stone-800 underline"
                      >
                        View
                      </a>
                      <a
                        href={`/portfolio/${p.id}/edit`}
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

      {/* Builder Modal — 3-step wizard */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-stone-800">Create Portfolio</h2>
                  {wizardStep < 4 && (
                    <p className="text-xs text-stone-400 mt-0.5">Step {wizardStep} of 3</p>
                  )}
                </div>
                <button
                  onClick={resetBuilder}
                  className="text-stone-400 hover:text-stone-600 text-xl"
                >
                  x
                </button>
              </div>

              {/* Step indicator */}
              {wizardStep < 4 && (
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3].map(step => (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded-full transition ${
                        step <= wizardStep ? 'bg-stone-800' : 'bg-stone-200'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Step 1: Intent */}
              {wizardStep === 1 && (
                <div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      What do you need?
                    </label>
                    <textarea
                      className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-transparent"
                      rows={4}
                      placeholder="Best bamboo installations showing scale and craftsmanship, for CII investor meeting..."
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-stone-700 mb-2">Template</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTemplate(t.id)}
                          className={`text-left px-3 py-3 rounded-lg border text-sm transition ${
                            template === t.id
                              ? 'border-stone-800 bg-stone-50 ring-1 ring-stone-800'
                              : 'border-stone-200 hover:border-stone-400'
                          }`}
                        >
                          <div className="font-mono text-xs text-stone-400 mb-1">{t.icon}</div>
                          <div className="font-medium text-stone-800">{t.name}</div>
                          <div className="text-xs text-stone-400 mt-0.5">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setWizardStep(2)}
                    disabled={!prompt.trim()}
                    className="w-full bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 text-white py-3 rounded-lg text-sm font-medium transition"
                  >
                    Next: Choose Images
                  </button>
                </div>
              )}

              {/* Step 2: Images */}
              {wizardStep === 2 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-stone-700">
                      Image Selection
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={letAiChoose}
                        onChange={e => setLetAiChoose(e.target.checked)}
                        className="rounded border-stone-300"
                      />
                      <span className="text-stone-600">Let AI choose the best images</span>
                    </label>
                  </div>

                  {!letAiChoose && (
                    <>
                      {/* Tag filter */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        <button
                          onClick={() => setFilterTag(null)}
                          className={`px-2 py-0.5 rounded-full text-xs border transition ${
                            !filterTag ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-300'
                          }`}
                        >
                          All
                        </button>
                        {imageTags.slice(0, 12).map(tag => (
                          <button
                            key={tag}
                            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                            className={`px-2 py-0.5 rounded-full text-xs border transition ${
                              filterTag === tag ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-300'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>

                      <div className="max-h-96 overflow-y-auto border border-stone-200 rounded-lg p-3 mb-4">
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                          {filteredImages.map(img => (
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
                              className={`relative aspect-square rounded-lg cursor-pointer overflow-hidden border-2 transition ${
                                selectedImages.has(img.id)
                                  ? 'border-stone-800 ring-1 ring-stone-800'
                                  : 'border-transparent hover:border-stone-300'
                              }`}
                            >
                              {img.thumbnail_url ? (
                                <img src={img.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full bg-stone-100" />
                              )}
                              {selectedImages.has(img.id) && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              {img.quality_score && (
                                <span className={`absolute bottom-1 left-1 text-[10px] px-1 py-0.5 rounded font-medium ${
                                  img.quality_score >= 7 ? 'bg-emerald-100 text-emerald-700' : img.quality_score >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {img.quality_score.toFixed(1)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-stone-400 mb-4">
                        {selectedImages.size} image{selectedImages.size !== 1 ? 's' : ''} selected
                      </p>
                    </>
                  )}

                  {letAiChoose && (
                    <div className="bg-stone-50 rounded-lg p-6 mb-4 text-center">
                      <p className="text-stone-600 text-sm">
                        AI will automatically select the best 6-12 images from your {approvedImages.length} approved images based on your prompt.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-3 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setWizardStep(3)}
                      className="flex-1 bg-stone-800 hover:bg-stone-900 text-white py-3 rounded-lg text-sm font-medium transition"
                    >
                      Next: Review & Generate
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Generate */}
              {wizardStep === 3 && !generating && (
                <div>
                  <div className="bg-stone-50 rounded-lg p-4 mb-6 space-y-3">
                    <div>
                      <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Prompt</span>
                      <p className="text-sm text-stone-700 mt-1">&ldquo;{prompt}&rdquo;</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Template</span>
                      <p className="text-sm text-stone-700 mt-1">{TEMPLATES.find(t => t.id === template)?.name}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Images</span>
                      <p className="text-sm text-stone-700 mt-1">
                        {letAiChoose
                          ? `AI will choose from ${approvedImages.length} approved images`
                          : `${selectedImages.size} manually selected`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-3 text-sm text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={generatePortfolio}
                      className="flex-1 bg-stone-800 hover:bg-stone-900 text-white py-3 rounded-lg text-sm font-medium transition"
                    >
                      Generate Portfolio
                    </button>
                  </div>
                </div>
              )}

              {/* Generating state */}
              {wizardStep === 3 && generating && (
                <div className="text-center py-12">
                  <div className="inline-block w-10 h-10 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-4" />
                  <p className="text-stone-700 font-medium">{PROGRESS_STEPS[progressStep]}</p>
                  <p className="text-xs text-stone-400 mt-2">This usually takes 10-20 seconds</p>
                </div>
              )}

              {/* Step 4: Success */}
              {wizardStep === 4 && generatedId && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-800 mb-2">Portfolio Created!</h3>
                  <p className="text-sm text-stone-500 mb-6">Your portfolio is ready to view and share.</p>
                  <div className="flex gap-2 justify-center">
                    <a
                      href={`/gallery/${generatedId}`}
                      target="_blank"
                      className="bg-stone-800 hover:bg-stone-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
                    >
                      View Portfolio
                    </a>
                    <a
                      href={`/portfolio/${generatedId}/edit`}
                      className="border border-stone-300 text-stone-600 hover:bg-stone-50 px-5 py-2.5 rounded-lg text-sm font-medium"
                    >
                      Edit Portfolio
                    </a>
                  </div>
                  <button
                    onClick={resetBuilder}
                    className="text-sm text-stone-400 hover:text-stone-600 mt-4"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
