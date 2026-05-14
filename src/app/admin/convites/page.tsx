'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConsuldataFooter } from '@/components/ConsuldataFooter'
import { BackButton } from '@/components/BackButton'

interface Invite { id: string; email: string; status: string; requested_at: string }

export default function ConvitesPage() {
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [userId, setUserId] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    setUserId(user.id)
    const { data } = await supabase.from('admin_invites').select('*').order('requested_at', { ascending: false })
    if (data) setInvites(data as Invite[])
    setLoading(false)
  }

  async function handleAction(inviteId: string, action: 'approve' | 'reject') {
    setWorking(inviteId)
    const res = await fetch('/api/admin-invite', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteId, action, reviewerId: userId }) })
    if (res.ok) loadData()
    else alert('Erro ao processar. Tente novamente.')
    setWorking(null)
  }

  const pending = invites.filter(i => i.status === 'pending')
  const reviewed = invites.filter(i => i.status !== 'pending')

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cd-bg)', paddingBottom: 80 }}>
      <header style={{ background: 'var(--cd-navy)', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'relative' }}>
          <img src="/LOGO_CONSULDATA.png" alt="Consuldata" style={{ height: 36, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            FLEET<span style={{ color: 'var(--cd-orange)' }}>CHECK</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)', marginLeft: 6 }}>Convites</span>
          </span>
          <div />
        </div>
      </header>

      <div style={{ flex: 1, padding: '20px', maxWidth: 600, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spin" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--cd-border)', borderTopColor: 'var(--cd-orange)' }} />
          </div>
        ) : (
          <>
            <div className="cd-card" style={{ padding: '16px 18px' }}>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--cd-navy)', marginBottom: 14 }}>
                ⏳ Aguardando aprovação ({pending.length})
              </p>
              {pending.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--cd-subtext)' }}>Nenhuma solicitação pendente.</p>
              ) : pending.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--cd-border)' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cd-text)' }}>{inv.email}</p>
                    <p style={{ fontSize: 12, color: 'var(--cd-subtext)' }}>Solicitado em {new Date(inv.requested_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleAction(inv.id, 'reject')} disabled={working === inv.id}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--cd-red)', background: 'var(--cd-red-dim)', color: 'var(--cd-red)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif" }}>
                      Rejeitar
                    </button>
                    <button onClick={() => handleAction(inv.id, 'approve')} disabled={working === inv.id}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--cd-green)', background: 'var(--cd-green-dim)', color: 'var(--cd-green)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif" }}>
                      {working === inv.id ? '...' : 'Aprovar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {reviewed.length > 0 && (
              <div className="cd-card" style={{ padding: '16px 18px' }}>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--cd-navy)', marginBottom: 14 }}>
                  Histórico ({reviewed.length})
                </p>
                {reviewed.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--cd-border)' }}>
                    <div>
                      <p style={{ fontSize: 13, color: 'var(--cd-text)' }}>{inv.email}</p>
                      <p style={{ fontSize: 11, color: 'var(--cd-subtext)' }}>{new Date(inv.requested_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`badge ${inv.status === 'approved' ? 'badge-green' : 'badge-red'}`}>
                      {inv.status === 'approved' ? '✓ Aprovado' : '✕ Rejeitado'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <ConsuldataFooter />
      <BackButton href="/admin" label="Voltar para o painel" />
    </main>
  )
}
