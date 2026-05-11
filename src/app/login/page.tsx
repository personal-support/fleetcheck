'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    })
    if (error) {
      setError('E-mail ou senha incorretos.')
    } else {
      const redirect = sessionStorage.getItem('fc_redirect'); sessionStorage.removeItem('fc_redirect'); router.replace(redirect ?? '/')
    }
    setLoading(false)
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError('Erro ao enviar link. Tente novamente.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0a0c0f' }}>

      {/* Logo */}
      <div className="mb-8 text-center animate-fade-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{ background: '#f97316' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M4 8h24M4 8v16a2 2 0 002 2h20a2 2 0 002-2V8M4 8l4-4h16l4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="10" cy="20" r="2" fill="white"/>
            <circle cx="22" cy="20" r="2" fill="white"/>
          </svg>
        </div>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 36, fontWeight: 800, letterSpacing: '-0.5px', color: '#e8eaf0' }}>
          FLEET<span style={{ color: '#f97316' }}>CHECK</span>
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Consuldata Teleprocessamento</p>
      </div>

      {/* Toggle */}
      <div className="flex rounded-xl p-1 mb-6 w-full max-w-sm animate-fade-up"
        style={{ background: '#111318', border: '1px solid #1e2229' }}>
        {(['driver', 'admin'] as Mode[]).map(m => (
          <button key={m} onClick={() => { setMode(m); setError(''); setSent(false) }}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: mode === m ? '#f97316' : 'transparent',
              color: mode === m ? 'white' : '#6b7280',
            }}>
            {m === 'driver' ? '🚗 Motorista' : '⚙️ Admin'}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-sm animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="rounded-2xl p-6" style={{ background: '#111318', border: '1px solid #1e2229' }}>

          {/* DRIVER LOGIN */}
          {mode === 'driver' && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: '#e8eaf0', marginBottom: 4 }}>
                Entrar como motorista
              </h2>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
                Use seu e-mail @consuldata.com.br e a senha gerada no seu cadastro.
              </p>
              <form onSubmit={handleDriverLogin} className="flex flex-col gap-4">
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    E-mail
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu.nome@consuldata.com.br" required
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0a0c0f', border: '1px solid #1e2229', color: '#e8eaf0', fontSize: 14, outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#f97316'}
                    onBlur={e => e.target.style.borderColor = '#1e2229'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Senha
                  </label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Sua senha gerada no cadastro" required
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0a0c0f', border: '1px solid #1e2229', color: '#e8eaf0', fontSize: 14, outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#f97316'}
                    onBlur={e => e.target.style.borderColor = '#1e2229'} />
                </div>
                {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: 14, borderRadius: 10, background: loading ? '#7c3d12' : '#f97316', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', minHeight: 48 }}>
                  {loading ? 'Entrando...' : 'ENTRAR'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button onClick={() => router.push('/register')}
                  style={{ background: 'none', border: 'none', color: '#f97316', fontSize: 13, cursor: 'pointer' }}>
                  Primeiro acesso? Cadastre-se aqui
                </button>
              </div>
            </>
          )}

          {/* ADMIN LOGIN */}
          {mode === 'admin' && !sent && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: '#e8eaf0', marginBottom: 4 }}>
                Acesso administrativo
              </h2>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
                Enviaremos um link de acesso para o seu e-mail.
              </p>
              <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    E-mail admin
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@consuldata.com.br" required
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0a0c0f', border: '1px solid #1e2229', color: '#e8eaf0', fontSize: 14, outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#f97316'}
                    onBlur={e => e.target.style.borderColor = '#1e2229'} />
                </div>
                {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: 14, borderRadius: 10, background: loading ? '#7c3d12' : '#f97316', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', minHeight: 48 }}>
                  {loading ? 'Enviando...' : 'Enviar link de acesso'}
                </button>
              </form>
            </>
          )}

          {mode === 'admin' && sent && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e8eaf0', marginBottom: 8 }}>Link enviado!</h3>
              <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.5 }}>
                Verifique <strong style={{ color: '#e8eaf0' }}>{email}</strong> e clique no link para entrar.
              </p>
              <button onClick={() => setSent(false)}
                style={{ marginTop: 16, color: '#f97316', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>
                Usar outro e-mail
              </button>
            </div>
          )}
        </div>
      </div>

      <p style={{ color: '#2a2f38', fontSize: 11, marginTop: 32 }}>
        FleetCheck © J.Lopes Personal Support
      </p>
    </main>
  )
}
