'use client'

import { useState } from 'react'

interface ShareBarProps {
  title: string
  url: string
  /** compact renders mono pill buttons (public hero); default renders ghost buttons (editor, cards) */
  variant?: 'compact' | 'ghost'
  whatsappTemplate?: string
}

export function ShareBar({ title, url, variant = 'ghost', whatsappTemplate }: ShareBarProps) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function shareWhatsApp() {
    const text = whatsappTemplate
      ? whatsappTemplate.replace('{title}', title).replace('{url}', url)
      : `Hi! I've put together something for you — ${title}\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function shareEmail() {
    const subject = encodeURIComponent(title)
    const body = encodeURIComponent(`I'd like to share this portfolio with you:\n\n${title}\n${url}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const btnStyle: React.CSSProperties = variant === 'compact'
    ? {
        background: 'rgba(255,255,255,0.95)',
        color: 'var(--ink)',
        padding: '8px 14px',
        borderRadius: 999,
        textDecoration: 'none',
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        border: 0,
        cursor: 'pointer',
      }
    : {
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        fontWeight: 500,
        padding: '7px 12px',
        borderRadius: 8,
        border: '1px solid var(--line)',
        background: 'transparent',
        color: 'var(--ink)',
        cursor: 'pointer',
      }

  return (
    <>
      <div className="flex items-center gap-[6px]">
        <button onClick={copyLink} style={btnStyle}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button onClick={shareWhatsApp} style={btnStyle}>WhatsApp</button>
        <button onClick={shareEmail} style={btnStyle}>Email</button>
        <button onClick={() => setShowQR(true)} style={btnStyle}>QR</button>
      </div>

      {showQR && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[100]"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowQR(false)}
        >
          <div
            className="flex flex-col items-center gap-4"
            style={{ background: '#fff', borderRadius: 14, padding: 32 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink)' }}>
              Scan to share
            </div>
            <QRCode url={url} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', maxWidth: 260, textAlign: 'center', wordBreak: 'break-all' }}>
              {url}
            </div>
            <button
              onClick={() => setShowQR(false)}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--line)',
                background: 'transparent',
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * QR rendered via a free Google Charts endpoint as an <img>.
 * No npm dep added; fails gracefully back to a text URL below the button.
 */
function QRCode({ url }: { url: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="QR code" width={240} height={240} style={{ background: '#fff', borderRadius: 8 }} />
  )
}
