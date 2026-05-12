'use client'

import { useRouter } from 'next/navigation'

interface BackButtonProps {
  href?: string
  label?: string
  onBack?: () => void
}

export function BackButton({ href, label = 'Voltar', onBack }: BackButtonProps) {
  const router = useRouter()

  function handleBack() {
    if (onBack) { onBack(); return }
    if (href) { router.push(href); return }
    router.back()
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      padding: '10px 20px',
      paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
      background: 'rgba(235,239,242,0.95)',
      backdropFilter: 'blur(8px)',
      borderTop: '1px solid var(--cd-border)',
      zIndex: 50,
    }}>
      <button onClick={handleBack} style={{
        width: '100%', minHeight: 48, padding: '12px 20px',
        background: '#ffffff', border: '1.5px solid var(--cd-border)',
        borderRadius: 'var(--radius-sm)', color: '#5e6673',
        fontSize: 15, fontWeight: 700,
        fontFamily: "'Open Sans', sans-serif",
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="#5e6673" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {label}
      </button>
    </div>
  )
}
