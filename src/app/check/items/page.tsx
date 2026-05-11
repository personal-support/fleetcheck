'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { savePendingChecklist } from '@/lib/db'
import type { Vehicle, ChecklistTemplate, ChecklistTemplateItem, ChecklistItemResult } from '@/types'

const CONSULDATA_COMPANY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export default function ChecklistItemsPage() {
  const router = useRouter()
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<ChecklistItemResult[]>([])
  const [showNok, setShowNok] = useState(false)
  const [nokData, setNokData] = useState<Record<string, string>>({})
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoBlobs = useRef<Record<string, Blob>>({})

  const vehicle: Vehicle | null = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('fc_vehicle') ?? 'null') : null
  const km = typeof window !== 'undefined' ? parseInt(sessionStorage.getItem('fc_km') ?? '0') : 0
  const kmAuto = typeof window !== 'undefined' ? parseInt(sessionStorage.getItem('fc_km_auto') ?? '0') : 0
  const kmWasManual = typeof window !== 'undefined' ? sessionStorage.getItem('fc_km_was_manual') === 'true' : false
  const dtAuto = typeof window !== 'undefined' ? sessionStorage.getItem('fc_dt_auto') ?? new Date().toISOString() : new Date().toISOString()
  const latAuto = typeof window !== 'undefined' ? parseFloat(sessionStorage.getItem('fc_lat_auto') ?? '0') || null : null
  const lngAuto = typeof window !== 'undefined' ? parseFloat(sessionStorage.getItem('fc_lng_auto') ?? '0') || null : null

  useEffect(() => { if (!vehicle) { router.replace('/check/scan'); return }; loadTemplate() }, [])

  async function loadTemplate() {
    const supabase = createClient()
    const { data } = await supabase.from('checklist_templates').select('*').eq('company_id', CONSULDATA_COMPANY_ID).eq('vehicle_type', vehicle?.vehicle_type ?? 'leve').eq('active', true).single()
    if (data) { setTemplate(data as ChecklistTemplate); setResults((data as ChecklistTemplate).items.map(item => ({ id: item.id, status: null }))) }
  }

  if (!template || !vehicle) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cd-bg)' }}>
      <div className="spin" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--cd-border)', borderTopColor: 'var(--cd-orange)' }} />
    </main>
  )

  const items: ChecklistTemplateItem[] = template.items.sort((a, b) => a.order - b.order)
  const currentItem = items[currentIndex]
  const isDone = currentIndex >= items.length
  const progress = Math.round((currentIndex / items.length) * 100)

  function handleOk() {
    const updated = [...results]; updated[currentIndex] = { id: currentItem.id, status: 'ok' }
    setResults(updated); setShowNok(false); setNokData({}); setPhotoBlob(null); setPhotoPreview('')
    setCurrentIndex(prev => prev + 1)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoBlob(file); setPhotoPreview(URL.createObjectURL(file))
    setNokData(prev => ({ ...prev, foto: `photo_${currentItem.id}` }))
  }

  function submitNok() {
    const photoKey = `photo_${currentItem.id}`; if (photoBlob) photoBlobs.current[photoKey] = photoBlob
    const updated = [...results]; updated[currentIndex] = { id: currentItem.id, status: 'nok', nok_data: nokData, photo_url: photoBlob ? photoKey : undefined }
    setResults(updated); setShowNok(false); setNokData({}); setPhotoBlob(null); setPhotoPreview('')
    setCurrentIndex(prev => prev + 1)
  }

  async function finishChecklist() {
    if (!vehicle) return; setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const dtFinal = new Date().toISOString()
    let latFinal = latAuto, lngFinal = lngAuto, locationWasManual = false
    try { const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })); latFinal = pos.coords.latitude; lngFinal = pos.coords.longitude } catch { locationWasManual = true }
    const checklistData = { company_id: CONSULDATA_COMPANY_ID, vehicle_id: vehicle.id, user_id: user.id, template_id: template?.id ?? null, status: 'open', departure_km_auto: kmAuto || null, departure_km_final: km || null, departure_km_was_manual: kmWasManual, departure_dt_auto: dtAuto, departure_dt_final: dtFinal, departure_dt_was_manual: false, departure_lat_auto: latAuto, departure_lng_auto: lngAuto, departure_lat_final: latFinal as number | null, departure_lng_final: lngFinal as number | null, departure_location_was_manual: locationWasManual, departure_items: results, departure_notes: null as string | null, created_at: new Date().toISOString() }
    if (navigator.onLine) {
      try {
        for (const [key, blob] of Object.entries(photoBlobs.current)) {
          const path = `${vehicle.id}/${Date.now()}_${key}.jpg`
          const { data: uploaded } = await supabase.storage.from('checklist-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
          if (uploaded) { const { data: urlData } = supabase.storage.from('checklist-photos').getPublicUrl(uploaded.path); checklistData.departure_items = checklistData.departure_items.map((item: ChecklistItemResult) => item.photo_url === key ? { ...item, photo_url: urlData.publicUrl } : item) }
        }
        const { data: inserted, error } = await supabase.from('checklists').insert({ ...checklistData, synced_at: new Date().toISOString() }).select('id').single()
        if (!error && inserted) {
          await supabase.from('vehicles').update({ last_km: km, last_check_at: new Date().toISOString(), last_location_lat: latFinal, last_location_lng: lngFinal }).eq('id', vehicle.id)
          sessionStorage.setItem('fc_checklist_id', inserted.id);
          ['fc_vehicle','fc_km','fc_km_auto','fc_km_was_manual','fc_dt_auto','fc_lat_auto','fc_lng_auto','fc_phase'].forEach(k => sessionStorage.removeItem(k))
          sessionStorage.setItem('fc_just_completed', '1'); router.push('/check/done?phase=departure'); return
        }
      } catch { }
    }
    await savePendingChecklist({ localId: `local_${Date.now()}`, checklist: checklistData as never, photoBlobs: photoBlobs.current, createdAt: Date.now() })
    sessionStorage.setItem('fc_just_completed', '1'); router.push('/check/done?phase=departure&offline=1')
  }

  const nokFields = currentItem?.if_nok?.fields ?? []
  const photoField = nokFields.find(f => f.type === 'photo')
  const isPhotoRequired = photoField?.required

  // SUMMARY SCREEN
  if (isDone) {
    const nokCount = results.filter(r => r.status === 'nok').length
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cd-bg)' }}>
        <div style={{ background: 'var(--cd-navy)', padding: '16px 20px' }}>
          <div className="step-bar"><div className="step-bar-fill" style={{ width: '95%' }} /></div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {vehicle.plate} · Resumo da saída
          </p>
        </div>
        <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--cd-navy)' }}>RESUMO DO CHECKLIST</h2>
          <div className="cd-card" style={{ overflow: 'hidden' }}>
            {results.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < results.length - 1 ? '1px solid var(--cd-border)' : 'none' }}>
                <span style={{ fontSize: 14, color: 'var(--cd-text)' }}>{items[i]?.icon} {items[i]?.label}</span>
                <span className={`badge ${r.status === 'ok' ? 'badge-green' : 'badge-red'}`}>
                  {r.status === 'ok' ? '✓ OK' : '⚠ Pendência'}
                </span>
              </div>
            ))}
          </div>
          {nokCount > 0 && (
            <div style={{ padding: '12px 16px', background: 'var(--cd-red-dim)', border: '1px solid var(--cd-red)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: 13, color: 'var(--cd-red)', fontWeight: 700 }}>⚠ {nokCount} pendência{nokCount > 1 ? 's' : ''} registrada{nokCount > 1 ? 's' : ''}. O responsável será notificado.</p>
            </div>
          )}
          <div style={{ padding: '12px 16px', background: 'rgba(248,105,36,0.06)', border: '1px solid rgba(248,105,36,0.2)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: 12, color: 'var(--cd-text)', lineHeight: 1.6 }}>🚗 Ao chegar ao destino, abra o FleetCheck e selecione este veículo para registrar a chegada.</p>
          </div>
          <button onClick={finishChecklist} disabled={saving} className="btn-primary" style={{ marginTop: 4 }}>
            {saving ? 'Registrando saída...' : 'CONFIRMAR SAÍDA →'}
          </button>
        </div>
      </main>
    )
  }

  // ITEM STEP
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cd-bg)' }}>
      {/* Progress header */}
      <div style={{ background: 'var(--cd-navy)', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {vehicle.plate} · SAÍDA · {currentIndex + 1}/{items.length}
          </p>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cd-orange)' }}>{progress}%</span>
        </div>
        <div className="step-bar"><div className="step-bar-fill" style={{ width: `${50 + progress * 0.45}%` }} /></div>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
          {items.map((_, i) => (
            <div key={i} style={{ width: i === currentIndex ? 20 : 6, height: 6, borderRadius: 3, transition: 'all 0.3s', background: i < currentIndex ? 'var(--cd-green)' : i === currentIndex ? 'var(--cd-orange)' : 'rgba(255,255,255,0.25)' }} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px 24px' }}>
        {!showNok ? (
          <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 8, lineHeight: 1 }}>{currentItem.icon}</div>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800, color: 'var(--cd-navy)', letterSpacing: '-0.5px' }}>
              {currentItem.label.toUpperCase()}
            </h2>
            <p style={{ fontSize: 15, color: 'var(--cd-subtext)', lineHeight: 1.5, maxWidth: 300 }}>{currentItem.description}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 380, marginTop: 24 }}>
              <button onClick={() => setShowNok(true)} style={{ padding: '22px 0', borderRadius: 'var(--radius-md)', background: 'var(--cd-red-dim)', border: '2px solid var(--cd-red)', color: 'var(--cd-red)', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 80, fontFamily: "'Open Sans', sans-serif" }}>
                ⚠ PROBLEMA
              </button>
              <button onClick={handleOk} style={{ padding: '22px 0', borderRadius: 'var(--radius-md)', background: 'var(--cd-green-dim)', border: '2px solid var(--cd-green)', color: 'var(--cd-green)', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 80, fontFamily: "'Open Sans', sans-serif" }}>
                ✓ OK
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in" style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <button onClick={() => setShowNok(false)} style={{ background: 'none', border: 'none', color: 'var(--cd-orange)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Voltar</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--cd-red-dim)', borderRadius: 'var(--radius-md)', border: '1px solid var(--cd-red)' }}>
                <span style={{ fontSize: 22 }}>{currentItem.icon}</span>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--cd-red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Problema registrado</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cd-text)' }}>{currentItem.label}</p>
                </div>
              </div>
            </div>
            {nokFields.filter(f => f.type !== 'photo').map(field => (
              <div key={field.id}>
                <label className="cd-label">{field.label}</label>
                {field.type === 'select' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {field.options?.map(opt => (
                      <button key={opt} onClick={() => setNokData(prev => ({ ...prev, [field.id]: opt }))}
                        style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: nokData[field.id] === opt ? 700 : 400, background: nokData[field.id] === opt ? 'var(--cd-navy)' : 'var(--cd-surface)', border: `1.5px solid ${nokData[field.id] === opt ? 'var(--cd-navy)' : 'var(--cd-border)'}`, color: nokData[field.id] === opt ? '#fff' : 'var(--cd-text)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'Open Sans', sans-serif" }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input className="cd-input" type="text" placeholder={field.placeholder} value={nokData[field.id] ?? ''} onChange={e => setNokData(prev => ({ ...prev, [field.id]: e.target.value }))} />
                )}
              </div>
            ))}
            {photoField && (
              <div>
                <label className="cd-label">Foto {isPhotoRequired ? '(obrigatória)' : '(opcional)'}</label>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoChange} />
                {!photoPreview ? (
                  <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: 20, borderRadius: 'var(--radius-md)', background: 'var(--cd-bg)', border: '2px dashed var(--cd-border)', color: 'var(--cd-subtext)', cursor: 'pointer', fontSize: 14, fontFamily: "'Open Sans', sans-serif" }}>
                    📸 Tirar foto
                  </button>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img src={photoPreview} style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                    <button onClick={() => { setPhotoBlob(null); setPhotoPreview('') }} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                )}
              </div>
            )}
            <button onClick={submitNok} disabled={!!(isPhotoRequired && !photoBlob)}
              className="btn-primary"
              style={{ background: isPhotoRequired && !photoBlob ? '#ccc' : 'var(--cd-red)', marginTop: 8 }}>
              REGISTRAR PENDÊNCIA →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
