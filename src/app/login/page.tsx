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
          <img src="/LOGO_ALPHA.png" alt="Alpha Comex e Transportes" style={{ height: 36, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            FLEET<span style={{ color: 'var(--cd-orange)' }}>CHECK</span>
          </span>
          <div style={{ width: 80 }} />
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px 20px' }}>
        <div className="cd-card animate-fade-up" style={{ width: '100%', maxWidth: 400, padding: '28px 24px' }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: 'var(--cd-navy)', marginBottom: 6 }}>ENTRAR</h2>
          <p style={{ fontSize: 14, color: '#444', marginBottom: 20, lineHeight: 1.6 }}>
            Use seu e-mail corporativo e sua senha de acesso.
          </p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="cd-label" style={{ color: '#222', fontWeight: 700 }}>E-MAIL</label>
              <input className="cd-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu.nome@fleetcheck.com.br" required autoComplete="email" />
            </div>
            <div>
              <label className="cd-label" style={{ color: '#222', fontWeight: 700 }}>SENHA</label>
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
            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={() => router.push('/esqueci-senha')}
                style={{ background: 'none', border: 'none', color: 'var(--cd-orange)', fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', letterSpacing: '0.02em' }}>
                ESQUECI MINHA SENHA
              </button>
            </div>

            <div style={{ borderTop: '2px solid var(--cd-border)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--cd-navy)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center', marginBottom: 2 }}>PRIMEIRO ACESSO?</p>

              {/* 1 - Motorista com e-mail */}
              <button type="button" onClick={() => router.push('/cadastro')}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--cd-navy)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>🚗</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>CADASTRAR COMO MOTORISTA</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Com e-mail @fleetcheck.com.br</p>
                </div>
              </button>

              {/* 2 - Sem e-mail */}
              <button type="button" onClick={() => router.push('/login-cpf')}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--cd-bg)', border: '2px solid var(--cd-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>🪪</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--cd-navy)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>SEM E-MAIL CORPORATIVO</p>
                  <p style={{ fontSize: 11, color: 'var(--cd-subtext)' }}>Acesse com seu CPF</p>
                </div>
              </button>

              {/* 3 - Admin */}
              <button type="button" onClick={() => router.push('/admin/solicitar-acesso')}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--cd-bg)', border: '2px solid var(--cd-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>⚙️</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--cd-navy)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>SOLICITAR ACESSO COMO ADMINISTRADOR</p>
                  <p style={{ fontSize: 11, color: 'var(--cd-subtext)' }}>Requer aprovação de outro administrador</p>
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConsuldataFooter />
    </main>
  )
}
