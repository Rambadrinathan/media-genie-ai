import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">&#9830;</span>
            <span className="font-semibold text-stone-900">Media Genie AI</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/Rambadrinathan/media-genie-ai" target="_blank" rel="noreferrer" className="text-sm text-stone-500 hover:text-stone-900 hidden sm:inline">
              GitHub
            </a>
            <Link
              href="/review"
              className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <p className="text-xs font-medium text-amber-700 uppercase tracking-widest mb-4">
              AI Visual Library &amp; Portfolio Builder
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 leading-[1.1] tracking-tight">
              Stop organizing photos by hand.<br />
              <span className="text-stone-500">Start shipping portfolios in seconds.</span>
            </h1>
            <p className="text-lg text-stone-600 mt-6 leading-relaxed max-w-xl">
              Upload your photos. AI reads every image, adds tags, quality scores, and captions automatically.
              Then type what you need, and get a shareable portfolio link. For photographers, designers,
              studios, and anyone drowning in images.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/review"
                className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 rounded-lg text-sm font-medium transition inline-flex items-center gap-2"
              >
                Try it now
                <span>&rarr;</span>
              </Link>
              <a
                href="#demo"
                className="border border-stone-300 hover:border-stone-500 text-stone-700 px-6 py-3 rounded-lg text-sm font-medium transition"
              >
                See a live portfolio
              </a>
            </div>
            <div className="flex flex-wrap gap-5 mt-6 text-xs text-stone-400">
              <span>&#10003; No manual tagging</span>
              <span>&#10003; Shareable in 30 seconds</span>
              <span>&#10003; Works with any image source</span>
            </div>
          </div>

          {/* Right: product visual (CSS mockup) */}
          <div className="relative">
            <div className="relative bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-stone-100 bg-stone-50">
                <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                <div className="ml-3 text-[10px] text-stone-400 font-mono">media-genie-ai.vercel.app/review</div>
              </div>

              {/* Fake image with tag overlays */}
              <div className="relative">
                <div className="aspect-[4/3] bg-gradient-to-br from-emerald-100 via-amber-100 to-stone-200 relative overflow-hidden">
                  {/* Faux photograph composition */}
                  <div className="absolute inset-0 opacity-70"
                    style={{
                      background: 'radial-gradient(circle at 30% 40%, #d6e4b8 0%, transparent 50%), radial-gradient(circle at 70% 60%, #f4e4b8 0%, transparent 50%), linear-gradient(180deg, #e8dfc8 0%, #c9b88a 100%)'
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-stone-800/40 to-transparent" />

                  {/* Quality score badge (top right) */}
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                    8.4 / 10
                  </div>

                  {/* AI analyzing pulse indicator (top left) */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-stone-900/80 backdrop-blur text-white text-xs px-2.5 py-1 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    AI analyzing
                  </div>

                  {/* AI-generated tags (floating) */}
                  <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5">
                    {['bamboo', 'exterior', 'garden', 'warm-tones', 'landscape'].map(tag => (
                      <span key={tag} className="bg-white/95 backdrop-blur text-stone-700 text-[11px] font-medium px-2 py-0.5 rounded-full shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Caption row */}
                <div className="px-4 py-3 bg-white border-t border-stone-100">
                  <p className="text-xs text-stone-600 italic leading-relaxed">
                    &ldquo;Bamboo-lined pathway in the golden hour, leading to an open garden pavilion.&rdquo;
                  </p>
                  <p className="text-[10px] text-stone-400 mt-1">AI-generated caption</p>
                </div>
              </div>
            </div>

            {/* Floating "Portfolio ready" card */}
            <div className="absolute -bottom-6 -left-4 sm:-left-8 bg-white rounded-xl border border-stone-200 shadow-lg px-4 py-3 max-w-[220px]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center">&#9829;</div>
                <span className="text-xs font-semibold text-stone-900">Portfolio ready</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-snug">
                18 images, AI-curated for &ldquo;investor pitch&rdquo;
              </p>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">Shareable link copied</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-24">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-widest mb-2 text-center">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 text-center max-w-2xl mx-auto leading-tight">
            From photo dump to polished portfolio in three steps.
          </h2>

          <div className="grid sm:grid-cols-3 gap-6 mt-14">
            {/* Step 1 */}
            <div className="relative">
              <div className="text-6xl font-bold text-stone-200 leading-none absolute -top-4 -left-2 select-none">1</div>
              <div className="relative pt-8">
                <h3 className="text-xl font-semibold text-stone-900 mb-3">Upload anything</h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Drag and drop photos from your phone, laptop, or camera. Up to 20 MB per image,
                  bulk upload supported. No cloud storage account required.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="text-6xl font-bold text-stone-200 leading-none absolute -top-4 -left-2 select-none">2</div>
              <div className="relative pt-8">
                <h3 className="text-xl font-semibold text-stone-900 mb-3">AI reads every image</h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Claude Vision analyzes each photo and generates tags, a quality score (0-10),
                  a plain-English caption, dominant colors, and scene type. Zero clicks from you.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="text-6xl font-bold text-stone-200 leading-none absolute -top-4 -left-2 select-none">3</div>
              <div className="relative pt-8">
                <h3 className="text-xl font-semibold text-stone-900 mb-3">Describe what you need</h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Type a natural-language prompt: &ldquo;best project shots for investor pitch.&rdquo;
                  The system picks the right images, orders them, writes captions, and gives you a shareable link.
                </p>
              </div>
            </div>
          </div>

          {/* Time comparison */}
          <div className="mt-14 max-w-xl mx-auto bg-stone-50 rounded-xl border border-stone-200 p-5 text-center">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">What this saves you</p>
            <p className="text-sm text-stone-700">
              <span className="line-through text-stone-400">3 hours hunting through folders</span>
              {' '}&rarr;{' '}
              <span className="font-semibold text-emerald-700">under 2 minutes to a shareable link</span>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20 sm:py-24">
        <p className="text-xs font-medium text-amber-700 uppercase tracking-widest mb-2 text-center">What&apos;s inside</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 text-center max-w-2xl mx-auto leading-tight">
          Everything your visual library needs.
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
          {[
            {
              icon: '&#9733;',
              title: 'Auto-tagging and classification',
              body: 'Every image gets semantic tags, a quality score, a caption, suggested folders, and dominant colors. Taxonomy evolves from what you approve.',
            },
            {
              icon: '&#9872;',
              title: 'Searchable at scale',
              body: 'Filter by tags, folders, scenes, quality, or combinations. Server-side filtering stays fast through thousands of images.',
            },
            {
              icon: '&#10022;',
              title: 'Prompt-driven portfolio generator',
              body: 'Describe what you need in plain English. AI picks the best matching images, orders by quality, writes gallery captions, gives a shareable URL.',
            },
            {
              icon: '&#10003;',
              title: 'Review workflow with undo',
              body: 'Approve or reject in bulk. Soft delete with a 10-second undo toast. Restore anything from the Trash view. Full audit trail.',
            },
            {
              icon: '&#9998;',
              title: 'Editable metadata',
              body: 'Every AI-generated tag, caption, and score is editable. Custom folders and scenes are added inline and learned by the system.',
            },
            {
              icon: '&#8689;',
              title: 'One-tap sharing',
              body: 'Every portfolio gets a public URL. Copy link, WhatsApp, email share buttons built in. Recipients never need an account.',
            },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-xl border border-stone-200 p-6 hover:border-stone-400 transition">
              <div className="text-2xl text-amber-600 mb-3" dangerouslySetInnerHTML={{ __html: f.icon }} />
              <h3 className="font-semibold text-stone-900 mb-2">{f.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* See it work */}
      <section id="demo" className="bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-24 text-center">
          <p className="text-xs font-medium text-amber-400 uppercase tracking-widest mb-3">See it work</p>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight max-w-2xl mx-auto">
            A real portfolio built with Media Genie AI.
          </h2>
          <p className="text-stone-300 mt-5 max-w-xl mx-auto leading-relaxed">
            Here&apos;s an actual portfolio built from a one-line prompt:
            <span className="italic"> &ldquo;premium garden solutions for investor review.&rdquo;</span>
          </p>
          <div className="mt-10">
            <Link
              href="/gallery/e17f8010-1baa-4f2c-8464-f9fa544bdcd0"
              className="inline-flex items-center gap-2 bg-white hover:bg-stone-100 text-stone-900 px-6 py-3 rounded-lg text-sm font-medium transition"
            >
              Open the live gallery
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 sm:py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
          Your next portfolio is 30 seconds away.
        </h2>
        <p className="text-stone-600 mt-5 max-w-xl mx-auto leading-relaxed">
          Upload a handful of photos. Watch the AI tag, score, and caption every one.
          Then describe the portfolio you need and see what comes out.
        </p>
        <div className="mt-8">
          <Link
            href="/review"
            className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-8 py-4 rounded-lg text-base font-medium transition"
          >
            Try it now
            <span>&rarr;</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-500">
          <div className="flex items-center gap-2">
            <span>&#9830;</span>
            <span className="font-semibold text-stone-900">Media Genie AI</span>
            <span className="text-stone-300">&middot;</span>
            <span className="text-xs">AI-powered visual library and portfolio builder</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://github.com/Rambadrinathan/media-genie-ai" target="_blank" rel="noreferrer" className="hover:text-stone-900">GitHub</a>
            <Link href="/review" className="hover:text-stone-900">Log in</Link>
            <span className="text-xs text-stone-400">v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
