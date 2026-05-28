'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConsuldataFooter } from '@/components/ConsuldataFooter'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim()
    })
    if (err) { setError('E-mail ou senha incorretos.') }
    else {
      const redirect = sessionStorage.getItem('fc_redirect')
      sessionStorage.removeItem('fc_redirect')
      router.replace(redirect ?? '/')
    }
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cd-bg)' }}>
      <header style={{ background: 'var(--cd-navy)', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <img src="/LOGO_CONSULDATA.png" alt="Consuldata" style={{ height: 36, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            FLEET<span style={{ color: 'var(--cd-orange)' }}>CHECK</span>
          </span>
          <div style={{ width: 80 }} />
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px 20px' }}>
        <div className="cd-card animate-fade-up" style={{ width: '100%', maxWidth: 400, padding: '28px 24px' }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--cd-navy)', marginBottom: 6 }}>ENTRAR</h2>
          <p style={{ fontSize: 13, color: 'var(--cd-subtext)', marginBottom: 20, lineHeight: 1.6 }}>
            Use seu e-mail corporativo e sua senha de acesso.
          </p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="cd-label">E-mail</label>
              <input className="cd-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu.nome@consuldata.com.br" required autoComplete="email" />
            </div>
            <div>
              <label className="cd-label">Senha</label>
              <input className="cd-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Sua senha de acesso" required autoComplete="current-password" />
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
            <div style={{ textAlign: 'center', padding: '10px 14px', background: 'rgba(33,39,113,0.05)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: 12, color: 'var(--cd-subtext)', marginBottom: 4 }}>Não tem e-mail corporativo?</p>
              <button type="button" onClick={() => router.push('/login-cpf')}
                style={{ background: 'none', border: 'none', color: 'var(--cd-navy)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>
                Entrar com CPF
              </button>
              <span style={{ color: 'var(--cd-subtext)', fontSize: 12, margin: '0 6px' }}>ou</span>
              <span style={{ fontSize: 12, color: 'var(--cd-subtext)' }}>contate o administrador</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={() => router.push('/admin/solicitar-acesso')}
                style={{ background: 'none', border: 'none', color: 'var(--cd-subtext)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                Solicitar acesso como administrador
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConsuldataFooter />
    </main>
  )
}
