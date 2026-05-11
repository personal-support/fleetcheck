'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Vehicle } from '@/types'

export default function ScanPage() {
  const router = useRouter()
  const scannerRef = useRef<HTMLDivElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(false)
  const html5QrRef = useRef<unknown>(null)

  useEffect(() => {
    let scanner: { start: Function; stop: Function } | null = null

    async function initScanner() {
      if (!scannerRef.current) return
      const { Html5Qrcode } = await import('html5-qrcode')
      scanner = new Html5Qrcode('qr-reader')
      html5QrRef.current = scanner
      setScanning(true)

      try {
        await (scanner as { start: Function }).start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            await (scanner as { stop: Function }).stop()
            setScanning(false)
            await loadVehicle(decodedText)
          },
          () => {}
        )
      } catch {
        setError('Não foi possível acessar a câmera. Verifique as permissões.')
        setScanning(false)
      }
    }

    initScanner()

    return () => {
      if (scanner) {
        (scanner as { stop: Function }).stop().catch(() => {})
      }
    }
  }, [])

  async function loadVehicle(vehicleId: string) {
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .eq('active', true)
      .single()

    if (error || !data) {
      setError('Veículo não encontrado ou QR Code inválido.')
      setLoading(false)
      setTimeout(() => {
        setError('')
        setScanning(true)
      }, 2500)
      return
    }

    setVehicle(data as Vehicle)
    setLoading(false)
  }

  function startChecklist() {
    if (!vehicle) return
    sessionStorage.setItem('fc_vehicle', JSON.stringify(vehicle))
    router.push('/check/odometer')
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0a0c0f' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, color: '#e8eaf0' }}>
            FLEET<span style={{ color: '#f97316' }}>CHECK</span>
          </h1>
          <p style={{ color: '#6b7280', fontSize: 12 }}>Aponte para o QR Code do veículo</p>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: '#111318', border: '1px solid #1e2229' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="#6b7280" strokeWidth="1.5"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        {!vehicle ? (
          <>
            <div className="relative w-full max-w-sm">
              <div
                id="qr-reader"
                ref={scannerRef}
                className="rounded-2xl overflow-hidden"
                style={{ background: '#111318', minHeight: 300 }}
              />
              {/* Corner markers overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-52 h-52">
                  {[
                    'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
                    'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
                    'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
                    'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-6 h-6 ${cls}`}
                      style={{ borderColor: '#f97316' }} />
                  ))}
                </div>
              </div>
            </div>

            {scanning && !error && !loading && (
              <p className="mt-5 animate-fade-up" style={{ color: '#6b7280', fontSize: 13 }}>
                Buscando QR Code...
              </p>
            )}

            {loading && (
              <p className="mt-5 animate-fade-up" style={{ color: '#f97316', fontSize: 13 }}>
                Identificando veículo...
              </p>
            )}

            {error && (
              <div className="mt-5 px-4 py-3 rounded-xl animate-fade-up"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
              </div>
            )}
          </>
        ) : (
          /* Vehicle confirm card */
          <div className="w-full max-w-sm animate-fade-up">
            <div className="rounded-2xl p-6" style={{ background: '#111318', border: '1px solid #1e2229' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse-ring"
                  style={{ background: 'rgba(249,115,22,0.15)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12l1-5h16l1 5M3 12v5a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-5M3 12h18" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="7.5" cy="15.5" r="1" fill="#f97316"/>
                    <circle cx="16.5" cy="15.5" r="1" fill="#f97316"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Veículo identificado</p>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8eaf0', lineHeight: 1.2 }}>{vehicle.plate}</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'Modelo', value: vehicle.model },
                  { label: 'Ano', value: vehicle.year?.toString() ?? '-' },
                  { label: 'KM anterior', value: vehicle.last_km ? `${vehicle.last_km.toLocaleString('pt-BR')} km` : 'Sem registro' },
                  { label: 'Último check', value: vehicle.last_check_at ? new Date(vehicle.last_check_at).toLocaleDateString('pt-BR') : 'Nunca' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-xl" style={{ background: '#0a0c0f' }}>
                    <p style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#e8eaf0' }}>{value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={startChecklist}
                style={{
                  width: '100%', padding: '14px', borderRadius: 10,
                  background: '#f97316', color: 'white',
                  fontWeight: 700, fontSize: 15, border: 'none',
                  cursor: 'pointer', letterSpacing: '0.02em',
                }}
              >
                INICIAR CHECKLIST →
              </button>

              <button
                onClick={() => setVehicle(null)}
                style={{ width: '100%', marginTop: 10, padding: '10px', background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}
              >
                Escanear outro veículo
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
