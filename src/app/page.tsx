import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
          <p className="text-sm font-medium text-stone-400 uppercase tracking-widest mb-4">
            KarmYog Vatika Gardens
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 leading-tight">
            Your images, organized<br />
            and portfolio-ready.
          </h1>
          <p className="text-lg text-stone-500 mt-6 max-w-2xl leading-relaxed">
            Drop photos into Google Drive. AI classifies, tags, and scores every image
            automatically. Browse your library, approve the best, and generate
            beautiful portfolios with a single prompt.
          </p>
          <div className="flex gap-3 mt-10">
            <Link
              href="/review"
              className="bg-stone-800 hover:bg-stone-900 text-white px-6 py-3 rounded-lg text-sm font-medium transition"
            >
              Open Image Library
            </Link>
            <Link
              href="/portfolio"
              className="border border-stone-300 hover:border-stone-500 text-stone-700 px-6 py-3 rounded-lg text-sm font-medium transition"
            >
              Build a Portfolio
            </Link>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-stone-800 mb-10">How it works</h2>

        <div className="grid sm:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-lg mb-4">
              1
            </div>
            <h3 className="font-semibold text-stone-800 mb-2">Upload</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              Drop photos into the Google Drive folder. From your phone, laptop, or
              any device. That&apos;s the only thing you do.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-lg mb-4">
              2
            </div>
            <h3 className="font-semibold text-stone-800 mb-2">AI Organizes</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              The AI automatically classifies each image — adds tags, quality scores,
              captions, and sorts them into the right folders. No manual work.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-lg mb-4">
              3
            </div>
            <h3 className="font-semibold text-stone-800 mb-2">Review & Build</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              Browse your library, approve the best images, and generate
              portfolios by simply describing what you need.
            </p>
          </div>
        </div>
      </div>

      {/* What you get */}
      <div className="bg-white border-t border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-stone-800 mb-10">What you get</h2>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0 mt-0.5">
                AI
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 mb-1">Auto-tagging & Classification</h3>
                <p className="text-sm text-stone-500">
                  Every image gets tagged (bamboo, garden, interior, event...), quality scored (0-10),
                  and sorted into folders automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0 mt-0.5">
                QA
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 mb-1">Quality Control</h3>
                <p className="text-sm text-stone-500">
                  Blurry, dark, or low-resolution images are flagged automatically.
                  You decide what stays and what goes.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0 mt-0.5">
                PF
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 mb-1">Portfolio in 30 Seconds</h3>
                <p className="text-sm text-stone-500">
                  Type a prompt like &ldquo;best bamboo installations for CII meeting&rdquo; and
                  get a shareable gallery link instantly.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0 mt-0.5">
                GD
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 mb-1">Google Drive as Source of Truth</h3>
                <p className="text-sm text-stone-500">
                  All original files stay safe in Google Drive forever. Nothing gets lost.
                  The library only shows what you&apos;ve approved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The flow */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-stone-800 mb-6">The flow</h2>
        <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded-md font-medium">
                Upload to Drive
              </span>
            </div>
            <span className="text-stone-300 hidden sm:block">&rarr;</span>
            <div className="flex items-center gap-2">
              <span className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded-md font-medium">
                AI Processes
              </span>
              <span className="text-xs text-stone-400">(automatic)</span>
            </div>
            <span className="text-stone-300 hidden sm:block">&rarr;</span>
            <div className="flex items-center gap-2">
              <span className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded-md font-medium">
                Approve / Reject
              </span>
            </div>
            <span className="text-stone-300 hidden sm:block">&rarr;</span>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md font-medium">
                Share Portfolio Link
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-stone-800 font-semibold">KarmYog Vatika Gardens</p>
          <p className="text-stone-400 text-sm mt-1">
            IIT Kharagpur Research Park, New Town, Kolkata
          </p>
          <p className="text-stone-300 text-xs mt-3">ky21c.org</p>
        </div>
      </footer>
    </div>
  )
}
