'use client'

import { ConsuldataFooter } from '@/components/ConsuldataFooter'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ChecklistRow {
  id: string
  status: 'open' | 'closed'
  created_at: string
  closed_at: string | null
  departure_km_final: number | null
  arrival_km_final: number | null
  departure_items: Array<{ id: string; status: string | null }> | null
  arrival_occurrences: Array<{ id: string; status: string }> | null
  synced_at: string | null
  vehicle: { plate: string; model: string } | null
  user: { name: string; email: string } | null
}

export default function AdminPage() {
  const router = useRouter()
  const [checklists, setChecklists] = useState<ChecklistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'nok'>('all')

  useEffect(() => { loadChecklists() }, [])

  async function loadChecklists() {
    const supabase = createClient()
    const { data } = await supabase
      .from('checklists')
      .select(`
        id, status, created_at, closed_at, synced_at,
        departure_km_final, arrival_km_final,
        departure_items, arrival_occurrences,
        vehicle:vehicles(plate, model),
        user:users(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setChecklists(data as unknown as ChecklistRow[])
    setLoading(false)
  }

  function hasNok(c: ChecklistRow) {
    const depNok = (c.departure_items ?? []).some(i => i.status === 'nok')
    const arrNok = (c.arrival_occurrences ?? []).length > 0
    return depNok || arrNok
  }

  const filtered = checklists.filter(c => {
    if (filter === 'open') return c.status === 'open'
    if (filter === 'nok') return hasNok(c)
    return true
  })

  const openCount = checklists.filter(c => c.status === 'open').length
  const nokCount  = checklists.filter(c => hasNok(c)).length
  const todayCount = checklists.filter(c =>
    new Date(c.created_at).toDateString() === new Date().toDateString()
  ).length

  async function handleLogout() {
    await createClient().auth.signOut()
    router.replace('/login')
  }

  return (
    <main className="min-h-screen" style={{ background: '#f0f2f9' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: '1px solid #1a2040' }}>
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <img
              src="https://www.consuldata.com.br/wp-content/uploads/2022/08/LOGO-SITE-1.png"
              alt="Consuldata"
              style={{ height: 30, width: 'auto', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#0f1535' }}>
              FLEET<span style={{ color: '#0D1B8E' }}>CHECK</span>
              <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b', marginLeft: 6 }}>Admin</span>
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => router.push('/check/scan')}
              style={{ padding: '6px 12px', borderRadius: 8, background: '#ffffff', border: '1px solid #1a2040', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
              Checklist
            </button>
            <button onClick={() => router.push('/admin/drivers')}
              style={{ padding: '6px 12px', borderRadius: 8, background: '#ffffff', border: '1px solid #1a2040', color: '#0f1535', fontSize: 12, cursor: 'pointer' }}>
              Motoristas
            </button>
            <button onClick={() => router.push('/admin/vehicles')}
              style={{ padding: '6px 12px', borderRadius: 8, background: '#ffffff', border: '1px solid #1a2040', color: '#0f1535', fontSize: 12, cursor: 'pointer' }}>
              Veículos
            </button>
            <button onClick={handleLogout}
              style={{ padding: '6px 12px', borderRadius: 8, background: '#ffffff', border: '1px solid #1a2040', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 px-5 py-4">
        {[
          { label: 'Total', value: checklists.length, color: '#0f1535' },
          { label: 'Em aberto', value: openCount, color: '#eab308' },
          { label: 'Pendências', value: nokCount, color: '#ef4444' },
          { label: 'Hoje', value: todayCount, color: '#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3 rounded-xl text-center" style={{ background: '#ffffff', border: '1px solid #1a2040' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
            <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 px-5 pb-4">
        {([
          { key: 'all',  label: 'Todos' },
          { key: 'open', label: '⚠ Em aberto' },
          { key: 'nok',  label: '🔴 Com pendência' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: filter === key ? '#fcb52f' : '#ffffff', border: `1px solid ${filter === key ? '#fcb52f' : '#dde2f0'}`, color: filter === key ? 'white' : '#6b7280' }}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#fcb52f', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="px-5 pb-8 flex flex-col gap-3">
          {filtered.length === 0 && (
            <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>Nenhum registro encontrado</p>
          )}
          {filtered.map((c) => {
            const nok = hasNok(c)
            const isOpen = c.status === 'open'
            const km = c.departure_km_final
            const date = new Date(c.created_at)
            const nokItems = (c.departure_items ?? []).filter(i => i.status === 'nok')
            const occurrences = c.arrival_occurrences ?? []

            return (
              <div key={c.id} className="p-4 rounded-xl"
                style={{ background: '#ffffff', border: `1px solid ${isOpen ? 'rgba(234,179,8,0.3)' : nok ? 'rgba(239,68,68,0.3)' : '#dde2f0'}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0f1535', fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {c.vehicle?.plate ?? '—'} · {c.vehicle?.model ?? '—'}
                    </p>
                    <p style={{ fontSize: 12, color: '#64748b' }}>{c.user?.name ?? c.user?.email ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: 12, color: '#64748b' }}>{date.toLocaleDateString('pt-BR')}</p>
                    <p style={{ fontSize: 11, color: '#64748b' }}>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status viagem */}
                  {isOpen ? (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
                      ⚠ Viagem em aberto
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', color: '#22c55e' }}>
                      ✓ Concluída
                    </span>
                  )}

                  {/* KM */}
                  {km && (
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      {km.toLocaleString('pt-BR')} km
                      {c.arrival_km_final ? ` → ${c.arrival_km_final.toLocaleString('pt-BR')} km` : ''}
                    </span>
                  )}

                  {/* Pendências na saída */}
                  {nokItems.length > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      🔴 {nokItems.length} pendência{nokItems.length > 1 ? 's' : ''} saída
                    </span>
                  )}

                  {/* Ocorrências na chegada */}
                  {occurrences.length > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                      🔴 {occurrences.length} ocorrência{occurrences.length > 1 ? 's' : ''} chegada
                    </span>
                  )}

                  {/* Offline */}
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
      <ConsuldataFooter />
    </main>
  )
}
