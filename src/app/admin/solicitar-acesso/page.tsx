'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConsuldataFooter } from '@/components/ConsuldataFooter'

export default function SolicitarAcessoPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/admin-invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    const data = await res.json()
    if (!res.ok) setError(data.error)
    else setSent(true)
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cd-bg)' }}>
      <header style={{ background: 'var(--cd-navy)', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'relative' }}>
          <img src="/LOGO_CONSULDATA.png" alt="Consuldata" style={{ height: 36, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            FLEET<span style={{ color: 'var(--cd-orange)' }}>CHECK</span>
          </span>
          <div />
        </div>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div className="cd-card animate-fade-up" style={{ width: '100%', maxWidth: 400, padding: '28px 24px' }}>
          {!sent ? (
            <>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--cd-navy)', marginBottom: 6 }}>SOLICITAR ACESSO ADMIN</h2>
              <p style={{ fontSize: 14, color: 'var(--cd-subtext)', marginBottom: 20, lineHeight: 1.5 }}>
                Sua solicitação será analisada por um administrador. Após aprovação, você receberá um link de acesso por e-mail.
              </p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="cd-label">E-mail corporativo</label>
                  <input className="cd-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu.nome@consuldata.com.br" required />
                </div>
                {error && <div style={{ padding: '10px 14px', background: 'var(--cd-red-dim)', border: '1px solid var(--cd-red)', borderRadius: 'var(--radius-sm)' }}><p style={{ fontSize: 13, color: 'var(--cd-red)' }}>{error}</p></div>}
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enviando...' : 'Solicitar acesso'}</button>
                <button type="button" onClick={() => router.push('/login')} className="btn-secondary">← Voltar ao login</button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--cd-green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="var(--cd-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--cd-navy)', marginBottom: 8 }}>Solicitação enviada!</p>
              <p style={{ fontSize: 13, color: 'var(--cd-subtext)', lineHeight: 1.6 }}>Um administrador irá revisar seu pedido. Quando aprovado, você receberá um link em <strong>{email}</strong>.</p>
              <button onClick={() => router.push('/login')} className="btn-primary" style={{ marginTop: 20 }}>Voltar ao login</button>
            </div>
          )}
        </div>
      </div>
      <ConsuldataFooter />
    </main>
  )
}
