'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Vehicle } from '@/types'

export default function OdometerPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)

  const [step, setStep] = useState<'camera' | 'reading' | 'confirm'>('camera')
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [kmAuto, setKmAuto] = useState<number | null>(null)
  const [kmInput, setKmInput] = useState('')
  const [correcting, setCorrecting] = useState(false)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [maxZoom, setMaxZoom] = useState(1)
  const [zoomSupported, setZoomSupported] = useState(false)

  const phase = typeof window !== 'undefined' ? sessionStorage.getItem('fc_phase') ?? 'departure' : 'departure'
  const vehicle: Vehicle | null = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('fc_vehicle') ?? 'null') : null

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    trackRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      })
      streamRef.current = stream
      const track = stream.getVideoTracks()[0]
      trackRef.current = track

      if (videoRef.current) videoRef.current.srcObject = stream

      // Check zoom support
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number } }
      if (capabilities.zoom) {
        setZoomSupported(true)
        setMaxZoom(Math.min(capabilities.zoom.max, 8))
        setZoom(1)
      }
    } catch {
      setError('Câmera indisponível.')
    }
  }, [])

  async function applyZoom(value: number) {
    setZoom(value)
    if (trackRef.current && zoomSupported) {
      try {
        await (trackRef.current.applyConstraints as Function)({ advanced: [{ zoom: value }] })
      } catch { /* fallback to CSS */ }
    }
  }

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)

    c.toBlob(async (blob) => {
      if (!blob) return
      setPhotoBlob(blob)
      setPhotoUrl(URL.createObjectURL(blob))
      stopCamera()
      setStep('reading')

      try {
        const reader = new FileReader()
        const b64 = await new Promise<string>((res, rej) => {
          reader.onload = () => res((reader.result as string).split(',')[1])
          reader.onerror = rej
          reader.readAsDataURL(blob)
        })
        const res = await fetch('/api/read-odometer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: b64 }),
        })
        const data = await res.json()
        if (data.km > 0) {
          setKmAuto(data.km)
          setKmInput(String(data.km))
          setStep('confirm')
        } else {
          setKmAuto(null)
          setCorrecting(true)
          setStep('confirm')
        }
      } catch {
        setKmAuto(null)
        setCorrecting(true)
        setStep('confirm')
      }
    }, 'image/jpeg', 0.95)
  }, [stopCamera])

  function confirm() {
    const km = parseInt(kmInput.replace(/\D/g, ''))
    if (!km || km < 1) { setError('Informe um KM válido.'); return }
    if (phase === 'departure' && vehicle!.last_km > 0 && km < vehicle!.last_km) {
      setError(`KM ${km.toLocaleString('pt-BR')} menor que o último registro (${vehicle!.last_km.toLocaleString('pt-BR')}). Verifique.`)
      return
    }
    const wasManual = kmAuto !== null ? km !== kmAuto : true
    sessionStorage.setItem('fc_km', String(km))
    sessionStorage.setItem('fc_km_auto', String(kmAuto ?? km))
    sessionStorage.setItem('fc_km_was_manual', String(wasManual))
    sessionStorage.setItem('fc_dt_auto', new Date().toISOString())
    navigator.geolocation?.getCurrentPosition(
      pos => {
        sessionStorage.setItem('fc_lat_auto', String(pos.coords.latitude))
        sessionStorage.setItem('fc_lng_auto', String(pos.coords.longitude))
      },
      () => {}
    )
    if (photoBlob) sessionStorage.setItem('fc_km_photo', URL.createObjectURL(photoBlob))
    router.push(phase === 'departure' ? '/check/items' : '/check/arrival')
  }

  if (!vehicle) { router.replace('/check/scan'); return null }

  const isArrival = phase === 'arrival'
  const lastKm = vehicle.last_km
  // CSS zoom fallback when native zoom not supported
  const cssZoom = zoomSupported ? 1 : zoom

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0a0c0f' }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {vehicle.plate} · {isArrival ? 'Chegada' : 'Saída'} · Hodômetro
          </p>
        </div>
        <div className="step-bar"><div className="step-bar-fill" style={{ width: step === 'camera' ? '15%' : step === 'reading' ? '35%' : '50%' }} /></div>
      </div>

      <div className="flex-1 flex flex-col px-5 pb-6">

        {/* CAMERA */}
        {step === 'camera' && (
          <div className="flex-1 flex flex-col animate-fade-up">
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 10 }}>
              Enquadre o display do hodômetro · KM anterior: <strong style={{ color: '#e8eaf0' }}>{lastKm ? lastKm.toLocaleString('pt-BR') : '—'}</strong>
            </p>

            {/* Video container */}
            <div className="rounded-2xl overflow-hidden relative flex-1"
              style={{ background: '#111318', minHeight: 300 }}>
              <video
                ref={videoRef}
                autoPlay playsInline muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  minHeight: 300,
                  transform: zoomSupported ? 'none' : `scale(${cssZoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.1s',
                }}
              />
              {/* Focus guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div style={{
                  width: 260, height: 90,
                  border: '2px solid rgba(249,115,22,0.7)',
                  borderRadius: 10,
                  boxShadow: '0 0 0 2000px rgba(0,0,0,0.25)',
                }}>
                  <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', background: 'rgba(249,115,22,0.85)', borderRadius: 4, padding: '2px 8px' }}>
                    <p style={{ fontSize: 10, color: 'white', whiteSpace: 'nowrap' }}>Alinhe o display aqui</p>
                  </div>
                </div>
              </div>

              {/* Zoom indicator */}
              {zoom > 1 && (
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '3px 8px' }}>
                  <p style={{ fontSize: 12, color: '#f97316', fontWeight: 700 }}>{zoom.toFixed(1)}×</p>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Zoom slider */}
            <div className="mt-3 flex items-center gap-3">
              <span style={{ fontSize: 11, color: '#6b7280', minWidth: 20 }}>1×</span>
              <input
                type="range"
                min={1}
                max={maxZoom > 1 ? maxZoom : 5}
                step={0.1}
                value={zoom}
                onChange={e => applyZoom(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#f97316' }}
              />
              <span style={{ fontSize: 11, color: '#6b7280', minWidth: 28 }}>
                {maxZoom > 1 ? `${Math.round(maxZoom)}×` : '5×'}
              </span>
            </div>

            {error && <p className="mt-2" style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

            <div className="flex gap-3 mt-4">
              <button onClick={capture}
                style={{ flex: 1, padding: 16, borderRadius: 12, background: '#f97316', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
                📸 Fotografar
              </button>
              <button onClick={() => { stopCamera(); setCorrecting(true); setStep('confirm') }}
                style={{ padding: '16px 14px', borderRadius: 12, background: '#111318', border: '1px solid #1e2229', color: '#6b7280', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Digitar KM
              </button>
            </div>
          </div>
        )}

        {/* READING */}
        {step === 'reading' && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-up gap-4">
            {photoUrl && (
              <img src={photoUrl} alt="Hodômetro" className="rounded-xl w-full object-cover"
                style={{ maxHeight: 220, objectFit: 'cover' }} />
            )}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
              <p style={{ color: '#e8eaf0', fontSize: 15 }}>Lendo hodômetro com IA...</p>
            </div>
          </div>
        )}

        {/* CONFIRM */}
        {step === 'confirm' && (
          <div className="flex-1 flex flex-col animate-fade-up gap-4">
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, color: '#e8eaf0' }}>
              {kmAuto && !correcting ? 'CONFIRMAR KM' : 'INFORME O KM'}
            </h2>

            {photoUrl && (
              <img src={photoUrl} alt="Hodômetro" className="rounded-xl w-full object-cover"
                style={{ maxHeight: 160, objectFit: 'cover' }} />
            )}

            {kmAuto && !correcting && (
              <div className="p-4 rounded-xl flex items-center gap-3"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p style={{ fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>IA leu automaticamente</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#e8eaf0', fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {kmAuto.toLocaleString('pt-BR')} km
                  </p>
                </div>
              </div>
            )}

            {(correcting || !kmAuto) && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {kmAuto ? 'Corrigir KM' : 'KM atual'}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={kmInput}
                  onChange={e => setKmInput(e.target.value)}
                  placeholder={lastKm ? `Último: ${lastKm.toLocaleString('pt-BR')}` : 'Ex: 110846'}
                  autoFocus
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 10, background: '#111318', border: '1px solid #1e2229', color: '#e8eaf0', fontSize: 28, outline: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, colorScheme: 'dark' }}
                  onFocus={e => e.target.style.borderColor = '#f97316'}
                  onBlur={e => e.target.style.borderColor = '#1e2229'}
                />
              </div>
            )}

            {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

            <div className="flex flex-col gap-2 mt-auto">
              <button onClick={confirm}
                style={{ width: '100%', padding: 14, borderRadius: 10, background: '#f97316', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
                CONFIRMAR E CONTINUAR →
              </button>

              {kmAuto && !correcting && (
                <button onClick={() => { setCorrecting(true); setKmInput(String(kmAuto)) }}
                  style={{ padding: 10, background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>
                  Leitura incorreta? Corrigir
                </button>
              )}

              {(correcting || !kmAuto) && photoUrl && (
                <button onClick={() => { setStep('camera'); setPhotoUrl(''); setPhotoBlob(null); setCorrecting(false); setKmAuto(null); setKmInput(''); startCamera() }}
                  style={{ padding: 10, background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>
                  ← Tirar foto novamente
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
