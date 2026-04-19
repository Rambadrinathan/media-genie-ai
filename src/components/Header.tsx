'use client'

import Link from 'next/link'
import { clearAdminSession } from './AdminGate'

interface HeaderProps {
  variant: 'admin' | 'public'
  page?: 'review' | 'portfolios' | 'settings'
}

const SECTION_LABELS: Record<NonNullable<HeaderProps['page']>, string> = {
  review: 'Image Management',
  portfolios: 'Portfolios',
  settings: 'Settings',
}

export function Header({ variant, page }: HeaderProps) {
  function handleLock() {
    clearAdminSession()
    window.location.href = '/review'
  }

  if (variant === 'public') {
    return (
      <header
        className="sticky top-0 z-20 flex items-center justify-between bg-white px-8 py-4"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <Link href="/" className="whitespace-nowrap" style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink)', textDecoration: 'none' }}>
          KarmYog Vatika Gardens
        </Link>
        <nav className="flex gap-4 text-[13px]" style={{ color: 'var(--muted)' }}>
          <Link href="/portfolio" className="hover:text-[var(--ink)]" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
            All portfolios
          </Link>
        </nav>
      </header>
    )
  }

  const sectionLabel = page ? SECTION_LABELS[page] : ''

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-7 py-[14px]"
      style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}
    >
      <div className="flex items-baseline gap-[10px]">
        <div
          className="self-center"
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 35% 35%, #d68966, var(--accent) 60%, #7d5a3c 100%)',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
          }}
        />
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            lineHeight: 1,
            color: 'var(--ink)',
            letterSpacing: '-0.005em',
            textDecoration: 'none',
          }}
        >
          Media Genie AI
        </Link>
        {sectionLabel && (
          <span
            className="pl-[10px]"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: 'var(--muted)',
              borderLeft: '1px solid var(--line)',
            }}
          >
            {sectionLabel}
          </span>
        )}
      </div>

      <nav className="flex items-center gap-1">
        <NavLink href="/review" active={page === 'review'}>
          Review
        </NavLink>
        <NavLink href="/portfolio" active={page === 'portfolios'}>
          Portfolios
        </NavLink>
        <NavLink href="/settings" active={page === 'settings'}>
          Settings
        </NavLink>
        <button
          onClick={handleLock}
          className="ml-[10px] cursor-pointer"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'transparent',
            border: '1px solid var(--line)',
            padding: '6px 10px',
            borderRadius: 6,
            color: 'var(--muted)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--ink)'
            e.currentTarget.style.color = 'var(--ink)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--line)'
            e.currentTarget.style.color = 'var(--muted)'
          }}
        >
          ◆ Lock
        </button>
      </nav>
    </header>
  )
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="transition-all"
      style={{
        color: active ? 'var(--ink)' : 'var(--muted)',
        background: active ? 'var(--sand)' : 'transparent',
        textDecoration: 'none',
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 13,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--ink)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--muted)'
      }}
    >
      {children}
    </Link>
  )
}
