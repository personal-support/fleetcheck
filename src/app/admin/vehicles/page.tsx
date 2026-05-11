'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Vehicle } from '@/types'

const CONSULDATA_COMPANY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export default function AdminVehiclesPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ plate: '', model: '', year: '', vehicle_type: 'leve' })

  useEffect(() => { loadVehicles() }, [])

  async function loadVehicles() {
    const supabase = createClient()
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('company_id', CONSULDATA_COMPANY_ID)
      .order('created_at', { ascending: false })
    if (data) setVehicles(data as Vehicle[])
    setLoading(false)
  }

  async function addVehicle() {
    if (!form.plate || !form.model) return
    const supabase = createClient()
    const { error } = await supabase.from('vehicles').insert({
      company_id: CONSULDATA_COMPANY_ID,
      plate: form.plate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      model: form.model,
      year: form.year ? parseInt(form.year) : null,
      vehicle_type: form.vehicle_type,
    })
    if (!error) {
      setAdding(false)
      setForm({ plate: '', model: '', year: '', vehicle_type: 'leve' })
      loadVehicles()
    }
  }

  function downloadQR(vehicleId: string, plate: string) {
    // Generate QR code URL using qrserver.com API (free, no key needed)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${vehicleId}&bgcolor=111318&color=f97316&format=png`
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `qr-${plate}.png`
    link.target = '_blank'
    link.click()
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
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#e8eaf0', flex: 1 }}>
          VEÍCULOS
        </h1>
        <button onClick={() => setAdding(true)}
          style={{ padding: '7px 14px', borderRadius: 8, background: '#f97316', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          + Adicionar
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mx-5 mt-4 p-4 rounded-xl animate-fade-up" style={{ background: '#111318', border: '1px solid #1e2229' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0', marginBottom: 12 }}>Novo veículo</h3>
          <div className="flex flex-col gap-3">
            {[
              { key: 'plate', label: 'Placa', placeholder: 'ABC1234' },
              { key: 'model', label: 'Modelo', placeholder: 'Fiat Uno' },
              { key: 'year', label: 'Ano', placeholder: '2020' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>{label}</label>
                <input
                  type={key === 'year' ? 'number' : 'text'}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#0a0c0f', border: '1px solid #1e2229', color: '#e8eaf0', fontSize: 14, outline: 'none' }}
                />
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <button onClick={addVehicle}
                style={{ flex: 1, padding: 10, borderRadius: 8, background: '#f97316', color: 'white', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                Salvar
              </button>
              <button onClick={() => setAdding(false)}
                style={{ padding: '10px 14px', borderRadius: 8, background: '#0a0c0f', border: '1px solid #1e2229', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="px-5 pt-4 pb-8 flex flex-col gap-3">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
          </div>
        )}
        {!loading && vehicles.length === 0 && (
          <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
            Nenhum veículo cadastrado
          </p>
        )}
        {vehicles.map(v => (
          <div key={v.id} className="p-4 rounded-xl" style={{ background: '#111318', border: '1px solid #1e2229' }}>
            <div className="flex items-start justify-between">
              <div>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#e8eaf0', fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {v.plate}
                </p>
                <p style={{ fontSize: 13, color: '#6b7280' }}>{v.model} {v.year ? `· ${v.year}` : ''}</p>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  KM: {v.last_km ? v.last_km.toLocaleString('pt-BR') : '—'} ·
                  Check: {v.last_check_at ? new Date(v.last_check_at).toLocaleDateString('pt-BR') : 'Nunca'}
                </p>
              </div>
              <button
                onClick={() => downloadQR(v.id, v.plate)}
                style={{
                  padding: '7px 12px', borderRadius: 8, background: '#0a0c0f',
                  border: '1px solid #1e2229', color: '#6b7280', fontSize: 11,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                ⬛ QR Code
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
