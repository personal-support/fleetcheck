'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConsuldataFooter } from '@/components/ConsuldataFooter'
import type { Vehicle } from '@/types'

export default function ScanPage() {
  const router = useRouter()
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrRef = useRef<{ stop: () => Promise<void> } | null>(null)
  const [mode, setMode] = useState<'list' | 'scan'>('list')
  const [search, setSearch] = useState('')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [loadingVehicle, setLoadingVehicle] = useState(false)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [openChecklist, setOpenChecklist] = useState<{ id: string } | null>(null)
  const [error, setError] = useState('')
  const [userName, setUserName] = useState('')
  const [scannerActive, setScannerActive] = useState(false)

  useEffect(() => { loadUser(); loadVehicles(); return () => { stopScanner() } }, [])

  async function loadUser() {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.replace('/login'); return }
      const { data } = await supabase.from('users').select('name, role').eq('id', authUser.id).single()
      if (data) setUserName(data.name.split(' ')[0])
    } catch { router.replace('/login') }
  }

  async function loadVehicles() {
    try {
      const supabase = createClient()
      const { data } = await supabase.from('vehicles').select('*').eq('active', true).order('plate')
      if (data) setVehicles(data as Vehicle[])
    } catch { }
    setLoadingVehicles(false)
  }

  async function stopScanner() {
    try { if (html5QrRef.current) { await html5QrRef.current.stop(); html5QrRef.current = null } } catch { }
    setScannerActive(false)
  }

  async function startScanner() {
    setError(''); setScannerActive(true)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      await new Promise(r => setTimeout(r, 100))
      if (!document.getElementById('qr-reader')) { setScannerActive(false); return }
      const scanner = new Html5Qrcode('qr-reader')
      html5QrRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decoded: string) => { await stopScanner(); await selectVehicleById(decoded.trim()) },
        () => {}
      )
    } catch { setScannerActive(false); setError('Câmera não disponível. Use a lista de veículos.'); setMode('list') }
  }

  async function selectVehicleById(vehicleId: string) {
    setLoadingVehicle(true); setError('')
    try {
      const supabase = createClient()
      const { data } = await supabase.from('vehicles').select('*').eq('id', vehicleId).eq('active', true).single()
      if (!data) { setError('Veículo não encontrado.'); setLoadingVehicle(false); return }
      await confirmVehicle(data as Vehicle)
    } catch { setError('Erro ao buscar veículo.') }
    setLoadingVehicle(false)
  }

  async function confirmVehicle(v: Vehicle) {
    setVehicle(v); setError('')
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: vehicleOpen } = await supabase.from('checklists').select('id').eq('vehicle_id', v.id).eq('status', 'open').limit(1).single()
      if (vehicleOpen) { setOpenChecklist({ id: vehicleOpen.id }); return }
      if (authUser) {
        const { data: driverOpen } = await supabase.from('checklists')
          .select('id, vehicle_id, vehicles(plate, model)').eq('user_id', authUser.id).eq('status', 'open').limit(1).single()
        if (driverOpen) {
          const other = (Array.isArray(driverOpen.vehicles) ? driverOpen.vehicles[0] : driverOpen.vehicles) as { plate: string; model: string } | null
          setVehicle(null)
          setError(`Você tem uma viagem em aberto no veículo ${other?.plate ?? '—'} (${other?.model ?? ''}). Finalize-a antes de iniciar uma nova.`)
          return
        }
      }
      setOpenChecklist(null)
    } catch { setOpenChecklist(null) }
  }

  function proceed() {
    if (!vehicle) return
    sessionStorage.setItem('fc_vehicle', JSON.stringify(vehicle))
    if (openChecklist) {
      sessionStorage.setItem('fc_checklist_id', openChecklist.id)
      sessionStorage.setItem('fc_phase', 'arrival')
      router.push('/check/odometer')
    } else {
      sessionStorage.removeItem('fc_checklist_id')
      sessionStorage.setItem('fc_phase', 'departure')
      router.push('/check/odometer')
    }
  }

  const filtered = vehicles.filter(v => v.plate.includes(search.toUpperCase()) || v.model.toUpperCase().includes(search.toUpperCase()))

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cd-bg)' }}>

      {/* Header */}
      <header style={{ background: 'var(--cd-navy)', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'relative' }}>
          {/* Logo */}
          <img src="https://www.consuldata.com.br/wp-content/uploads/2022/08/LOGO-SITE-1.png" alt="Consuldata"
            style={{ height: 38, width: 'auto', filter: 'brightness(0) invert(1)', objectFit: 'contain', flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          {/* App name center */}
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '0.5px', position: 'absolute', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
            FLEET<span style={{ color: 'var(--cd-orange)' }}>CHECK</span>
          </span>
          {/* User + logout */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            {userName && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, whiteSpace: 'nowrap' }}>{userName}</span>}
            <button onClick={async () => { await createClient().auth.signOut(); router.replace('/login') }}
              style={{ background: 'rgba(248,105,36,0.2)', border: '1px solid rgba(248,105,36,0.4)', color: 'var(--cd-orange)', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              SAIR
            </button>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Vehicle confirmed */}
        {vehicle ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
            <div className="animate-fade-up" style={{ width: '100%', maxWidth: 420 }}>

              {/* Status banner */}
              {openChecklist ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', background: 'var(--cd-warn-dim)', border: '1px solid var(--cd-warn)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--cd-warn)', fontSize: 13, marginBottom: 2 }}>Viagem em aberto</p>
                    <p style={{ fontSize: 12, color: 'var(--cd-text)' }}>Este veículo tem uma saída sem chegada registrada.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', background: 'var(--cd-green-dim)', border: '1px solid var(--cd-green)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="var(--cd-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <p style={{ fontSize: 13, color: 'var(--cd-green)', fontWeight: 700 }}>Veículo disponível — sem viagem em aberto</p>
                </div>
              )}

              {/* Vehicle card */}
              <div className="cd-card" style={{ overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ background: 'var(--cd-navy)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: 1, lineHeight: 1 }}>{vehicle.plate}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{vehicle.model} · {vehicle.year}</p>
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M3 12l1-5h16l1 5M3 12v5a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-5M3 12h18" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="7.5" cy="15.5" r="1" fill="white"/><circle cx="16.5" cy="15.5" r="1" fill="white"/>
                    </svg>
                  </div>
                </div>
                {/* Card body */}
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'KM registrado', value: vehicle.last_km ? `${vehicle.last_km.toLocaleString('pt-BR')} km` : '—' },
                    { label: 'Último check', value: vehicle.last_check_at ? new Date(vehicle.last_check_at).toLocaleDateString('pt-BR') : 'Nunca' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: '10px 12px', background: 'var(--cd-bg)', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ fontSize: 12, color: 'var(--cd-subtext)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cd-text)' }}>{value}</p>
                    </div>
                  ))}
                </div>
                {/* Card action */}
                <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={proceed} className="btn-primary"
                    style={{ background: openChecklist ? 'var(--cd-warn)' : 'var(--cd-orange)', letterSpacing: '0.04em', fontSize: 16, minHeight: 56 }}>
                    {openChecklist ? '⚠️  REGISTRAR CHEGADA' : '🚗  INICIAR CHECKLIST DE SAÍDA'}
                  </button>
                  <button onClick={() => { setVehicle(null); setOpenChecklist(null); setError('') }} className="btn-secondary">
                    Escolher outro veículo
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {([
                { key: 'list', label: '📋  Lista' },
                { key: 'scan', label: '📷  QR Code' },
              ] as const).map(({ key, label }) => (
                <button key={key}
                  onClick={() => { if (key === 'scan') { setMode('scan'); startScanner() } else { stopScanner(); setMode('list') } }}
                  style={{
                    padding: '8px 18px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: mode === key ? 'var(--cd-navy)' : 'var(--cd-surface)',
                    color: mode === key ? '#fff' : 'var(--cd-subtext)',
                    border: `1px solid ${mode === key ? 'var(--cd-navy)' : 'var(--cd-border)'}`,
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '12px 16px', background: 'var(--cd-warn-dim)', border: '1px solid var(--cd-warn)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--cd-text)', fontWeight: 700, marginBottom: 4 }}>⚠️ Viagem em aberto</p>
                <p style={{ fontSize: 13, color: 'var(--cd-text)' }}>{error}</p>
                <button onClick={async () => {
                  const supabase = createClient()
                  const { data: { user: authUser } } = await supabase.auth.getUser()
                  if (!authUser) return
                  const { data } = await supabase.from('checklists')
                    .select('id, vehicle_id, vehicles(plate, model, year, last_km, last_check_at, last_location_lat, last_location_lng, active, company_id, vehicle_type, created_at)')
                    .eq('user_id', authUser.id).eq('status', 'open').order('created_at', { ascending: false }).limit(1).single()
                  if (data) {
                    const veh = (Array.isArray(data.vehicles) ? data.vehicles[0] : data.vehicles) as unknown as Vehicle
                    sessionStorage.setItem('fc_vehicle', JSON.stringify({ ...veh, id: data.vehicle_id }))
                    sessionStorage.setItem('fc_checklist_id', data.id)
                    sessionStorage.setItem('fc_phase', 'arrival')
                    router.push('/check/odometer')
                  }
                }}
                  style={{ marginTop: 8, padding: '6px 14px', background: 'var(--cd-warn)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Ir para registrar chegada →
                </button>
              </div>
            )}

            {/* LIST */}
            {mode === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8" stroke="var(--cd-subtext)" strokeWidth="1.5"/>
                    <path d="M21 21l-4.35-4.35" stroke="var(--cd-subtext)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input className="cd-input" type="text" placeholder="Buscar por placa..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 38 }} />
                </div>

                {loadingVehicles ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--cd-border)', borderTopColor: 'var(--cd-orange)', margin: '0 auto' }} />
                  </div>
                ) : filtered.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--cd-subtext)', padding: '40px 0', fontSize: 13 }}>
                    {search ? `Nenhum veículo com "${search}"` : 'Nenhum veículo disponível'}
                  </p>
                ) : (
                  filtered.map(v => (
                    <button key={v.id} onClick={() => !loadingVehicle && confirmVehicle(v)}
                      disabled={loadingVehicle}
                      className="cd-card"
                      style={{ width: '100%', padding: '18px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--cd-border)', opacity: loadingVehicle ? 0.6 : 1, transition: 'box-shadow 0.15s, border-color 0.15s', background: 'var(--cd-surface)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--cd-orange)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-md)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--cd-border)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--cd-navy-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M3 12l1-5h16l1 5M3 12v5a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-5M3 12h18" stroke="var(--cd-navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="7.5" cy="15.5" r="1" fill="var(--cd-navy)"/><circle cx="16.5" cy="15.5" r="1" fill="var(--cd-navy)"/>
                          </svg>
                        </div>
                        <div>
                          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--cd-navy)', letterSpacing: 0.5 }}>{v.plate}</p>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#5e6673', marginTop: 2 }}>{v.model} · {v.year}</p>
                        </div>
                      </div>
                      {loadingVehicle
                        ? <div className="spin" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--cd-border)', borderTopColor: 'var(--cd-orange)', flexShrink: 0 }} />
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="var(--cd-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      }
                    </button>
                  ))
                )}
              </div>
            )}

            {/* SCAN */}
            {mode === 'scan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, color: 'var(--cd-subtext)' }}>Aponte para o QR Code fixado no veículo</p>
                <div className="cd-card" style={{ overflow: 'hidden', position: 'relative', height: 300 }}>
                  <div id="qr-reader" ref={scannerRef} style={{ width: '100%', height: '100%' }} />
                  {scannerActive && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ position: 'relative', width: 200, height: 200 }}>
                        {[
                          { top: 0, left: 0, borderTop: '3px solid var(--cd-orange)', borderLeft: '3px solid var(--cd-orange)', borderRadius: '4px 0 0 0' },
                          { top: 0, right: 0, borderTop: '3px solid var(--cd-orange)', borderRight: '3px solid var(--cd-orange)', borderRadius: '0 4px 0 0' },
                          { bottom: 0, left: 0, borderBottom: '3px solid var(--cd-orange)', borderLeft: '3px solid var(--cd-orange)', borderRadius: '0 0 0 4px' },
                          { bottom: 0, right: 0, borderBottom: '3px solid var(--cd-orange)', borderRight: '3px solid var(--cd-orange)', borderRadius: '0 0 4px 0' },
                        ].map((s, i) => (
                          <div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {!scannerActive && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cd-bg)' }}>
                      <div className="spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--cd-border)', borderTopColor: 'var(--cd-orange)' }} />
                    </div>
                  )}
                </div>
                {loadingVehicle && <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--cd-orange)', fontWeight: 700 }}>Identificando veículo...</p>}
              </div>
            )}
          </div>
        )}
      </div>
      <ConsuldataFooter />
    </main>
  )
}
