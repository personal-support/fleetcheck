'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Vehicle } from '@/types'

export default function OdometerPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [step, setStep] = useState<'camera' | 'reading' | 'confirm'>('camera')
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [kmAuto, setKmAuto] = useState<number | null>(null)
  const [kmInput, setKmInput] = useState('')
  const [correcting, setCorrecting] = useState(false)
  const [error, setError] = useState('')
  const phase = typeof window !== 'undefined' ? sessionStorage.getItem('fc_phase') ?? 'departure' : 'departure'
  const vehicle: Vehicle | null = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('fc_vehicle') ?? 'null') : null

  useEffect(() => { startCamera() }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch { setError('Câmera indisponível.') }
  }, [])

  const stopCamera = useCallback(() => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null }, [])

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current, c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    c.toBlob(async (blob) => {
      if (!blob) return
      setPhotoBlob(blob); setPhotoUrl(URL.createObjectURL(blob))
      stopCamera(); setStep('reading')
      const reader = new FileReader()
      const b64 = await new Promise<string>((res, rej) => { reader.onload = () => res((reader.result as string).split(',')[1]); reader.onerror = rej; reader.readAsDataURL(blob) })
      try {
        const res = await fetch('/api/read-odometer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: b64 }) })
        const data = await res.json()
        if (data.km > 0) { setKmAuto(data.km); setKmInput(String(data.km)); setStep('confirm') }
        else { setKmAuto(null); setCorrecting(true); setStep('confirm') }
      } catch { setKmAuto(null); setCorrecting(true); setStep('confirm') }
    }, 'image/jpeg', 0.92)
  }, [stopCamera])

  if (!vehicle) { router.replace('/check/scan'); return null }

  function confirm() {
    const km = parseInt(kmInput.replace(/\D/g, ''))
    if (!km || km < 1) { setError('Informe um KM válido.'); return }
    if (phase === 'departure' && vehicle!.last_km > 0 && km < vehicle!.last_km) {
      setError(`KM ${km.toLocaleString('pt-BR')} é menor que o último registro (${vehicle!.last_km.toLocaleString('pt-BR')}). Verifique.`); return
    }
    const wasManual = kmAuto !== null ? km !== kmAuto : true
    const dtAuto = new Date().toISOString()
    sessionStorage.setItem('fc_km', String(km))
    sessionStorage.setItem('fc_km_auto', String(kmAuto ?? km))
    sessionStorage.setItem('fc_km_was_manual', String(wasManual))
    sessionStorage.setItem('fc_dt_auto', dtAuto)
    // Capture location async
    navigator.geolocation?.getCurrentPosition(pos => {
      sessionStorage.setItem('fc_lat_auto', String(pos.coords.latitude))
      sessionStorage.setItem('fc_lng_auto', String(pos.coords.longitude))
    }, () => {})
    if (photoBlob) {
      const url = URL.createObjectURL(photoBlob)
      sessionStorage.setItem('fc_km_photo', url)
    }
    router.push(phase === 'departure' ? '/check/items' : '/check/arrival')
  }

  const lastKm = vehicle.last_km
  const isArrival = phase === 'arrival'

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0a0c0f' }}>
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {vehicle.plate} · {isArrival ? 'Chegada' : 'Saída'} · KM
          </p>
        </div>
        <div className="step-bar"><div className="step-bar-fill" style={{ width: step === 'camera' ? '10%' : step === 'reading' ? '30%' : '50%' }} /></div>
      </div>

      <div className="flex-1 flex flex-col px-5 pb-6">
        {step === 'camera' && (
          <div className="flex-1 flex flex-col animate-fade-up">
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: '#e8eaf0', marginBottom: 4 }}>HODÔMETRO</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
              {isArrival ? 'Foto do KM de chegada' : 'Foto do KM de saída'} · Último registrado: {lastKm ? lastKm.toLocaleString('pt-BR') + ' km' : '—'}
            </p>
            <div className="rounded-2xl overflow-hidden flex-1 relative" style={{ background: '#111318', minHeight: 280 }}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ minHeight: 280 }} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 rounded-xl" style={{ width: 230, height: 85, borderColor: 'rgba(249,115,22,0.6)' }} />
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {error && <p className="mt-3" style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={capture} className="animate-pulse-ring"
                style={{ flex: 1, padding: 16, borderRadius: 12, background: '#f97316', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
                📸 Fotografar
              </button>
              <button onClick={() => { stopCamera(); setCorrecting(true); setStep('confirm') }}
                style={{ padding: '16px 14px', borderRadius: 12, background: '#111318', border: '1px solid #1e2229', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>
                Digitar KM
              </button>
            </div>
          </div>
        )}

        {step === 'reading' && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-up">
            {photoUrl && <img src={photoUrl} alt="KM" className="rounded-xl mb-6 w-full max-w-xs object-cover" style={{ maxHeight: 200 }} />}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
              <p style={{ color: '#e8eaf0', fontSize: 15 }}>Lendo hodômetro com IA...</p>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="flex-1 flex flex-col animate-fade-up gap-4">
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, color: '#e8eaf0' }}>
              {kmAuto && !correcting ? 'CONFIRMAR KM' : 'INFORME O KM'}
            </h2>
            {photoUrl && <img src={photoUrl} alt="KM" className="rounded-xl w-full object-cover" style={{ maxHeight: 150 }} />}
            {kmAuto && !correcting && (
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div>
                  <p style={{ fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>IA leu automaticamente</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#e8eaf0', fontFamily: "'Barlow Condensed', sans-serif" }}>{kmAuto.toLocaleString('pt-BR')} km</p>
                </div>
              </div>
            )}
            {(correcting || !kmAuto) && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>KM atual</label>
                <input type="number" value={kmInput} onChange={e => setKmInput(e.target.value)}
                  placeholder={lastKm ? `Último: ${lastKm.toLocaleString('pt-BR')}` : 'Ex: 45418'}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 10, background: '#111318', border: '1px solid #1e2229', color: '#e8eaf0', fontSize: 24, outline: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
                  onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = '#1e2229'} />
              </div>
            )}
            {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
            <button onClick={confirm}
              style={{ width: '100%', padding: 14, borderRadius: 10, background: '#f97316', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', marginTop: 'auto' }}>
              CONFIRMAR E CONTINUAR →
            </button>
            {kmAuto && !correcting && (
              <button onClick={() => { setCorrecting(true); setKmInput('') }}
                style={{ padding: 8, background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>
                KM incorreto? Corrigir manualmente
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
