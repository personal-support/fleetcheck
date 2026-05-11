'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Vehicle } from '@/types'

export default function ScanPage() {
  const router = useRouter()
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrRef = useRef<{ stop: () => Promise<void> } | null>(null)

  const [mode, setMode] = useState<'list' | 'scan'>('list')
  const [scannerActive, setScannerActive] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [loadingVehicle, setLoadingVehicle] = useState(false)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [openChecklist, setOpenChecklist] = useState<{ id: string } | null>(null)
  const [error, setError] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    loadUser()
    loadVehicles()
    return () => { stopScanner() }
  }, [])

  async function loadUser() {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.replace('/login'); return }
      const { data } = await supabase.from('users').select('name, role').eq('id', authUser.id).single()
      if (data) {
        setUserName(data.name.split(' ')[0])
        if (data.role === 'admin') {
          // Admin can access scan but also has admin panel
        }
      }
    } catch { router.replace('/login') }
  }

  async function loadVehicles() {
    try {
      const supabase = createClient()
      const { data } = await supabase.from('vehicles').select('*').eq('active', true).order('plate')
      if (data) setVehicles(data as Vehicle[])
    } catch { /* ignore */ }
    setLoadingVehicles(false)
  }

  async function stopScanner() {
    try {
      if (html5QrRef.current) {
        await html5QrRef.current.stop()
        html5QrRef.current = null
      }
    } catch { /* ignore */ }
    setScannerActive(false)
  }

  async function startScanner() {
    setError('')
    setScannerActive(true)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      // Wait for DOM to be ready
      await new Promise(r => setTimeout(r, 100))
      if (!document.getElementById('qr-reader')) { setScannerActive(false); return }
      const scanner = new Html5Qrcode('qr-reader')
      html5QrRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decoded: string) => {
          await stopScanner()
          await selectVehicleById(decoded.trim())
        },
        () => {}
      )
    } catch (err) {
      setScannerActive(false)
      setError('Câmera não disponível. Use a lista abaixo.')
      setMode('list')
    }
  }

  async function handleModeChange(newMode: 'list' | 'scan') {
    if (newMode === 'list') {
      await stopScanner()
    }
    setMode(newMode)
    setError('')
  }

  async function selectVehicleById(vehicleId: string) {
    setLoadingVehicle(true)
    setError('')
    try {
      const supabase = createClient()
      const { data } = await supabase.from('vehicles').select('*').eq('id', vehicleId).eq('active', true).single()
      if (!data) { setError('Veículo não encontrado. Use a lista.'); setLoadingVehicle(false); return }
      await confirmVehicle(data as Vehicle)
    } catch { setError('Erro ao buscar veículo.') }
    setLoadingVehicle(false)
  }

  async function confirmVehicle(v: Vehicle) {
    setVehicle(v)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('checklists').select('id')
        .eq('vehicle_id', v.id).eq('status', 'open')
        .order('created_at', { ascending: false }).limit(1).single()
      setOpenChecklist(data ? { id: data.id } : null)
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

  const logout = async () => {
    await createClient().auth.signOut()
    router.replace('/login')
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0a0c0f' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, color: '#e8eaf0' }}>
            FLEET<span style={{ color: '#f97316' }}>CHECK</span>
          </h1>
          {userName && <p style={{ color: '#6b7280', fontSize: 12 }}>Olá, {userName}</p>}
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 12 }}>
          Sair
        </button>
      </div>

      {/* Vehicle confirmed */}
      {vehicle ? (
        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-6">
          <div className="animate-fade-up w-full max-w-sm">
            {openChecklist ? (
              <div className="mb-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)' }}>
                <p style={{ color: '#eab308', fontSize: 13, fontWeight: 600 }}>⚠ Viagem em aberto</p>
                <p style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>Este veículo tem uma saída sem chegada registrada. Finalize a viagem atual.</p>
              </div>
            ) : (
              <div className="mb-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>✓ Veículo disponível</p>
                <p style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>Nenhuma viagem em aberto.</p>
              </div>
            )}
            <div className="rounded-2xl p-5" style={{ background: '#111318', border: '1px solid #1e2229' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.12)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12l1-5h16l1 5M3 12v5a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-5M3 12h18" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="7.5" cy="15.5" r="1" fill="#f97316"/>
                    <circle cx="16.5" cy="15.5" r="1" fill="#f97316"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#e8eaf0', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>{vehicle.plate}</p>
                  <p style={{ fontSize: 13, color: '#6b7280' }}>{vehicle.model} · {vehicle.year}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'KM anterior', value: vehicle.last_km ? `${vehicle.last_km.toLocaleString('pt-BR')} km` : '—' },
                  { label: 'Último check', value: vehicle.last_check_at ? new Date(vehicle.last_check_at).toLocaleDateString('pt-BR') : 'Nunca' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-xl" style={{ background: '#0a0c0f' }}>
                    <p style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#e8eaf0' }}>{value}</p>
                  </div>
                ))}
              </div>
              <button onClick={proceed}
                style={{ width: '100%', padding: 14, borderRadius: 10, background: openChecklist ? '#eab308' : '#f97316', color: openChecklist ? '#0a0c0f' : 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif" }}>
                {openChecklist ? '⚠ REGISTRAR CHEGADA →' : '🚗 INICIAR SAÍDA →'}
              </button>
              <button onClick={() => { setVehicle(null); setOpenChecklist(null); setError('') }}
                style={{ width: '100%', marginTop: 8, padding: 8, background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>
                Escolher outro veículo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col px-5 pb-6">
          {/* Mode tabs */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => handleModeChange('list')}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: mode === 'list' ? '#f97316' : '#111318', border: `1px solid ${mode === 'list' ? '#f97316' : '#1e2229'}`, color: mode === 'list' ? 'white' : '#6b7280' }}>
              📋 Lista
            </button>
            <button onClick={() => { handleModeChange('scan'); startScanner() }}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: mode === 'scan' ? '#f97316' : '#111318', border: `1px solid ${mode === 'scan' ? '#f97316' : '#1e2229'}`, color: mode === 'scan' ? 'white' : '#6b7280' }}>
              📷 QR Code
            </button>
          </div>

          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
            </div>
          )}

          {/* LIST MODE */}
          {mode === 'list' && (
            <div>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
                Toque no veículo que você vai utilizar
              </p>
              {loadingVehicles ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
                </div>
              ) : vehicles.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>Nenhum veículo disponível</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {vehicles.map(v => (
                    <button key={v.id} onClick={() => confirmVehicle(v)} disabled={loadingVehicle}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: '#111318', border: '1px solid #1e2229', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: loadingVehicle ? 0.6 : 1 }}>
                      <div>
                        <p style={{ fontSize: 17, fontWeight: 700, color: '#e8eaf0', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>{v.plate}</p>
                        <p style={{ fontSize: 12, color: '#6b7280' }}>{v.model} · {v.year}</p>
                      </div>
                      {loadingVehicle ? (
                        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
                      ) : (
                        <span style={{ color: '#f97316', fontSize: 20 }}>›</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SCAN MODE */}
          {mode === 'scan' && (
            <div className="flex-1 flex flex-col">
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
                Aponte a câmera para o QR Code fixado no veículo
              </p>
              <div className="rounded-2xl overflow-hidden relative" style={{ background: '#111318', height: 300 }}>
                <div id="qr-reader" ref={scannerRef} style={{ width: '100%', height: '100%' }} />
                {scannerActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-52 h-52">
                      {['top-0 left-0 border-t-2 border-l-2 rounded-tl-lg','top-0 right-0 border-t-2 border-r-2 rounded-tr-lg','bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg','bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg'].map((cls, i) => (
                        <div key={i} className={`absolute w-7 h-7 ${cls}`} style={{ borderColor: '#f97316' }} />
                      ))}
                    </div>
                  </div>
                )}
                {!scannerActive && !error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
                  </div>
                )}
              </div>
              {loadingVehicle && (
                <p className="mt-3 animate-fade-up" style={{ color: '#f97316', fontSize: 13, textAlign: 'center' }}>
                  Identificando veículo...
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
