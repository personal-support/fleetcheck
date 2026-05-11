'use client'

import { useRef, useState, useCallback } from 'react'
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
  const [kmRead, setKmRead] = useState<number | null>(null)
  const [kmManual, setKmManual] = useState('')
  const [correcting, setCorrecting] = useState(false)
  const [error, setError] = useState('')
  const vehicle: Vehicle | null = typeof window !== 'undefined'
    ? JSON.parse(sessionStorage.getItem('fc_vehicle') ?? 'null')
    : null

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setError('Não foi possível acessar a câmera.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)

    canvas.toBlob(async (blob) => {
      if (!blob) return
      setPhotoBlob(blob)
      setPhotoUrl(URL.createObjectURL(blob))
      stopCamera()
      setStep('reading')
      await readKmWithAI(blob)
    }, 'image/jpeg', 0.92)
  }, [stopCamera])

  async function readKmWithAI(blob: Blob) {
    setError('')
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = () => res((reader.result as string).split(',')[1])
        reader.onerror = () => rej()
        reader.readAsDataURL(blob)
      })

      const res = await fetch('/api/read-odometer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })

      const data = await res.json()

      if (data.km && data.km > 0) {
        setKmRead(data.km)
        setKmManual(String(data.km))
        setStep('confirm')
      } else {
        setKmRead(null)
        setCorrecting(true)
        setStep('confirm')
      }
    } catch {
      setKmRead(null)
      setCorrecting(true)
      setStep('confirm')
    }
  }

  function confirmKm() {
    const km = parseInt(kmManual.replace(/\D/g, ''))
    if (!km || km < 1) {
      setError('Informe um KM válido.')
      return
    }

    if (vehicle && vehicle.last_km > 0 && km < vehicle.last_km) {
      setError(`KM informado (${km.toLocaleString('pt-BR')}) é menor que o último registro (${vehicle.last_km.toLocaleString('pt-BR')}). Verifique.`)
      return
    }

    sessionStorage.setItem('fc_km', String(km))
    sessionStorage.setItem('fc_km_photo', photoUrl)
    if (photoBlob) {
      // Store blob reference via URL (will be used at submission)
      sessionStorage.setItem('fc_km_photo_key', 'km_photo')
    }
    router.push('/check/items')
  }

  // Auto-start camera on mount
  if (typeof window !== 'undefined' && !streamRef.current && step === 'camera') {
    startCamera()
  }

  if (!vehicle) {
    router.replace('/check/scan')
    return null
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0a0c0f' }}>
      {/* Progress */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {vehicle.plate} · Passo 1 de 2
            </p>
          </div>
        </div>
        <div className="step-bar">
          <div className="step-bar-fill" style={{ width: '50%' }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5">

        {/* CAMERA STEP */}
        {step === 'camera' && (
          <div className="flex-1 flex flex-col animate-fade-up">
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: '#e8eaf0', marginBottom: 4 }}>
              HODÔMETRO
            </h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
              Posicione o painel no centro e tire a foto
            </p>

            <div className="rounded-2xl overflow-hidden flex-1 relative" style={{ background: '#111318', minHeight: 300 }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ minHeight: 300 }}
              />
              {/* Focus guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 rounded-xl" style={{ width: 220, height: 80, borderColor: 'rgba(249,115,22,0.6)' }} />
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {error && (
              <p className="mt-3 animate-fade-up" style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
            )}

            <button
              onClick={capture}
              className="mt-5 mb-8 animate-pulse-ring"
              style={{
                width: 70, height: 70, borderRadius: '50%',
                background: '#f97316', border: '4px solid rgba(249,115,22,0.3)',
                margin: '20px auto 32px', display: 'block', cursor: 'pointer',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: 'auto' }}>
                <circle cx="12" cy="12" r="4" fill="white"/>
                <path d="M9 2h6l2 2h3a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h3L9 2z" stroke="white" strokeWidth="1.5" fill="none"/>
              </svg>
            </button>
          </div>
        )}

        {/* READING STEP */}
        {step === 'reading' && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-up">
            {photoUrl && (
              <img src={photoUrl} alt="Hodômetro" className="rounded-xl mb-6 w-full max-w-xs object-cover" style={{ maxHeight: 200 }} />
            )}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
              <p style={{ color: '#e8eaf0', fontSize: 15 }}>Lendo hodômetro com IA...</p>
            </div>
          </div>
        )}

        {/* CONFIRM STEP */}
        {step === 'confirm' && (
          <div className="flex-1 flex flex-col animate-fade-up">
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: '#e8eaf0', marginBottom: 4 }}>
              {kmRead ? 'CONFIRMAR KM' : 'INFORME O KM'}
            </h2>

            {photoUrl && (
              <img src={photoUrl} alt="Hodômetro" className="rounded-xl mb-5 w-full object-cover" style={{ maxHeight: 160 }} />
            )}

            {kmRead && !correcting && (
              <div className="p-4 rounded-xl mb-4 flex items-center gap-3"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p style={{ fontSize: 11, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>IA leu</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#e8eaf0', fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {kmRead.toLocaleString('pt-BR')} km
                  </p>
                </div>
              </div>
            )}

            {!correcting ? (
              <div className="flex flex-col gap-3 mt-auto mb-8">
                <button
                  onClick={confirmKm}
                  style={{
                    width: '100%', padding: 14, borderRadius: 10,
                    background: '#f97316', color: 'white',
                    fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
                  }}
                >
                  CONFIRMAR → INICIAR CHECKLIST
                </button>
                <button
                  onClick={() => { setCorrecting(true); setKmManual('') }}
                  style={{ padding: 10, background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>
                  KM incorreto? Corrigir manualmente
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-4">
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    KM atual
                  </label>
                  <input
                    type="number"
                    value={kmManual}
                    onChange={(e) => setKmManual(e.target.value)}
                    placeholder={vehicle.last_km ? `Último: ${vehicle.last_km.toLocaleString('pt-BR')}` : 'Ex: 45418'}
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: 10,
                      background: '#111318', border: '1px solid #1e2229',
                      color: '#e8eaf0', fontSize: 22, outline: 'none',
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = '#1e2229'}
                  />
                </div>
                {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
                <button
                  onClick={confirmKm}
                  style={{
                    width: '100%', padding: 14, borderRadius: 10,
                    background: '#f97316', color: 'white',
                    fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
                    marginBottom: 8,
                  }}
                >
                  CONFIRMAR E CONTINUAR →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step bar bottom */}
      <div className="px-5 pb-6">
        <div className="step-bar">
          <div className="step-bar-fill" style={{ width: step === 'camera' ? '10%' : step === 'reading' ? '40%' : '50%' }} />
        </div>
      </div>
    </main>
  )
}
