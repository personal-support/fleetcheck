'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CONSULDATA_COMPANY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

interface Invite {
  id: string
  email: string
  role: string
  used_at: string | null
  created_at: string
}

export default function AdminDriversPage() {
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadInvites() }, [])

  async function loadInvites() {
    const supabase = createClient()
    const { data } = await supabase
      .from('user_invites')
      .select('*')
      .eq('company_id', CONSULDATA_COMPANY_ID)
      .order('created_at', { ascending: false })
    if (data) setInvites(data as Invite[])
    setLoading(false)
  }

  async function addInvite() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setError('E-mail inválido.')
      return
    }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.from('user_invites').insert({
      company_id: CONSULDATA_COMPANY_ID,
      email: trimmed,
      role: 'driver',
    })

    if (err) {
      setError(err.code === '23505' ? 'E-mail já cadastrado.' : 'Erro ao adicionar.')
    } else {
      setEmail('')
      loadInvites()
    }
    setSaving(false)
  }

  async function removeInvite(id: string) {
    const supabase = createClient()
    await supabase.from('user_invites').delete().eq('id', id)
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  return (
    <main className="min-h-screen" style={{ background: '#0a0c0f' }}>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3" style={{ borderBottom: '1px solid #1e2229' }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#e8eaf0' }}>
          MOTORISTAS
        </h1>
      </div>

      {/* Explicação */}
      <div className="mx-5 mt-4 p-4 rounded-xl" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
        <p style={{ fontSize: 13, color: '#e8eaf0', lineHeight: 1.6 }}>
          Cadastre o e-mail do motorista aqui. Na primeira vez que ele fizer login em{' '}
          <span style={{ color: '#f97316' }}>fleetcheck.vercel.app</span>, o acesso é liberado automaticamente.
          Funciona com Gmail ou e-mail @consuldata.com.br.
        </p>
      </div>

      {/* Add form */}
      <div className="mx-5 mt-4 p-4 rounded-xl" style={{ background: '#111318', border: '1px solid #1e2229' }}>
        <label style={{ display: 'block', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Adicionar motorista
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="motorista@gmail.com ou nome@consuldata.com.br"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && addInvite()}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8,
              background: '#0a0c0f', border: '1px solid #1e2229',
              color: '#e8eaf0', fontSize: 14, outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#f97316'}
            onBlur={e => e.target.style.borderColor = '#1e2229'}
          />
          <button
            onClick={addInvite}
            disabled={saving}
            style={{
              padding: '10px 18px', borderRadius: 8,
              background: saving ? '#7c3d12' : '#f97316',
              color: 'white', fontWeight: 600, fontSize: 13,
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {saving ? '...' : '+ Adicionar'}
          </button>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{error}</p>}
      </div>

      {/* List */}
      <div className="px-5 pt-4 pb-8 flex flex-col gap-2">
        <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          {invites.length} cadastrado{invites.length !== 1 ? 's' : ''}
        </p>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
          </div>
        )}

        {invites.map(inv => (
          <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: '#111318', border: '1px solid #1e2229' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: inv.used_at ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke={inv.used_at ? '#22c55e' : '#f97316'} strokeWidth="1.5"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={inv.used_at ? '#22c55e' : '#f97316'} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 13, color: '#e8eaf0', fontWeight: 500 }}>{inv.email}</p>
                <p style={{ fontSize: 11, color: '#6b7280' }}>
                  {inv.role === 'admin' ? 'Admin' : 'Motorista'} ·{' '}
                  {inv.used_at
                    ? `Acessou em ${new Date(inv.used_at).toLocaleDateString('pt-BR')}`
                    : 'Aguardando primeiro acesso'}
                </p>
              </div>
            </div>
            {inv.role !== 'admin' && (
              <button
                onClick={() => removeInvite(inv.id)}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
