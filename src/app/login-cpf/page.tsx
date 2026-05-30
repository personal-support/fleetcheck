'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConsuldataFooter } from '@/components/ConsuldataFooter'

function formatCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

export default function LoginCpfPage() {
  const router = useRouter()
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) { setError('CPF inválido.'); return }
    if (!password.trim()) { setError('Informe a senha.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const email = `${digits}@fleetcheck.local`
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: password.trim() })
    if (err) setError('CPF ou senha incorretos.')
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'relative' }}>
          <img src="/LOGO_ALPHA.png" alt="Alpha Comex e Transportes" style={{ height: 36, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            FLEET<span style={{ color: 'var(--cd-orange)' }}>CHECK</span>
          </span>
          <div />
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div className="cd-card animate-fade-up" style={{ width: '100%', maxWidth: 400, padding: '28px 24px' }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--cd-navy)', marginBottom: 6 }}>ACESSO POR CPF</h2>
          <p style={{ fontSize: 13, color: 'var(--cd-subtext)', marginBottom: 20, lineHeight: 1.5 }}>
            Para motoristas sem e-mail corporativo. Use o CPF e a senha fornecida pelo administrador.
          </p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="cd-label">CPF</label>
              <input className="cd-input" type="text" inputMode="numeric" placeholder="000.000.000-00"
                value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} maxLength={14} required />
            </div>
            <div>
              <label className="cd-label">Senha</label>
              <input className="cd-input" type="password" placeholder="Sua senha" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--cd-red-dim)', border: '1px solid var(--cd-red)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: 13, color: 'var(--cd-red)' }}>{error}</p>
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button type="button" onClick={() => router.push('/login')} className="btn-secondary">
              ← Voltar ao login
            </button>
          </form>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(33,39,113,0.05)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--cd-subtext)' }}>Esqueceu a senha? Fale com o administrador para redefini-la.</p>
          </div>
        </div>
      </div>
      <ConsuldataFooter />
    </main>
  )
}
