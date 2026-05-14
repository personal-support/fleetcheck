'use client'


import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConsuldataFooter } from '@/components/ConsuldataFooter'

type Mode = 'driver' | 'admin'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('driver')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleDriverLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    if (!email.endsWith('@consuldata.com.br')) {
      setError('Use seu e-mail @consuldata.com.br para entrar.')
      return
    }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: password.trim() })
    if (error) { setError('E-mail ou senha incorretos.') }
    else {
      const redirect = sessionStorage.getItem('fc_redirect')
      sessionStorage.removeItem('fc_redirect')
      router.replace(redirect ?? '/')
    }
    setLoading(false)
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError('Erro ao enviar link. Tente novamente.')
    else setSent(true)
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cd-bg)' }}>

      {/* Top bar */}
      <header style={{ background: 'var(--cd-navy)', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <img src="/LOGO_CONSULDATA.png" alt="Consuldata" style={{ height: 36, width: 'auto', objectFit: 'contain' }} /><span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '0.5px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            FLEET<span style={{ color: 'var(--cd-orange)' }}>CHECK</span>
          </span>
          <div style={{ width: 80 }} />
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px 20px' }}>

        {/* Card */}

        {/* Card */}
        <div className="cd-card animate-fade-up" style={{ width: '100%', maxWidth: 400, overflow: 'hidden', animationDelay: '0.08s' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--cd-border)' }}>
            {(['driver', 'admin'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSent(false) }}
                style={{
                  flex: 1, padding: '14px 0', fontSize: 13, fontWeight: 700,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: mode === m ? 'var(--cd-orange)' : 'var(--cd-subtext)',
                  borderBottom: mode === m ? '2px solid var(--cd-orange)' : '2px solid transparent',
                  marginBottom: -1, transition: 'all 0.15s',
                  letterSpacing: '0.02em',
                }}>
                {m === 'driver' ? '🚗  Motorista' : '⚙️  Administrador'}
              </button>
            ))}
          </div>

          <div style={{ padding: '28px 24px 24px' }}>

            {/* DRIVER */}
            {mode === 'driver' && (
              <form onSubmit={handleDriverLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--cd-subtext)', marginBottom: 4, lineHeight: 1.6 }}>
                  Use seu e-mail corporativo e a senha gerada no seu cadastro.
                </p>
                <div>
                  <label className="cd-label">E-mail</label>
                  <input className="cd-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu.nome@consuldata.com.br" required />
                </div>
                <div>
                  <label className="cd-label">Senha</label>
                  <input className="cd-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Sua senha de acesso" required />
                </div>
                {error && (
                  <div style={{ padding: '10px 14px', background: 'var(--cd-red-dim)', border: '1px solid var(--cd-red)', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ fontSize: 13, color: 'var(--cd-red)' }}>{error}</p>
                  </div>
                )}
                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button type="button" onClick={() => router.push('/cadastro')}
                    style={{ background: 'none', border: 'none', color: 'var(--cd-orange)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                    Primeiro acesso?
                  </button>
                  <button type="button" onClick={() => router.push('/esqueci-senha')}
                    style={{ background: 'none', border: 'none', color: 'var(--cd-subtext)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                    Esqueci minha senha
                  </button>
                </div>
              </form>
            )}

            {/* ADMIN */}
            {mode === 'admin' && !sent && (
              <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--cd-subtext)', marginBottom: 4, lineHeight: 1.6 }}>
                  Enviaremos um link de acesso seguro para o seu e-mail.
                </p>
                <div>
                  <label className="cd-label">E-mail administrador</label>
                  <input className="cd-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@consuldata.com.br" required />
                </div>
                {error && (
                  <div style={{ padding: '10px 14px', background: 'var(--cd-red-dim)', border: '1px solid var(--cd-red)', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ fontSize: 13, color: 'var(--cd-red)' }}>{error}</p>
                  </div>
                )}
                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? 'Enviando...' : 'Enviar link de acesso'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <button type="button" onClick={() => router.push('/admin/solicitar-acesso')}
                    style={{ background: 'none', border: 'none', color: 'var(--cd-subtext)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                    Solicitar acesso como administrador
                  </button>
                </div>
              </form>
            )}

            {mode === 'admin' && sent && (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--cd-green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="var(--cd-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--cd-navy)', marginBottom: 8 }}>Link enviado!</p>
                <p style={{ fontSize: 13, color: 'var(--cd-subtext)', lineHeight: 1.6 }}>
                  Verifique <strong style={{ color: 'var(--cd-text)' }}>{email}</strong> e clique no link para acessar.
                </p>
                <button onClick={() => setSent(false)}
                  style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--cd-orange)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                  Usar outro e-mail
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ConsuldataFooter />
    </main>
  )
}
