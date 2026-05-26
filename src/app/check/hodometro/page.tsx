'use client'

import { ConsuldataFooter } from '@/components/ConsuldataFooter'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Vehicle } from '@/types'
import { BackButton } from '@/components/BackButton'

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
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [kmWarning, setKmWarning] = useState('')
  const [kmWarningAcknowledged, setKmWarningAcknowledged] = useState(false)
  const [lastKmFromDb, setLastKmFromDb] = useState<number>(0)

  const phase = typeof window !== 'undefined' ? sessionStorage.getItem('fc_phase') ?? 'departure' : 'departure'
  const vehicle: Vehicle | null = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('fc_vehicle') ?? 'null') : null

  useEffect(() => {
    fetchLastKm()
    return () => stopCamera()
  }, [])

  async function fetchLastKm() {
    if (!vehicle) { startCamera(); return }
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('checklists')
        .select('arrival_km_final, departure_km_final')
        .eq('vehicle_id', vehicle.id)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(1)
        .single()
      const dbKm = data?.arrival_km_final ?? data?.departure_km_final ?? 0
      if (dbKm > 0) {
        setLastKmFromDb(dbKm)
        setKmInput(String(dbKm))
        setCorrecting(true)
        setStep('confirm')
      } else {
        startCamera()
      }
    } catch {
      startCamera()
    }
  }

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
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number }; torch?: boolean }
      if (capabilities.zoom) {
        setZoomSupported(true)
        setMaxZoom(Math.min(capabilities.zoom.max, 8))
        setZoom(1)
      }
      // Auto-enable torch (flash) for better odometer reading
      if (capabilities.torch) {
        setTorchSupported(true)
        try {
          await (track.applyConstraints as Function)({ advanced: [{ torch: true }] })
          setTorchOn(true)
        } catch { /* torch not available */ }
      }
    } catch {
      setError('Câmera indisponível.')
    }
  }, [])

  async function applyZoom(value: number) {
    setZoom(value)
    if (trackRef.current && zoomSupported) {
      try {
        const constraints: Record<string, unknown> = { zoom: value }
        if (torchOn) constraints.torch = true
        await (trackRef.current.applyConstraints as Function)({ advanced: [constraints] })
      } catch { /* fallback to CSS */ }
    }
  }

  async function toggleTorch() {
    if (!trackRef.current || !torchSupported) return
    const next = !torchOn
    try {
      await (trackRef.current.applyConstraints as Function)({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch { /* ignore */ }
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
          body: JSON.stringify({ image: b64, vehicleModel: vehicle?.model ?? '' }),
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

  async function confirm() {
    const km = parseInt(kmInput.replace(/\D/g, ''))
    if (!km || km < 1) { setError('Informe um KM válido.'); return }
    // Use DB last KM if available, fallback to vehicle.last_km
    const referenceKm = lastKmFromDb > 0 ? lastKmFromDb : (vehicle?.last_km ?? 0)
    if (referenceKm > 0 && km < referenceKm) {
      const diff = referenceKm - km
      if (diff > 2) {
        setError(
          `KM informado (${km.toLocaleString('pt-BR')}) é inferior ao último registro (${referenceKm.toLocaleString('pt-BR')} km). ` +
          `Diferença de ${diff} km — verifique e corrija antes de continuar.`
        )
        return
      }
      // Diferença pequena (≤2km): alerta mas permite confirmar
      if (!kmWarningAcknowledged) {
        setKmWarning(
          `KM informado (${km.toLocaleString('pt-BR')}) está ${diff} km abaixo do último registro (${referenceKm.toLocaleString('pt-BR')} km). ` +
          `Pode ser uma manobra. Confirme se estiver correto.`
        )
        setKmWarningAcknowledged(true)
        return
      }
    }
    setKmWarning('')
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
    if (photoBlob) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const path = `${vehicle?.id ?? 'unknown'}/${Date.now()}_hodometro.jpg`
        const { data: uploaded } = await supabase.storage
          .from('checklist-photos')
          .upload(path, photoBlob, { contentType: 'image/jpeg', upsert: true })
        if (uploaded) {
          const { data: urlData } = supabase.storage.from('checklist-photos').getPublicUrl(uploaded.path)
          sessionStorage.setItem('fc_km_photo_url', urlData.publicUrl)
        }
      } catch { /* salva localmente como fallback */ }
      sessionStorage.setItem('fc_km_photo', URL.createObjectURL(photoBlob))
    }
    router.push(phase === 'departure' ? '/check/itens' : '/check/chegada')
  }

  if (!vehicle) { router.replace('/check/selecionar'); return null }

  const isArrival = phase === 'arrival'
  const lastKm = vehicle.last_km
  // CSS zoom fallback when native zoom not supported
  const cssZoom = zoomSupported ? 1 : zoom

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#ebeff2' }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#5e6673', cursor: 'pointer', padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <p style={{ fontSize: 11, color: '#5e6673', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {vehicle.plate} · {isArrival ? 'Chegada' : 'Saída'} · Hodômetro
          </p>
        </div>
        <div className="step-bar"><div className="step-bar-fill" style={{ width: step === 'camera' ? '15%' : step === 'reading' ? '35%' : '50%' }} /></div>
      </div>

      <div className="flex-1 flex flex-col px-5 pb-6">

        {/* CAMERA */}
        {step === 'camera' && (
          <div className="flex-1 flex flex-col animate-fade-up">
            <p style={{ color: '#5e6673', fontSize: 13, marginBottom: 10 }}>
              Enquadre o display do hodômetro · KM anterior: <strong style={{ color: '#555555' }}>{lastKm ? lastKm.toLocaleString('pt-BR') : '—'}</strong>
            </p>

            {/* Video container */}
            <div className="rounded-2xl overflow-hidden relative flex-1"
              style={{ background: '#ffffff', height: 'min(52vh, 320px)', maxHeight: 320 }}>
              <video
                ref={videoRef}
                autoPlay playsInline muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  minHeight: 0,
                  transform: zoomSupported ? 'none' : `scale(${cssZoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.1s',
                }}
              />
              {/* Focus guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div style={{
                  width: 260, height: 90,
                  border: '2px solid rgba(248,105,36,0.7)',
                  borderRadius: 10,
                  boxShadow: '0 0 0 2000px rgba(0,0,0,0.25)',
                }}>
                  <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', background: 'rgba(248,105,36,0.85)', borderRadius: 4, padding: '2px 8px' }}>
                    <p style={{ fontSize: 10, color: 'white', whiteSpace: 'nowrap' }}>Alinhe o display aqui</p>
                  </div>
                </div>
              </div>

              {/* Zoom indicator */}
              {zoom > 1 && (
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '3px 8px' }}>
                  <p style={{ fontSize: 12, color: '#f86924', fontWeight: 700 }}>{zoom.toFixed(1)}×</p>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Zoom slider */}
            <div className="mt-3 flex items-center gap-3">
              <span style={{ fontSize: 11, color: '#5e6673', minWidth: 20 }}>1×</span>
              <input
                type="range"
                min={1}
                max={maxZoom > 1 ? maxZoom : 5}
                step={0.1}
                value={zoom}
                onChange={e => applyZoom(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#f86924' }}
              />
              <span style={{ fontSize: 11, color: '#5e6673', minWidth: 28 }}>
                {maxZoom > 1 ? `${Math.round(maxZoom)}×` : '5×'}
              </span>
            </div>

            {error && <p className="mt-2" style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

            {/* Torch toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--cd-subtext)' }}>
                {torchSupported ? (torchOn ? '🔦 Flash ativo' : '🔦 Flash') : '💡 Use o flash do celular para melhor leitura'}
              </span>
              {torchSupported && (
                <button onClick={toggleTorch}
                  style={{ padding: '6px 14px', borderRadius: 8, background: torchOn ? 'var(--cd-orange)' : 'var(--cd-surface)', border: `1.5px solid ${torchOn ? 'var(--cd-orange)' : 'var(--cd-border)'}`, color: torchOn ? '#fff' : 'var(--cd-subtext)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif" }}>
                  {torchOn ? 'ON' : 'OFF'}
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={capture}
                style={{ flex: 1, padding: 16, borderRadius: 12, background: '#f86924', color: 'white', fontWeight: 700, fontSize: 17, border: 'none', cursor: 'pointer' }}>
                📸 Fotografar
              </button>
              <button onClick={() => { stopCamera(); setCorrecting(true); setStep('confirm') }}
                style={{ padding: '16px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid #1a2040', color: '#5e6673', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
                style={{ borderColor: '#f86924', borderTopColor: 'transparent' }} />
              <p style={{ color: '#555555', fontSize: 15 }}>Lendo hodômetro com IA...</p>
            </div>
          </div>
        )}

        {/* CONFIRM */}
        {step === 'confirm' && (
          <div className="flex-1 flex flex-col animate-fade-up gap-4">
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, color: '#555555' }}>
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
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>IA leu automaticamente</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#555555', fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {kmAuto.toLocaleString('pt-BR')} km
                  </p>
                </div>
              </div>
            )}

            {/* Pre-filled indicator */}
            {correcting && !kmAuto && !photoUrl && lastKmFromDb > 0 && (
              <div style={{ padding: '10px 14px', background: 'var(--cd-navy-dim)', border: '1px solid rgba(33,39,113,0.2)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--cd-navy)" strokeWidth="1.5"/><path d="M12 8v4M12 16h.01" stroke="var(--cd-navy)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <p style={{ fontSize: 13, color: 'var(--cd-navy)' }}>KM do último registro. Confirme ou corrija se necessário.</p>
              </div>
            )}

            {(correcting || !kmAuto) && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#5e6673', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {kmAuto ? 'Corrigir KM' : 'KM atual'}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={kmInput}
                  onChange={e => { setKmInput(e.target.value); setKmWarning(''); setKmWarningAcknowledged(false) }}
                  placeholder={lastKm ? `Último: ${lastKm.toLocaleString('pt-BR')}` : 'Ex: 110846'}
                  autoFocus
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 10, background: '#ffffff', border: '1px solid #1a2040', color: '#555555', fontSize: 28, outline: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, colorScheme: 'dark' }}
                  onFocus={e => e.target.style.borderColor = '#f86924'}
                  onBlur={e => e.target.style.borderColor = '#dddddd'}
                />
              </div>
            )}

            {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

            {/* Aviso de tolerância */}
            {kmWarning && (
              <div style={{ padding: '12px 14px', background: 'var(--cd-warn-dim)', border: '1px solid var(--cd-warn)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: 13, color: '#b45309', fontWeight: 700, marginBottom: 4 }}>⚠️ Diferença pequena detectada</p>
                <p style={{ fontSize: 13, color: 'var(--cd-text)' }}>{kmWarning}</p>
                <p style={{ fontSize: 12, color: 'var(--cd-subtext)', marginTop: 6 }}>Toque em <strong>Confirmar assim mesmo</strong> se o KM estiver certo, ou corrija o valor acima.</p>
              </div>
            )}

            {/* Instrução de verificação */}
            <div style={{ padding: '10px 14px', background: 'rgba(33,39,113,0.05)', border: '1px solid rgba(33,39,113,0.12)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>👁️</span>
              <p style={{ fontSize: 12, color: 'var(--cd-navy)' }}>Confira o número no painel do veículo antes de confirmar.</p>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={confirm}
                style={{ width: '100%', padding: 14, borderRadius: 10, background: '#f86924', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
                {kmWarning ? 'CONFIRMAR ASSIM MESMO →' : 'CONFIRMAR E CONTINUAR →'}
              </button>

              {kmAuto && !correcting && (
                <button onClick={() => { setCorrecting(true); setKmInput(String(kmAuto)) }}
                  style={{ padding: 10, background: 'none', border: 'none', color: '#5e6673', fontSize: 13, cursor: 'pointer' }}>
                  Leitura incorreta? Corrigir
                </button>
              )}

              <button onClick={() => { setStep('camera'); setPhotoUrl(''); setPhotoBlob(null); setCorrecting(false); setKmAuto(null); setKmInput(''); startCamera() }}
                style={{ padding: 10, background: 'none', border: 'none', color: '#5e6673', fontSize: 13, cursor: 'pointer' }}>
                📷 {photoUrl ? 'Tirar foto novamente' : 'Fotografar hodômetro'}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConsuldataFooter />
      <BackButton href='/check/selecionar' label="Voltar para lista de veículos" />
    </main>
  )
}
