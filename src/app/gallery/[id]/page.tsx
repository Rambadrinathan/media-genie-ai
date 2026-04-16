import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { GalleryNav } from './GalleryNav'

interface Props {
  params: Promise<{ id: string }>
}

export default async function GalleryPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  // Fetch portfolio
  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('*')
    .eq('id', id)
    .single()

  if (!portfolio) {
    notFound()
  }

  // Fetch images in order
  const { data: allImages } = await supabase
    .from('images')
    .select('*')
    .in('id', portfolio.image_ids || [])

  if (!allImages) {
    notFound()
  }

  // Sort by portfolio order
  const imageMap = new Map(allImages.map(img => [img.id, img]))
  const images = (portfolio.image_ids || [])
    .map((imgId: string) => imageMap.get(imgId))
    .filter(Boolean)

  const captions = portfolio.captions || {}
  const coverImage = images.find((img: { id: string }) => img.id === portfolio.cover_image_id) || images[0]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const portfolioUrl = `${appUrl}/gallery/${id}`

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation bar */}
      <GalleryNav title={portfolio.title} url={portfolioUrl} portfolioId={id} />

      {/* Hero */}
      <div className="relative h-[60vh] min-h-96 bg-stone-900 flex items-end">
        {coverImage?.cdn_url && (
          <img
            src={coverImage.cdn_url}
            alt={captions[coverImage.id] || coverImage.ai_caption || ''}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        )}
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 w-full">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            {portfolio.title}
          </h1>
          <p className="text-lg text-white/70 mt-3">KarmYog Vatika Gardens</p>
        </div>
      </div>

      {/* Description */}
      {portfolio.prompt && (
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-stone-600 text-lg leading-relaxed italic">
            &ldquo;{portfolio.prompt}&rdquo;
          </p>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="space-y-12">
          {images.map((img: { id: string; cdn_url: string; ai_caption: string; tags: string[]; dominant_colors: string[] }, index: number) => {
            const caption = captions[img.id] || img.ai_caption
            const isWide = index === 0 || index % 3 === 0

            return (
              <div key={img.id} className={isWide ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-6'}>
                {isWide ? (
                  <div>
                    <div className="rounded-xl overflow-hidden shadow-lg">
                      <img
                        src={img.cdn_url}
                        alt={caption || ''}
                        className="w-full h-auto"
                        loading="lazy"
                      />
                    </div>
                    {caption && (
                      <p className="mt-3 text-stone-600 text-sm leading-relaxed max-w-2xl">
                        {caption}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={img.cdn_url}
                          alt={caption || ''}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                      </div>
                      {caption && (
                        <p className="mt-3 text-stone-600 text-sm leading-relaxed">
                          {caption}
                        </p>
                      )}
                    </div>
                    {images[index + 1] && (
                      <div>
                        <div className="rounded-xl overflow-hidden shadow-lg">
                          <img
                            src={images[index + 1].cdn_url}
                            alt={captions[images[index + 1].id] || images[index + 1].ai_caption || ''}
                            className="w-full h-auto"
                            loading="lazy"
                          />
                        </div>
                        {(captions[images[index + 1].id] || images[index + 1].ai_caption) && (
                          <p className="mt-3 text-stone-600 text-sm leading-relaxed">
                            {captions[images[index + 1].id] || images[index + 1].ai_caption}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-stone-800 font-semibold">KarmYog Vatika Gardens</p>
          <p className="text-stone-400 text-sm mt-1">
            IIT Kharagpur Research Park, New Town, Kolkata
          </p>
          <p className="text-stone-300 text-xs mt-3">
            ky21c.org
          </p>
        </div>
      </footer>
    </div>
  )
}
