'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ConsuldataFooter } from '@/components/ConsuldataFooter'

interface ChecklistItem {
  id: string
  status: string | null
  label?: string
  icon?: string
  nok_data?: Record<string, string>
  photo_url?: string
}

interface ChecklistRow {
  id: string; status: 'open' | 'closed'; created_at: string; closed_at: string | null
  departure_km_final: number | null; arrival_km_final: number | null
  departure_items: ChecklistItem[] | null
  arrival_occurrences: Array<{ id: string; status: string; description?: string; photo_url?: string }> | null
  departure_notes: string | null
  arrival_notes: string | null
  synced_at: string | null
  vehicle: { plate: string; model: string } | null
  user: { name: string; email: string } | null
}

export default function AdminPage() {
  const router = useRouter()
  const [checklists, setChecklists] = useState<ChecklistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingInvites, setPendingInvites] = useState(0)
  const [templateItems, setTemplateItems] = useState<Record<string, {label: string; icon: string}>>({})
  const [filter, setFilter] = useState<'all' | 'open' | 'nok'>('all')
  const [selected, setSelected] = useState<ChecklistRow | null>(null)

  useEffect(() => { loadChecklists(); loadPendingInvites(); loadTemplate() }, [])

  async function loadTemplate() {
    const supabase = createClient()
    const { data } = await supabase.from('checklist_templates').select('items').single()
    if (data?.items) {
      const map: Record<string, {label: string; icon: string}> = {}
      ;(data.items as {id: string; label: string; icon: string}[]).forEach(i => { map[i.id] = { label: i.label, icon: i.icon } })
      setTemplateItems(map)
    }
  }

  async function loadPendingInvites() {
    const supabase = createClient()
    const { count } = await supabase.from('admin_invites').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    if (count) setPendingInvites(count)
  }

  async function loadChecklists() {
    const supabase = createClient()
    const { data } = await supabase.from('checklists')
      .select('id, status, created_at, closed_at, synced_at, departure_km_final, arrival_km_final, departure_items, arrival_occurrences, departure_notes, arrival_notes, vehicle:vehicles(plate, model), user:users(name, email)')
      .order('created_at', { ascending: false }).limit(50)
    if (data) setChecklists(data as unknown as ChecklistRow[])
    setLoading(false)
  }

  function hasNok(c: ChecklistRow) {
    return (c.departure_items ?? []).some(i => i.status === 'nok') || (c.arrival_occurrences ?? []).length > 0
  }

  const filtered = checklists.filter(c => filter === 'open' ? c.status === 'open' : filter === 'nok' ? hasNok(c) : true)
  const openCount = checklists.filter(c => c.status === 'open').length
  const nokCount = checklists.filter(c => hasNok(c)).length
  const todayCount = checklists.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cd-bg)' }}>

      {/* Header */}
      <header style={{ background: 'var(--cd-navy)', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'relative' }}>
          <img src="/LOGO_CONSULDATA.png" alt="Consuldata" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', position: 'absolute', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
            FLEET<span style={{ color: 'var(--cd-orange)' }}>CHECK</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)', marginLeft: 6 }}>Admin</span>
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { label: '📊 Analytics', action: () => router.push('/admin/analiticos') },
                { label: pendingInvites > 0 ? `🔔 Convites (${pendingInvites})` : 'Convites', action: () => router.push('/admin/convites') },
                { label: 'Checklist', action: () => router.push('/check/selecionar') },
                { label: 'Motoristas', action: () => router.push('/admin/motoristas') },
                { label: 'Veículos', action: () => router.push('/admin/veiculos') },
              ].map(({ label, action }) => (
                <button key={label} onClick={action}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', letterSpacing: '0.03em' }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={async () => { await createClient().auth.signOut(); router.replace('/login') }}
              style={{ background: 'rgba(248,105,36,0.2)', border: '1px solid rgba(248,105,36,0.4)', color: 'var(--cd-orange)', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', alignSelf: 'flex-end' }}>
              SAIR
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div style={{ padding: '20px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, maxWidth: 800, width: '100%', margin: '0 auto' }}>
        {[
          { label: 'Total', value: checklists.length, color: 'var(--cd-navy)', bg: 'var(--cd-navy-dim)' },
          { label: 'Em aberto', value: openCount, color: 'var(--cd-warn)', bg: 'var(--cd-warn-dim)' },
          { label: 'Pendências', value: nokCount, color: 'var(--cd-red)', bg: 'var(--cd-red-dim)' },
          { label: 'Hoje', value: todayCount, color: 'var(--cd-green)', bg: 'var(--cd-green-dim)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--cd-surface)', border: '1px solid var(--cd-border)', borderRadius: 'var(--radius-md)', padding: '14px 12px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--cd-subtext)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding: '16px 20px 8px', display: 'flex', gap: 8, maxWidth: 800, width: '100%', margin: '0 auto' }}>
        {([
          { key: 'all', label: 'Todos' },
          { key: 'open', label: '⚠ Em aberto' },
          { key: 'nok', label: '🔴 Com pendência' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', background: filter === key ? 'var(--cd-navy)' : 'var(--cd-surface)', color: filter === key ? '#fff' : 'var(--cd-subtext)', border: `1px solid ${filter === key ? 'var(--cd-navy)' : 'var(--cd-border)'}`, fontFamily: "'Open Sans', sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, padding: '8px 20px 24px', maxWidth: 800, width: '100%', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spin" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--cd-border)', borderTopColor: 'var(--cd-orange)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--cd-subtext)', padding: '60px 0', fontSize: 14 }}>Nenhum registro encontrado</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(c => {
              const nok = hasNok(c)
              const isOpen = c.status === 'open'
              const nokItems = (c.departure_items ?? []).filter(i => i.status === 'nok')
              const occs = c.arrival_occurrences ?? []
              const date = new Date(c.created_at)
              const borderColor = isOpen ? 'var(--cd-warn)' : nok ? 'var(--cd-red)' : 'var(--cd-border)'

              return (
                <div key={c.id} style={{ background: 'var(--cd-surface)', border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                  {(isOpen || nok) && <div style={{ height: 3, background: isOpen ? 'var(--cd-warn)' : 'var(--cd-red)' }} />}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 700, color: 'var(--cd-navy)' }}>
                          {c.vehicle?.plate ?? '—'} <span style={{ fontWeight: 400, color: 'var(--cd-subtext)' }}>· {c.vehicle?.model ?? '—'}</span>
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--cd-subtext)', marginTop: 2 }}>{c.user?.name ?? c.user?.email ?? '—'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 12, color: 'var(--cd-text)', fontWeight: 700 }}>{date.toLocaleDateString('pt-BR')}</p>
                        <p style={{ fontSize: 11, color: 'var(--cd-subtext)' }}>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className={`badge ${isOpen ? 'badge-warn' : 'badge-green'}`}>
                          {isOpen ? '⚠ Em aberto' : '✓ Concluída'}
                        </span>
                        {c.departure_km_final && (
                          <span style={{ fontSize: 11, color: 'var(--cd-subtext)' }}>
                            {c.departure_km_final.toLocaleString('pt-BR')} km
                            {c.arrival_km_final ? ` → ${c.arrival_km_final.toLocaleString('pt-BR')} km` : ''}
                          </span>
                        )}
                        {nokItems.length > 0 && <span className="badge badge-red">🔴 {nokItems.length} pendência{nokItems.length > 1 ? 's' : ''}</span>}
                        {occs.length > 0 && <span className="badge badge-red">🔴 {occs.length} ocorrência{occs.length > 1 ? 's' : ''}</span>}
                        {!c.synced_at && <span className="badge badge-warn">offline</span>}
                      </div>
                      <button onClick={() => setSelected(c)}
                        style={{ fontSize: 11, fontWeight: 700, color: 'var(--cd-navy)', background: 'var(--cd-navy-dim)', border: '1px solid rgba(33,39,113,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Open Sans', sans-serif" }}>
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConsuldataFooter />

      {/* Detail Modal */}
      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--cd-surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 600, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Modal header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--cd-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--cd-navy)' }}>
                  {selected.vehicle?.plate} <span style={{ fontWeight: 400, color: 'var(--cd-subtext)', fontSize: 14 }}>· {selected.vehicle?.model}</span>
                </p>
                <p style={{ fontSize: 12, color: 'var(--cd-subtext)' }}>
                  {selected.user?.name} · {new Date(selected.created_at).toLocaleDateString('pt-BR')} {new Date(selected.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--cd-subtext)', lineHeight: 1 }}>×</button>
            </div>

            {/* Modal body */}
            <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* KM row */}
              {(selected.departure_km_final || selected.arrival_km_final) && (
                <div style={{ display: 'flex', gap: 10 }}>
                  {selected.departure_km_final && (
                    <div style={{ flex: 1, padding: '10px 14px', background: 'var(--cd-bg)', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--cd-subtext)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>KM Saída</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--cd-text)' }}>{selected.departure_km_final.toLocaleString('pt-BR')} km</p>
                    </div>
                  )}
                  {selected.arrival_km_final && (
                    <div style={{ flex: 1, padding: '10px 14px', background: 'var(--cd-bg)', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--cd-subtext)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>KM Chegada</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--cd-text)' }}>{selected.arrival_km_final.toLocaleString('pt-BR')} km</p>
                    </div>
                  )}
                  {selected.departure_km_final && selected.arrival_km_final && (
                    <div style={{ flex: 1, padding: '10px 14px', background: 'var(--cd-bg)', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--cd-subtext)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Rodado</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--cd-navy)' }}>{(selected.arrival_km_final - selected.departure_km_final).toLocaleString('pt-BR')} km</p>
                    </div>
                  )}
                </div>
              )}

              {/* Checklist items */}
              {(selected.departure_items ?? []).length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--cd-subtext)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Checklist de Saída</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(selected.departure_items ?? []).map((item, i) => (
                      <div key={item.id ?? i} style={{ border: `1px solid ${item.status === 'nok' ? 'var(--cd-red)' : 'var(--cd-border)'}`, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: item.status === 'nok' ? 'var(--cd-red-dim)' : 'var(--cd-surface)' }}>
                        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {(item.icon || templateItems[item.id]?.icon) && <span style={{ fontSize: 18 }}>{item.icon ?? templateItems[item.id]?.icon}</span>}
                            <span style={{ fontSize: 14, fontWeight: item.status === 'nok' ? 700 : 400, color: 'var(--cd-text)' }}>
                              {item.label ?? templateItems[item.id]?.label ?? `Item ${i + 1}`}
                            </span>
                          </div>
                          <span className={`badge ${item.status === 'ok' ? 'badge-green' : item.status === 'nok' ? 'badge-red' : 'badge-navy'}`}>
                            {item.status === 'ok' ? '✓ OK' : item.status === 'nok' ? '⚠ Pendência' : '—'}
                          </span>
                        </div>

                        {/* NOK details */}
                        {item.status === 'nok' && (
                          <div style={{ borderTop: '1px solid rgba(240,90,73,0.2)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {item.nok_data && Object.keys(item.nok_data).filter(k => k !== 'foto').length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {Object.entries(item.nok_data).filter(([k]) => k !== 'foto').map(([k, v]) => (
                                  <div key={k} style={{ background: 'rgba(240,90,73,0.08)', border: '1px solid rgba(240,90,73,0.2)', borderRadius: 6, padding: '3px 10px' }}>
                                    <span style={{ fontSize: 11, color: 'var(--cd-red)', fontWeight: 700 }}>{k}: </span>
                                    <span style={{ fontSize: 11, color: 'var(--cd-text)' }}>{v}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.photo_url && item.photo_url.startsWith('http') && (
                              <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--cd-subtext)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Foto do problema</p>
                                <img
                                  src={item.photo_url}
                                  alt="Foto do problema"
                                  style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                                  onClick={() => window.open(item.photo_url, '_blank')}
                                />
                                <p style={{ fontSize: 10, color: 'var(--cd-subtext)', marginTop: 4 }}>Toque na foto para ampliar</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Arrival occurrences */}
              {(selected.arrival_occurrences ?? []).length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--cd-subtext)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ocorrências na Chegada</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(selected.arrival_occurrences ?? []).map((occ, i) => (
                      <div key={occ.id ?? i} style={{ border: '1px solid var(--cd-red)', borderRadius: 'var(--radius-sm)', background: 'var(--cd-red-dim)', padding: '10px 14px' }}>
                        {occ.description && <p style={{ fontSize: 13, color: 'var(--cd-text)', marginBottom: occ.photo_url ? 8 : 0 }}>{occ.description}</p>}
                        {occ.photo_url && occ.photo_url.startsWith('http') && (
                          <img src={occ.photo_url} alt="Ocorrência" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', marginTop: 4 }} onClick={() => window.open(occ.photo_url, '_blank')} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selected.arrival_notes && (
                <div style={{ padding: '10px 14px', background: 'var(--cd-bg)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--cd-subtext)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Observações</p>
                  <p style={{ fontSize: 13, color: 'var(--cd-text)' }}>{selected.arrival_notes}</p>
                </div>
              )}

              {selected.status === 'open' && (
                <div style={{ padding: '12px 14px', background: 'var(--cd-warn-dim)', border: '1px solid var(--cd-warn)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: 13, color: 'var(--cd-warn)', fontWeight: 700 }}>⚠ Viagem em aberto — chegada ainda não registrada.</p>
                </div>
              )}

              <div style={{ height: 8 }} />
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
