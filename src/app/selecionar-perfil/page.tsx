'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConsuldataFooter } from '@/components/ConsuldataFooter'

export default function SelecionarPerfilPage() {
  const router = useRouter()

  // Desktop nunca deve ver esta tela — vai direto para /login
  useEffect(() => {
    if (window.innerWidth >= 1024) router.replace('/login')
  }, [])

  function choose(type: 'driver' | 'admin') {
    localStorage.setItem('fc_user_type', type)
    router.push('/login')
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cd-navy)' }}>
      <div style={{ padding: '40px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/LOGO_CONSULDATA.png" alt="Consuldata" style={{ height: 44, objectFit: 'contain', marginBottom: 20 }} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>
          FLEET<span style={{ color: 'var(--cd-orange)' }}>CHECK</span>
        </span>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center' }}>
          Sistema de Gestão de Frota
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 16 }}>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 8, textAlign: 'center' }}>
          Como você vai usar o sistema?
        </p>

        <button onClick={() => choose('driver')}
          style={{ width: '100%', maxWidth: 380, padding: '28px 24px', borderRadius: 16, background: 'var(--cd-orange)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 40 }}>🚗</span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: 1 }}>Sou Motorista</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>Realizar checklist do veículo</span>
        </button>

        <button onClick={() => choose('admin')}
          style={{ width: '100%', maxWidth: 380, padding: '28px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 40 }}>⚙️</span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: 1 }}>Sou Administrador</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Gerenciar frota e relatórios</span>
        </button>
      </div>

      <ConsuldataFooter />
    </main>
  )
}
