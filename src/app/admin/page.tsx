'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Checklist } from '@/types'

async function logout(router: ReturnType<typeof useRouter>) {
  await createClient().auth.signOut()
  router.replace('/login')
}

export default function AdminPage() {
  const router = useRouter()
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'nok'>('all')

  useEffect(() => {
    loadChecklists()
  }, [])

  async function loadChecklists() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('checklists')
      .select(`*, vehicle:vehicles(plate, model), user:users(name, email)`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) setChecklists(data as Checklist[])
    setLoading(false)
  }

  const filtered = filter === 'nok'
    ? checklists.filter(c => c.items.some(i => i.status === 'nok'))
    : checklists

  const nokCount = checklists.filter(c => c.items.some(i => i.status === 'nok')).length

  return (
    <main className="min-h-screen" style={{ background: '#0a0c0f' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: '1px solid #1e2229' }}>
        <div className="flex items-center justify-between mb-1">
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, color: '#e8eaf0' }}>
            FLEET<span style={{ color: '#f97316' }}>CHECK</span>
            <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>Admin</span>
          </h1>
          <div className="flex gap-2">
          <button onClick={() => router.push('/check/scan')}
            style={{ padding: '6px 12px', borderRadius: 8, background: '#111318', border: '1px solid #1e2229', color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>
            Fazer checklist
          </button>
          <button onClick={() => router.push('/admin/drivers')}
            style={{ padding: '6px 12px', borderRadius: 8, background: '#111318', border: '1px solid #1e2229', color: '#e8eaf0', fontSize: 12, cursor: 'pointer' }}>
            Motoristas
          </button>
          <button onClick={() => router.push('/admin/vehicles')}
            style={{ padding: '6px 12px', borderRadius: 8, background: '#111318', border: '1px solid #1e2229', color: '#e8eaf0', fontSize: 12, cursor: 'pointer' }}>
            Veículos
          </button>
          <button onClick={() => logout(router)}
            style={{ padding: '6px 12px', borderRadius: 8, background: '#111318', border: '1px solid #1e2229', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
            Sair
          </button>
        </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-5 py-4">
        {[
          { label: 'Total', value: checklists.length, color: '#e8eaf0' },
          { label: 'Com pendência', value: nokCount, color: '#ef4444' },
          { label: 'Hoje', value: checklists.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length, color: '#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3 rounded-xl text-center" style={{ background: '#111318', border: '1px solid #1e2229' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
            <p style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-5 pb-4">
        {(['all', 'nok'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              background: filter === f ? '#f97316' : '#111318',
              border: `1px solid ${filter === f ? '#f97316' : '#1e2229'}`,
              color: filter === f ? 'white' : '#6b7280',
            }}>
            {f === 'all' ? 'Todos' : 'Com pendência'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="px-5 pb-8 flex flex-col gap-3">
          {filtered.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
              Nenhum checklist encontrado
            </p>
          )}
          {filtered.map((c) => {
            const nokItems = c.items.filter(i => i.status === 'nok')
            const date = new Date(c.created_at)
            return (
              <div key={c.id} className="p-4 rounded-xl" style={{ background: '#111318', border: `1px solid ${nokItems.length > 0 ? 'rgba(239,68,68,0.3)' : '#1e2229'}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#e8eaf0', fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {c.vehicle?.plate ?? '—'} · {c.vehicle?.model ?? '—'}
                    </p>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>
                      {c.user?.name ?? c.user?.email ?? '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: 12, color: '#6b7280' }}>
                      {date.toLocaleDateString('pt-BR')}
                    </p>
                    <p style={{ fontSize: 11, color: '#6b7280' }}>
                      {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {c.km_reading && (
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      🔢 {c.km_reading.toLocaleString('pt-BR')} km
                    </span>
                  )}
                  {nokItems.length === 0 ? (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                      ✓ Tudo OK
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      ⚠ {nokItems.length} pendência{nokItems.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {!c.synced_at && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
                      offline
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
