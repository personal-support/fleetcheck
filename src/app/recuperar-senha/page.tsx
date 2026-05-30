'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConsuldataFooter } from '@/components/ConsuldataFooter'

export default function RecuperarSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function regenerate() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase.from('users').select('cpf, birth_date, role').eq('id', user.id).single()
      if (!data?.cpf || !data?.birth_date) {
        // Admin — no formula password, just redirect to admin
        if (data?.role === 'admin') { router.replace('/definir-senha'); return }
        setError('Não foi possível recuperar sua senha. Contate o administrador.'); setLoading(false); return
      }

      // Re-derive password from CPF + birth_date
      const date = new Date(data.birth_date + 'T12:00:00')
      const dd = String(date.getDate()).padStart(2, '0')
      const cpfGroup2 = data.cpf.replace(/\D/g, '').slice(3, 6)
      const yearReversed = String(date.getFullYear()).slice(-2).split('').reverse().join('')
      const newPassword = `${dd}${cpfGroup2}${yearReversed}`

      // Update password in auth
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) { setError('Erro ao atualizar senha.'); setLoading(false); return }

      // Update in users table
      await supabase.from('users').update({ generated_password: newPassword }).eq('id', user.id)

      setPassword(newPassword)
      setLoading(false)
    }
    regenerate()
  }, [])

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
        <div className="cd-card animate-fade-up" style={{ width: '100%', maxWidth: 400, padding: '28px 24px', textAlign: 'center' }}>
          {loading ? (
            <div className="spin" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--cd-border)', borderTopColor: 'var(--cd-orange)', margin: '0 auto' }} />
          ) : error ? (
            <>
              <p style={{ color: 'var(--cd-red)', marginBottom: 16 }}>{error}</p>
              <button onClick={() => router.push('/login')} className="btn-primary">Voltar ao login</button>
            </>
          ) : (
            <>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--cd-green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="var(--cd-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--cd-navy)', marginBottom: 8 }}>SUA NOVA SENHA</h2>
              <p style={{ fontSize: 13, color: 'var(--cd-subtext)', marginBottom: 20 }}>Anote agora. Esta tela não será exibida novamente.</p>
              <div style={{ background: 'var(--cd-bg)', border: '2px solid var(--cd-orange)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 20 }}>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800, color: 'var(--cd-navy)', letterSpacing: 2 }}>{password}</p>
              </div>
              <button onClick={() => router.push('/login')} className="btn-primary">Ir para o login</button>
            </>
          )}
        </div>
      </div>
      <ConsuldataFooter />
    </main>
  )
}
