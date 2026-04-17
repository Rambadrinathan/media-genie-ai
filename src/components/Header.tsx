'use client'

import { clearAdminSession } from './AdminGate'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  variant: 'admin' | 'public'
  page?: 'review' | 'portfolios'
}

export function Header({ variant, page }: HeaderProps) {
  const router = useRouter()

  function handleLock() {
    clearAdminSession()
    window.location.href = '/review'
  }

  if (variant === 'public') {
    return (
      <header className="bg-white/90 backdrop-blur border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/" className="text-xl font-semibold text-stone-800">
            KarmYog Vatika Gardens
          </a>
          <a
            href="/portfolio"
            className="text-sm text-stone-500 hover:text-stone-800"
          >
            All Portfolios
          </a>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-xl font-semibold text-stone-800">Media Genie AI</a>
          <span className="text-sm text-stone-500">
            {page === 'review' ? 'Image Management' : 'Portfolios'}
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a
            href="/review"
            className={page === 'review' ? 'text-stone-800 font-medium' : 'text-stone-500 hover:text-stone-800'}
          >
            Review
          </a>
          <a
            href="/portfolio"
            className={page === 'portfolios' ? 'text-stone-800 font-medium' : 'text-stone-500 hover:text-stone-800'}
          >
            Portfolios
          </a>
          <button
            onClick={handleLock}
            className="ml-2 px-2 py-1 text-xs text-stone-400 hover:text-stone-600 border border-stone-200 rounded"
            title="Lock admin access"
          >
            Lock
          </button>
        </nav>
      </div>
    </header>
  )
}
