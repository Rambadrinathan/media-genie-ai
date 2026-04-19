import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { GalleryNav } from './GalleryNav'
import { ShareBar } from '@/components/ShareBar'

interface Props {
  params: Promise<{ id: string }>
}

interface GalleryImage {
  id: string
  cdn_url: string | null
  thumbnail_url: string | null
  ai_caption: string | null
  classified_folder: string | null
  scene: string | null
  tags: string[] | null
  filename: string | null
}

const PUB_SPANS = [8, 4, 4, 4, 4, 7, 5, 6, 6]

export default async function GalleryPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('*')
    .eq('id', id)
    .single()

  if (!portfolio) {
    notFound()
  }

  const { data: allImages } = await supabase
    .from('images')
    .select('*')
    .in('id', portfolio.image_ids || [])

  if (!allImages) {
    notFound()
  }

  const imageMap = new Map(allImages.map(img => [img.id, img]))
  const images: GalleryImage[] = (portfolio.image_ids || [])
    .map((imgId: string) => imageMap.get(imgId))
    .filter(Boolean) as GalleryImage[]

  const captions: Record<string, string> = portfolio.captions || {}
  const coverImage = images.find(img => img.id === portfolio.cover_image_id) || images[0]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const portfolioUrl = `${appUrl}/gallery/${id}`

  // Split title so we can italicize last ~third
  const titleWords = portfolio.title.split(' ')
  const splitAt = Math.max(1, titleWords.length - Math.max(1, Math.floor(titleWords.length / 3)))
  const titleLead = titleWords.slice(0, splitAt).join(' ')
  const titleTail = titleWords.slice(splitAt).join(' ')

  return (
    <div className="min-h-screen" style={{ background: '#fff', color: 'var(--ink)' }}>
      {/* Public header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-8 py-4"
        style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}
      >
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, whiteSpace: 'nowrap' }}>
          KarmYog Vatika Gardens
        </div>
        <GalleryNav title={portfolio.title} url={portfolioUrl} portfolioId={id} />
      </header>

      {/* Hero */}
      <div
        className="relative flex items-end"
        style={{ minHeight: 560, background: 'var(--sand)', overflow: 'hidden' }}
      >
        {coverImage?.cdn_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage.cdn_url}
            alt={captions[coverImage.id] || coverImage.ai_caption || ''}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55))' }}
        />
        <div className="relative z-10 px-12 py-10" style={{ color: '#fff', maxWidth: 720 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>
            KarmYog Vatika · Portfolio
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 48, lineHeight: 1.1, margin: '10px 0 14px', letterSpacing: '-0.01em' }}>
            {titleLead}{' '}
            {titleTail && (
              <em style={{ fontStyle: 'italic', color: 'var(--accent-soft)' }}>{titleTail}.</em>
            )}
          </h1>
          {portfolio.prompt && (
            <p style={{ fontSize: 15, opacity: 0.85, maxWidth: 500 }}>&ldquo;{portfolio.prompt}&rdquo;</p>
          )}
          <div className="mt-[18px]">
            <ShareBar title={portfolio.title} url={portfolioUrl} variant="compact" />
          </div>
        </div>
      </div>

      {/* Intro + grid */}
      <section className="mx-auto px-10 py-12" style={{ maxWidth: 1100 }}>
        <div className="grid gap-12 mb-12" style={{ gridTemplateColumns: '2fr 3fr' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>
              Prepared for · shared viewer
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 34, lineHeight: 1.1, letterSpacing: '-0.005em', margin: '8px 0 0' }}>
              {images.length} selected works, annotated.
            </h2>
          </div>
          <p style={{ color: 'var(--ink-soft)', fontSize: 16, lineHeight: 1.65, margin: 0 }}>
            This portfolio was curated with Media Genie AI. Every caption is editable by the team. Published URLs are shareable without sign-in; scroll through, or save the link.
          </p>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
          {images.map((img, i) => {
            const caption = captions[img.id] || img.ai_caption || ''
            const span = PUB_SPANS[i % PUB_SPANS.length]
            return (
              <figure
                key={img.id}
                style={{ gridColumn: `span ${span}`, borderRadius: 4, overflow: 'hidden', margin: 0 }}
              >
                <div style={{ background: 'var(--sand-2)', overflow: 'hidden' }}>
                  {img.cdn_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.cdn_url}
                      alt={caption}
                      className="w-full h-auto block"
                      style={{ aspectRatio: '4/3', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ aspectRatio: '4/3', background: 'var(--sand-2)' }} />
                  )}
                </div>
                {caption && (
                  <figcaption
                    style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, fontStyle: 'italic', lineHeight: 1.5 }}
                  >
                    {img.classified_folder && (
                      <b style={{ fontStyle: 'normal', fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--ink)', display: 'block', marginBottom: 2, fontWeight: 400 }}>
                        {img.classified_folder.replace(/-/g, ' ')}
                      </b>
                    )}
                    {caption}
                  </figcaption>
                )}
              </figure>
            )
          })}
        </div>

        <div
          className="mt-16 pt-8 flex justify-between items-baseline"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>
              Next step
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, marginTop: 6 }}>
              Reach out — we&apos;ll pick up from here.
            </div>
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>
              Share this link with anyone. No sign-in required.
            </div>
          </div>
          <button
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Contact us →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="flex justify-between"
        style={{ borderTop: '1px solid var(--line)', padding: '24px 32px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}
      >
        <span>KarmYog Vatika Gardens · IIT Kharagpur Research Park</span>
        <span>Portfolio generated · Media Genie AI</span>
      </footer>
    </div>
  )
}
