'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/BackButton'
import { createClient } from '@/lib/supabase/client'
import type { Vehicle } from '@/types'

const CONSULDATA_COMPANY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

function QRCanvas({ vehicleId, plate }: { vehicleId: string; plate: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    async function generate() {
      if (!canvasRef.current) return
      const QRCode = (await import('qrcode')).default
      const qrData = `https://fleetcheck.vercel.app/check/veiculo/${vehicleId}`
      await QRCode.toCanvas(canvasRef.current, qrData, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
    }
    generate()
  }, [vehicleId])

  function download() {
    if (!canvasRef.current) return
    const url = canvasRef.current.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${plate}.png`
    a.click()
  }

  function print() {
    if (!canvasRef.current) return
    const url = canvasRef.current.toDataURL('image/png')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>QR - ${plate}</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 24px; background: white; }
        img { width: 220px; height: 220px; display: block; }
        h2 { margin: 12px 0 4px; font-size: 22px; letter-spacing: 2px; }
        p { margin: 0; color: #666; font-size: 13px; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <img src="${url}" />
        <h2>${plate}</h2>
        <p>FleetCheck · Consuldata</p>
        <br/>
        <button onclick="window.print()">Imprimir</button>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-xl"
      style={{ background: '#ebeff2', border: '1px solid #1a2040' }}>
      <canvas ref={canvasRef} style={{ borderRadius: 8, display: 'block' }} />
      <p style={{ fontSize: 13, fontWeight: 700, color: '#555555', letterSpacing: 2, fontFamily: "'Barlow Condensed', sans-serif" }}>{plate}</p>
      <div className="flex gap-2 w-full">
        <button onClick={download}
          style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: '#ffffff', border: '1px solid #1a2040', color: '#555555', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          ⬇ Baixar PNG
        </button>
        <button onClick={print}
          style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: '#f86924', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          🖨 Imprimir
        </button>
      </div>
    </div>
  )
}

export default function AdminVehiclesPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [form, setForm] = useState({ plate: '', model: '', year: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadVehicles() }, [])

  async function loadVehicles() {
    const supabase = createClient()
    const { data } = await supabase
      .from('vehicles').select('*')
      .eq('company_id', CONSULDATA_COMPANY_ID)
      .order('active', { ascending: false }).order('plate')
    if (data) setVehicles(data as Vehicle[])
    setLoading(false)
  }

  async function toggleVehicle(id: string, active: boolean, plate: string) {
    if (!confirm(`${active ? 'Desativar' : 'Reativar'} o veículo ${plate}?`)) return
    const supabase = createClient()
    await supabase.from('vehicles').update({ active: !active }).eq('id', id)
    loadVehicles()
  }

  async function addVehicle() {
    if (!form.plate || !form.model) { setError('Placa e modelo são obrigatórios.'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('vehicles').insert({
      company_id: CONSULDATA_COMPANY_ID,
      plate: form.plate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      model: form.model,
      year: form.year ? parseInt(form.year) : null,
      vehicle_type: 'leve',
    })
    if (err) { setError('Erro ao adicionar. Tente novamente.'); setSaving(false); return }
    setAdding(false)
    setForm({ plate: '', model: '', year: '' })
    loadVehicles()
    setSaving(false)
  }

  return (
    <main className="min-h-screen" style={{ background: '#ebeff2' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3" style={{ borderBottom: '1px solid #1a2040' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#5e6673', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#555555', flex: 1 }}>
          VEÍCULOS
        </h1>
        <button onClick={() => { setAdding(!adding); setError('') }}
          style={{ padding: '7px 14px', borderRadius: 8, background: adding ? '#ffffff' : '#f86924', color: adding ? '#6b7280' : 'white', fontSize: 12, fontWeight: 600, border: adding ? '1px solid #1a2040' : 'none', cursor: 'pointer' }}>
          {adding ? 'Cancelar' : '+ Adicionar'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mx-5 mt-4 p-4 rounded-xl animate-fade-up" style={{ background: '#ffffff', border: '1px solid #1a2040' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#555555', marginBottom: 12 }}>Novo veículo</h3>
          <div className="flex flex-col gap-3">
            {[
              { key: 'plate', label: 'Placa', placeholder: 'ABC1234' },
              { key: 'model', label: 'Modelo', placeholder: 'Fiat Uno 1.0' },
              { key: 'year', label: 'Ano', placeholder: '2020' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, color: '#5e6673', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</label>
                <input type={key === 'year' ? 'number' : 'text'} placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#ebeff2', border: '1px solid #1a2040', color: '#555555', fontSize: 14, outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#f86924'} onBlur={e => e.target.style.borderColor = '#dddddd'} />
              </div>
            ))}
            {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
            <button onClick={addVehicle} disabled={saving}
              style={{ padding: 11, borderRadius: 8, background: saving ? '#212771' : '#f86924', color: 'white', fontWeight: 600, fontSize: 13, border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Salvando...' : 'Salvar veículo'}
            </button>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 flex items-center justify-center px-5 z-50"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setShowQR(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-xs animate-fade-up">
            {(() => {
              const v = vehicles.find(v => v.id === showQR)
              return v ? <QRCanvas vehicleId={v.id} plate={v.plate} /> : null
            })()}
            <button onClick={() => setShowQR(null)}
              style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 10, background: '#ffffff', border: '1px solid #1a2040', color: '#5e6673', fontSize: 13, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Vehicles list */}
      <div className="px-5 pt-4 pb-8 flex flex-col gap-3">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#f86924', borderTopColor: 'transparent' }} />
          </div>
        )}
        {!loading && vehicles.length === 0 && (
          <p style={{ color: '#5e6673', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>Nenhum veículo cadastrado</p>
        )}
        {vehicles.map(v => (
          <div key={v.id} className="p-4 rounded-xl" style={{ background: '#ffffff', border: '1px solid #1a2040' }}>
            <div className="flex items-start justify-between">
              <div>
                <p style={{ fontSize: 19, fontWeight: 800, color: '#555555', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
                  {v.plate}
                </p>
                <p style={{ fontSize: 13, color: '#5e6673' }}>{v.model}{v.year ? ` · ${v.year}` : ''}</p>
                <p style={{ fontSize: 12, color: '#5e6673', marginTop: 4 }}>
                  KM: {v.last_km ? v.last_km.toLocaleString('pt-BR') : '—'} ·
                  Check: {v.last_check_at ? new Date(v.last_check_at).toLocaleDateString('pt-BR') : 'Nunca'}
                </p>
              </div>
              <button onClick={() => setShowQR(v.id)}
                style={{ padding: '8px 14px', borderRadius: 8, background: '#ebeff2', border: '1px solid #1a2040', color: '#555555', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3M14 21h3v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                QR Code
              </button>
              <button onClick={() => toggleVehicle(v.id, v.active, v.plate)}
                style={{ padding: '8px 12px', borderRadius: 8, background: v.active ? 'rgba(240,90,73,0.08)' : 'rgba(53,188,122,0.08)', border: `1px solid ${v.active ? '#f05a49' : '#35bc7a'}`, color: v.active ? '#f05a49' : '#35bc7a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {v.active ? '⏸ Desativar' : '▶ Reativar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <BackButton href='/admin' label='← Voltar para o painel' />
    </main>
  )
}
